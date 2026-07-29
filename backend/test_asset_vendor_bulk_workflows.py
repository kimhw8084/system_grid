import pytest
from sqlalchemy import select

from app.api.settings import ensure_tenant_admin_async
from app.database import ConfigSessionLocal
from app.models.config import Tenant


async def _ensure_admin(seeded_admin_tenant):
    tenant_id = seeded_admin_tenant["tenant_id"]
    async with ConfigSessionLocal() as config_db:
        tenant = (await config_db.execute(select(Tenant).filter(Tenant.id == tenant_id))).scalar_one()
    await ensure_tenant_admin_async(
        tenant_db_url=tenant.db_url,
        admin_user="admin_root",
        full_name="Admin Root",
        email="admin_root@test.com",
        department="IT",
    )


async def _create_device(client, headers, name: str, environment: str = "Production"):
    response = await client.post(
        "/api/v1/devices",
        json={
            "name": name,
            "system": "BULK-WAVE-2",
            "status": "Active",
            "type": "Physical",
            "environment": environment,
            "serial_number": f"SN-{name}",
            "asset_tag": f"AT-{name}",
        },
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


async def _create_vendor(client, headers, name: str, country: str = "USA"):
    response = await client.post(
        "/api/v1/vendors",
        json={"name": name, "country": country},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.anyio
async def test_asset_bulk_preview_execution_and_reversible_lifecycle(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    first = await _create_device(client, headers, "W2-ASSET-A")
    second = await _create_device(client, headers, "W2-ASSET-B")
    ids = [first["id"], second["id"]]

    preview = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": ids, "action": "update", "payload": {"environment": "Development"}, "dry_run": True},
        headers=headers,
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["selected_count"] == 2
    assert preview.json()["changed_count"] == 2
    assert preview.json()["unchanged_count"] == 0
    assert preview.json()["can_execute"] is True

    before = await client.get("/api/v1/devices?include_deleted=true", headers=headers)
    before_rows = {row["id"]: row for row in before.json()}
    assert [before_rows[record_id]["environment"] for record_id in ids] == ["Production", "Production"]

    execute = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": ids, "action": "update", "payload": {"environment": "Development"}},
        headers=headers,
    )
    assert execute.status_code == 200, execute.text
    assert execute.json()["changed_count"] == 2

    after = await client.get("/api/v1/devices?include_deleted=true", headers=headers)
    after_rows = {row["id"]: row for row in after.json()}
    assert [after_rows[record_id]["environment"] for record_id in ids] == ["Development", "Development"]

    archive_preview = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": ids, "action": "delete", "dry_run": True},
        headers=headers,
    )
    assert archive_preview.status_code == 200
    assert archive_preview.json()["changed_count"] == 2

    archived = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": ids, "action": "delete"},
        headers=headers,
    )
    assert archived.status_code == 200
    assert archived.json()["changed_count"] == 2

    restored = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": ids, "action": "restore"},
        headers=headers,
    )
    assert restored.status_code == 200
    assert restored.json()["changed_count"] == 2

    active_purge = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": ids, "action": "purge", "dry_run": True},
        headers=headers,
    )
    assert active_purge.status_code == 200
    assert active_purge.json()["can_execute"] is True
    assert active_purge.json()["changed_count"] == 2

    decimal_id = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": [1.5], "action": "delete", "dry_run": True},
        headers=headers,
    )
    assert decimal_id.status_code == 400


@pytest.mark.anyio
async def test_vendor_bulk_preview_country_receipt_and_lifecycle(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    first = await _create_vendor(client, headers, "W2-VENDOR-A")
    second = await _create_vendor(client, headers, "W2-VENDOR-B")
    ids = [first["id"], second["id"]]

    preview = await client.post(
        "/api/v1/vendors/bulk-action",
        json={"ids": ids, "action": "update", "target": "vendor", "payload": {"country": "South Korea"}, "dry_run": True},
        headers=headers,
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["selected_count"] == 2
    assert preview.json()["changed_count"] == 2
    assert preview.json()["can_execute"] is True

    before = await client.get("/api/v1/vendors?include_deleted=true", headers=headers)
    before_rows = {row["id"]: row for row in before.json()}
    assert [before_rows[record_id]["country"] for record_id in ids] == ["USA", "USA"]

    execute = await client.post(
        "/api/v1/vendors/bulk-action",
        json={"ids": ids, "action": "update", "target": "vendor", "payload": {"country": "South Korea"}},
        headers=headers,
    )
    assert execute.status_code == 200, execute.text
    assert execute.json()["changed_count"] == 2

    after = await client.get("/api/v1/vendors?include_deleted=true", headers=headers)
    after_rows = {row["id"]: row for row in after.json()}
    assert [after_rows[record_id]["country"] for record_id in ids] == ["South Korea", "South Korea"]

    archived = await client.post(
        "/api/v1/vendors/bulk-action",
        json={"ids": ids, "action": "delete", "target": "vendor"},
        headers=headers,
    )
    assert archived.status_code == 200
    assert archived.json()["changed_count"] == 2

    restored = await client.post(
        "/api/v1/vendors/bulk-action",
        json={"ids": ids, "action": "restore", "target": "vendor"},
        headers=headers,
    )
    assert restored.status_code == 200
    assert restored.json()["changed_count"] == 2

    active_purge = await client.post(
        "/api/v1/vendors/bulk-action",
        json={"ids": ids, "action": "purge", "target": "vendor", "dry_run": True},
        headers=headers,
    )
    assert active_purge.status_code == 200
    assert active_purge.json()["can_execute"] is True
    assert active_purge.json()["changed_count"] == 2

    unsupported = await client.post(
        "/api/v1/vendors/bulk-action",
        json={"ids": ids, "action": "update", "target": "vendor", "payload": {"name": "NOPE"}, "dry_run": True},
        headers=headers,
    )
    assert unsupported.status_code == 400
