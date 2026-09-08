from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException
from starlette.requests import Request
from sqlalchemy import select

from app import database
from app.api.utils import get_current_user_id
from app.core.config import settings
from app.models.config import UserTenantAccess
from app.observability import safe_request_metric


def _request(method: str, headers: dict[str, str]) -> Request:
    return Request({
        "type": "http",
        "method": method,
        "path": "/api/v1/projects",
        "headers": [(key.lower().encode(), value.encode()) for key, value in headers.items()],
        "query_string": b"",
        "scheme": "http",
        "server": ("test", 80),
        "client": ("test", 1),
    })


def _snapshot(path: Path) -> tuple[str, int, int, int]:
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        data_version = int(connection.execute("PRAGMA data_version").fetchone()[0])
    stat = path.stat()
    return hashlib.sha256(path.read_bytes()).hexdigest(), stat.st_size, stat.st_mtime_ns, data_version


def test_trusted_proxy_identity_ignores_forged_browser_identity(monkeypatch):
    monkeypatch.setattr(settings, "IDENTITY_MODE", "trusted_proxy")
    request = _request("GET", {"X-User-Id": "forged-admin", "X-Authenticated-User": "trusted-user"})
    assert get_current_user_id(request) == "trusted-user"
    with pytest.raises(HTTPException) as missing:
        get_current_user_id(_request("GET", {"X-User-Id": "forged-admin"}))
    assert missing.value.status_code == 401


def test_observability_metric_contract_is_semantic_and_payload_free():
    metric = safe_request_metric(
        request_id="request-1",
        method="POST",
        path="/api/v2/projects/project-1/commands",
        status_code=409,
        duration_ms=12.345,
        workspace="projects",
        command_id_present=True,
        outcome="conflict",
        projection_lag_ms=42.0,
        schedule_calculation_version="schedule-v1",
        schedule_calculation_duration_ms=7.5,
        upload_scan_state="not_applicable",
        job_delivery_status="not_applicable",
    )
    assert metric["workspace"] == "projects"
    assert metric["outcome"] == "conflict"
    assert metric["projection_lag_ms"] == 42.0
    assert metric["schedule_calculation_version"] == "schedule-v1"
    assert "project-1" not in metric
    assert "user_id" not in metric
    assert "tenant_id" not in metric


@pytest.mark.asyncio
async def test_get_tenant_resolution_does_not_mutate_config_database(setup_db, seeded_admin_tenant):
    config_path = Path(setup_db[0].url.database)
    async with setup_db[1]() as config_session:
        config_session.add(UserTenantAccess(
            user_id=f"read-only-{uuid4()}",
            tenant_id=seeded_admin_tenant["tenant_id"],
            role="VIEWER",
            is_selected=False,
        ))
        await config_session.commit()
        access = (await config_session.scalars(select(UserTenantAccess).where(UserTenantAccess.user_id.like("read-only-%")))).all()[-1]
        user_id = access.user_id

    before = _snapshot(config_path)
    generator = database.get_db(_request("GET", {"X-User-Id": user_id}))
    session = await anext(generator)
    await generator.aclose()
    after = _snapshot(config_path)
    assert before == after

    async with setup_db[1]() as config_session:
        refreshed = await config_session.scalar(select(UserTenantAccess).where(UserTenantAccess.user_id == user_id))
        assert refreshed is not None
        assert refreshed.is_selected is False
