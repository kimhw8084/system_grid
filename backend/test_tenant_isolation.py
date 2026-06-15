import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_tenant_cross_contamination_sweep(seeded_admin_tenant, tmp_path_factory):
    client = seeded_admin_tenant["client"]
    tenant_id_a = seeded_admin_tenant["tenant_id"]
    tenant_name_a = seeded_admin_tenant["tenant_name"]

    # Create a second tenant for isolation testing
    import uuid
    tenant_creation_payload = {"name": f"Tenant Beta {uuid.uuid4()}"}
    create_tenant_res = await client.post("/api/v1/tenants/admin/create", json=tenant_creation_payload, headers={"X-User-Id": "admin_root"})
    assert create_tenant_res.status_code == 200, create_tenant_res.text
    tenant_id_b = create_tenant_res.json()["id"]

    headers_a = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id_a)}
    headers_b = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id_b)}

    # 1. Create sensitive infrastructure in Tenant A
    res = await client.post("/api/v1/devices", json={
        "name": "CORE-ROUTER-ALPHA",
        "type": "Network",
        "model": "Nexus 9000",
        "system": "CORE",
        "environment": "Production",
        "status": "Active"
    }, headers=headers_a)
    assert res.status_code == 200, res.text
    device_id = res.json()["id"]

    # 2. Attempt unauthorized PUT via Tenant B
    put_res = await client.put(f"/api/v1/devices/{device_id}", json={
        "name": "COMPROMISED-ROUTER"
    }, headers=headers_b)
    # The system should return 404 (not found in tenant scope) or 403 (unauthorized)
    assert put_res.status_code in [404, 403], f"Data Leakage: Tenant B modified Tenant A data! Status: {put_res.status_code}"

    # 3. Attempt unauthorized DELETE via Tenant B
    del_res = await client.delete(f"/api/v1/devices/{device_id}", headers=headers_b)
    assert del_res.status_code in [404, 403], f"Data Leakage: Tenant B deleted Tenant A data! Status: {del_res.status_code}"

