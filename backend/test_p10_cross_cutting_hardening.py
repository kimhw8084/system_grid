from uuid import uuid4

import pytest
from sqlalchemy import select

from app.observability import SlidingWindowRateLimiter, safe_request_metric
from app.pv1 import communication, domain, models
from app.models.config import Tenant, UserTenantAccess
from app.database import get_tenant_engine
from app.core.config import settings
from app.main import app
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


def _headers(tenant_id: int, user_id: str, command_id: str | None = None) -> dict[str, str]:
    headers = {"X-User-Id": user_id, "X-Tenant-Id": str(tenant_id)}
    if command_id:
        headers["Idempotency-Key"] = command_id
    return headers


def test_backend_qualification_fixture_is_disposable_and_preserves_user_databases():
    # The autouse conftest guard performs the before/after digest comparison;
    # this assertion proves the imported application settings are also outside
    # the configured Local Demo namespace before a test can issue a write.
    assert "sysgrid-pytest-" in settings.TENANT_STORAGE_ROOT
    assert "sysgrid-pytest-" in settings.CONFIG_DATABASE_URL
    assert "sysgrid-pytest-" in settings.DATABASE_URL


@pytest.mark.asyncio
async def test_viewer_cannot_capture_report_or_write_resource(client, seeded_admin_tenant, setup_db):
    tenant_id = seeded_admin_tenant["tenant_id"]
    command_id = str(uuid4())
    created = await client.post(
        "/api/v2/projects",
        headers=_headers(tenant_id, "admin_root", command_id),
        json={"name": "Authorization boundary project", "objective": "Viewer must remain read-only"},
    )
    assert created.status_code == 200, created.text
    project = created.json()["project"]
    project_id = project["id"]

    async with setup_db[1]() as config_session:
        config_session.add(UserTenantAccess(user_id="viewer", tenant_id=tenant_id, role="VIEWER", is_selected=False))
        await config_session.commit()

    async with setup_db[1]() as config_session:
        tenant = await config_session.get(Tenant, tenant_id)
        tenant_url = tenant.db_url
    tenant_sessions = async_sessionmaker(bind=get_tenant_engine(tenant_url), class_=AsyncSession, expire_on_commit=False)
    async with tenant_sessions() as tenant_session:
        tenant_session.add(models.PV1ProjectMember(
            id=str(uuid4()), tenant_id=tenant_id, project_id=project_id,
            user_id="viewer", role="Stakeholder", capabilities={}, revision=1,
            created_by="admin_root", updated_by="admin_root",
        ))
        await tenant_session.commit()

    report = await client.post(
        f"/api/v2/projects/{project_id}/reports/capture",
        headers=_headers(tenant_id, "viewer", str(uuid4())),
        json={"report_type": "Stakeholder summary", "period_start": "2026-01-01", "period_end": "2026-12-31"},
    )
    assert report.status_code == 403, report.text
    resource_command = str(uuid4())
    resource = await client.post(
        f"/api/v2/projects/{project_id}/commands",
        headers=_headers(tenant_id, "viewer", resource_command),
        json={
            "command_id": resource_command,
            "type": "resource.save",
            "expected": {"project_revision": project["revision"]},
            "payload": {"title": "blocked", "resource_kind": "Runbook", "content": "must not persist"},
        },
    )
    assert resource.status_code == 403, resource.text


def test_rate_limiter_is_bounded_and_retryable():
    limiter = SlidingWindowRateLimiter(limit=1, window_seconds=10, max_keys=100)
    first = limiter.check("tenant:user:POST:/api/v2/projects", now=100.0)
    second = limiter.check("tenant:user:POST:/api/v2/projects", now=100.5)
    third = limiter.check("tenant:user:POST:/api/v2/projects", now=110.1)
    assert first.allowed is True
    assert first.remaining == 0
    assert second.allowed is False
    assert second.retry_after_seconds >= 1
    assert third.allowed is True


@pytest.mark.asyncio
async def test_mutation_middleware_returns_retry_after_without_exposing_payload(client):
    original_limiter = app.state.rate_limiter
    app.state.rate_limiter = SlidingWindowRateLimiter(limit=1, window_seconds=60, max_keys=100)
    headers = _headers(1, "rate-limit-proof", str(uuid4()))
    try:
        first = await client.post("/api/v2/projects", headers=headers, json={"name": "first"})
        assert first.status_code != 429
        second = await client.post("/api/v2/projects", headers={**headers, "Idempotency-Key": str(uuid4())}, json={"name": "second"})
        assert second.status_code == 429
        assert int(second.headers["Retry-After"]) >= 1
        assert "second" not in second.text
        assert "payload" not in second.text
    finally:
        app.state.rate_limiter = original_limiter


def test_security_validators_reject_external_svg_and_filesystem_references():
    with pytest.raises(domain.PV1DomainError) as svg_error:
        communication.validate_upload({
            "filename": "diagram.svg",
            "mime_type": "image/svg+xml",
            "content_base64": "PHN2ZyBocmVmPSJodHRwczovL2V2aWwuZXhhbXBsZS8iPjwvc3ZnPg==",
        })
    assert svg_error.value.code == "UNSAFE_FILE"

    with pytest.raises(domain.PV1DomainError) as path_error:
        communication.validate_storage_ref("../outside-tenant/file.pdf")
    assert path_error.value.code == "UNSAFE_FILE"


def test_request_metrics_exclude_payload_and_query_values():
    metric = safe_request_metric(
        request_id="req-1", method="POST", path="/api/v2/projects/project-1/commands",
        status_code=403, duration_ms=4.234,
    )
    assert metric == {
        "request_id": "req-1",
        "method": "POST",
        "path": "/api/v2/projects/project-1/commands",
        "status_code": 403,
        "duration_ms": 4.23,
        "workspace": "other",
        "command_id_present": False,
        "outcome": "failure",
    }
    assert "payload" not in metric
    assert "query" not in metric


@pytest.mark.asyncio
async def test_event_activity_and_outbox_share_transaction_boundary(seeded_admin_tenant, setup_db):
    tenant_id = seeded_admin_tenant["tenant_id"]
    async with setup_db[1]() as config_session:
        tenant = await config_session.get(Tenant, tenant_id)
        tenant_url = tenant.db_url
    tenant_sessions = async_sessionmaker(bind=get_tenant_engine(tenant_url), class_=AsyncSession, expire_on_commit=False)
    event_id = str(uuid4())
    async with tenant_sessions() as tenant_session:
        await domain.append_event(
            tenant_session, tenant_id=tenant_id, project_id="missing-project",
            actor_id="admin_root", command_id=str(uuid4()), event_type="test.transaction",
            aggregate_type="test", aggregate_id=event_id, aggregate_revision=1,
            delta={"content": "must not leak"},
        )
        await tenant_session.rollback()
        assert await tenant_session.scalar(select(models.PV1Event).where(models.PV1Event.event_id == event_id)) is None
        assert await tenant_session.scalar(select(models.PV1OutboxEvent).where(models.PV1OutboxEvent.event_id == event_id)) is None
        assert await tenant_session.scalar(select(models.PV1ActivityProjection).where(models.PV1ActivityProjection.source_event_id == event_id)) is None
