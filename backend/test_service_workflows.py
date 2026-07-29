import pytest
from app.api.settings import ensure_tenant_admin_async
from app.models.config import Tenant
from sqlalchemy import select
from app.database import ConfigSessionLocal

async def _ensure_admin(seeded_admin_tenant):
    tenant_id = seeded_admin_tenant["tenant_id"]
    async with ConfigSessionLocal() as config_db:
        tenant_res = await config_db.execute(select(Tenant).filter(Tenant.id == tenant_id))
        selected_tenant_obj = tenant_res.scalar_one_or_none()
        if not selected_tenant_obj:
            pytest.fail(f"Seeded tenant with ID {tenant_id} not found in config DB.")
        tenant_db_url = selected_tenant_obj.db_url
    await ensure_tenant_admin_async(tenant_db_url=tenant_db_url, admin_user="admin_root", full_name="Admin Root", email="admin_root@test.com", department="IT")

@pytest.mark.anyio
async def test_service_payload_preserves_license_key_and_bulk_os_sync(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    device_res = await client.post("/api/v1/devices", json={
        "name": "SVC-OS-HOST",
        "system": "SVC-GRID",
        "status": "Active",
        "type": "Physical",
        "serial_number": "SVC-OS-SN",
        "asset_tag": "SVC-OS-AT",
        "owner": "OPS",
        "business_unit": "ENG"
    }, headers=headers)
    assert device_res.status_code == 200, device_res.text
    device_id = device_res.json()["id"]

    service_res = await client.post("/api/v1/logical-services", json={
        "name": "Ubuntu 24.04",
        "service_type": "OS",
        "status": "Active",
        "environment": "Production",
        "version": "24.04",
        "device_id": device_id,
        "license_key": "LIC-1234-ABCD"
    }, headers=headers)
    assert service_res.status_code == 200, service_res.text
    service_id = service_res.json()["id"]

    list_res = await client.get("/api/v1/logical-services", headers=headers)
    assert list_res.status_code == 200
    listed_service = next(s for s in list_res.json() if s["id"] == service_id)
    assert listed_service["license_key"] == "LIC-1234-ABCD"

    preview_res = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [service_id],
        "action": "update",
        "payload": {"version": "24.10"},
        "dry_run": True,
    }, headers=headers)
    assert preview_res.status_code == 200, preview_res.text
    preview = preview_res.json()
    assert preview["status"] == "preview"
    assert preview["changed_count"] == 1
    assert preview["unchanged_count"] == 0
    assert preview["can_execute"] is True

    devices_after_preview = await client.get("/api/v1/devices", headers=headers)
    assert devices_after_preview.status_code == 200
    device_after_preview = next(device for device in devices_after_preview.json() if device["id"] == device_id)
    assert device_after_preview["os_version"] == "24.04"

    update_res = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [service_id],
        "action": "update",
        "payload": {"version": "24.10"}
    }, headers=headers)
    assert update_res.status_code == 200, update_res.text
    assert update_res.json()["changed_count"] == 1

    devices_after_update = await client.get("/api/v1/devices", headers=headers)
    assert devices_after_update.status_code == 200
    device_after_update = next(device for device in devices_after_update.json() if device["id"] == device_id)
    assert device_after_update["os_name"] == "Ubuntu 24.04"
    assert device_after_update["os_version"] == "24.10"

    type_change_res = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [service_id],
        "action": "update",
        "payload": {"service_type": "Application"}
    }, headers=headers)
    assert type_change_res.status_code == 200, type_change_res.text
    assert type_change_res.json()["changed_count"] == 1

    devices_after_type_change = await client.get("/api/v1/devices", headers=headers)
    device_after_type_change = next(device for device in devices_after_type_change.json() if device["id"] == device_id)
    assert device_after_type_change["os_name"] is None
    assert device_after_type_change["os_version"] is None

    type_restore_res = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [service_id],
        "action": "update",
        "payload": {"service_type": "OS"}
    }, headers=headers)
    assert type_restore_res.status_code == 200, type_restore_res.text

    devices_after_type_restore = await client.get("/api/v1/devices", headers=headers)
    device_after_type_restore = next(device for device in devices_after_type_restore.json() if device["id"] == device_id)
    assert device_after_type_restore["os_name"] == "Ubuntu 24.04"
    assert device_after_type_restore["os_version"] == "24.10"

    await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [service_id],
        "action": "delete"
    }, headers=headers)

    devices_after_delete = await client.get("/api/v1/devices", headers=headers)
    assert devices_after_delete.status_code == 200
    device_after_delete = next(device for device in devices_after_delete.json() if device["id"] == device_id)
    assert device_after_delete["os_name"] is None
    assert device_after_delete["os_version"] is None


@pytest.mark.anyio
async def test_service_bulk_action_rejects_unsupported_operations(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    response = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [99999],
        "action": "purge"
    }, headers=headers)
    assert response.status_code == 400
    assert "Unsupported bulk action" in response.json()["detail"]


@pytest.mark.anyio
async def test_service_bulk_action_rejects_decimal_ids(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    response = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [1.5],
        "action": "update",
        "payload": {"status": "Existing"},
        "dry_run": True,
    }, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Bulk ids must contain positive integers"

    oversized_response = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": ["9223372036854775808"],
        "action": "update",
        "payload": {"status": "Existing"},
        "dry_run": True,
    }, headers=headers)
    assert oversized_response.status_code == 400
    assert oversized_response.json()["detail"] == "Bulk ids must contain positive integers"
