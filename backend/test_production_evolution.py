import pytest
from app.api.settings import ensure_tenant_admin_async
from app.models.config import Tenant
from sqlalchemy import select
from app.database import ConfigSessionLocal

@pytest.mark.anyio
async def test_device_service_evolution_flow(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}

    # Ensure admin operator exists in the tenant database
    async with ConfigSessionLocal() as config_db:
        tenant_res = await config_db.execute(select(Tenant).filter(Tenant.id == tenant_id))
        selected_tenant_obj = tenant_res.scalar_one_or_none()
        if not selected_tenant_obj:
            pytest.fail(f"Seeded tenant with ID {tenant_id} not found in config DB.")
        tenant_db_url = selected_tenant_obj.db_url
    await ensure_tenant_admin_async(tenant_db_url=tenant_db_url, admin_user="admin_root", full_name="Admin Root", email="admin_root@test.com", department="IT")

    device_res = await client.post("/api/v1/devices", json={
        "name": "EVOLVE-SRV-01",
        "system": "EVOLVE-GRID",
        "status": "Active",
        "environment": "Production",
        "type": "Physical",
        "serial_number": "EVOLVE-SN-01",
        "asset_tag": "EVOLVE-AT-01"
    }, headers=headers)
    assert device_res.status_code == 200, device_res.text
    device = device_res.json()

    os_service_res = await client.post("/api/v1/logical-services", json={
        "name": "Ubuntu",
        "service_type": "OS",
        "status": "Active",
        "version": "24.04",
        "environment": "Production",
        "device_id": device["id"]
    }, headers=headers)
    assert os_service_res.status_code == 200, os_service_res.text
    os_service = os_service_res.json()

    db_service_res = await client.post("/api/v1/logical-services", json={
        "name": "EVOLVE-DB-01",
        "service_type": "Database",
        "status": "Active",
        "version": "16",
        "environment": "Production",
        "device_id": device["id"],
        "config_json": {"engine": "PostgreSQL", "port": 5432}
    }, headers=headers)
    assert db_service_res.status_code == 200, db_service_res.text
    db_service = db_service_res.json()

    update_device = await client.put(f"/api/v1/devices/{device['id']}", json={
        "status": "Maintenance",
        "environment": "Staging"
    }, headers=headers)
    assert update_device.status_code == 200, update_device.text

    services_res = await client.get(f"/api/v1/logical-services?device_id={device['id']}", headers=headers)
    assert services_res.status_code == 200
    services = services_res.json()

    evolved_os = next(service for service in services if service["id"] == os_service["id"])
    assert evolved_os["environment"] == "Staging"

    update_service = await client.put(f"/api/v1/logical-services/{db_service['id']}", json={
        "config_json": {"engine": "PostgreSQL", "port": 5433, "cluster": "HA-MODE"}
    }, headers=headers)
    assert update_service.status_code == 200, update_service.text
    assert update_service.json()["config_json"]["port"] == 5433

    delete_service = await client.delete(f"/api/v1/logical-services/{db_service['id']}", headers=headers)
    assert delete_service.status_code == 200, delete_service.text

    active_services = await client.get("/api/v1/logical-services", headers=headers)
    assert all(service["id"] != db_service["id"] for service in active_services.json())

    restore_service = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [db_service["id"]],
        "action": "restore"
    }, headers=headers)
    assert restore_service.status_code == 200, restore_service.text

    restored_services = await client.get("/api/v1/logical-services", headers=headers)
    assert any(service["id"] == db_service["id"] for service in restored_services.json())
