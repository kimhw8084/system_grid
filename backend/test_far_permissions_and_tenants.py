from __future__ import annotations

import uuid

import pytest
from starlette.requests import Request

from app.services import far_service


def _request(role: str = "VIEWER", tenant_id: int | None = 1, user_id: str = "user") -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"x-user-id", user_id.encode())],
    }
    request = Request(scope)
    request.state.sysgrid_access_role = role
    request.state.tenant_id = tenant_id
    return request


def test_far_role_and_tenant_guards_fail_closed():
    with pytest.raises(Exception) as forbidden:
        far_service.require_role(_request("VIEWER"), {"ADMIN"})
    assert forbidden.value.status_code == 403
    assert far_service.require_role(_request("ADMIN"), {"ADMIN"}) == "ADMIN"
    with pytest.raises(Exception) as unresolved:
        far_service.tenant_identity(_request("ADMIN", tenant_id=None))
    assert unresolved.value.status_code == 500


@pytest.mark.anyio
async def test_far_rejects_missing_cross_tenant_and_ungranted_actor_access(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    valid_headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    create = await client.post(
        "/api/v1/far/modes",
        headers=valid_headers,
        json={
            "system_name": "TENANT-A",
            "title": "Tenant scoped mode",
            "severity": 2,
            "occurrence": 2,
            "detection": 2,
            "idempotency_key": f"tenant-{uuid.uuid4()}",
        },
    )
    assert create.status_code == 201, create.text

    missing_tenant = await client.get(
        "/api/v1/far/modes",
        headers={"X-User-Id": "admin_root", "X-Tenant-Id": "999999"},
    )
    assert missing_tenant.status_code in {403, 404}

    ungranted_actor = await client.get(
        "/api/v1/far/modes",
        headers={"X-User-Id": "ungranted-user", "X-Tenant-Id": str(tenant_id)},
    )
    assert ungranted_actor.status_code == 403
