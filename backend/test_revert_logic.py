import pytest
from app.models import models
from sqlalchemy import select
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
async def test_user_pool_revert_creates_new_version(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    # 1. Initialize state - Add an operator that matches dummy sync ID 101
    await client.post("/api/v1/settings/operators", json={
        "external_id": "101",
        "username": "admin_alpha",
        "full_name": "Alpha Admin",
        "email": "alpha@example.com",
        "department": "Engineering"
    }, headers=headers)
    
    # 2. Create Version 1
    await client.post("/api/v1/settings/user-pool/refresh", json={"preview": False, "script": "v1"}, headers=headers)
    
    versions_res = await client.get("/api/v1/settings/user-pool/versions", headers=headers)
    versions = versions_res.json()
    assert len(versions) > 0, "No versions created!"
    v1 = versions[0]
    v1_label = v1["version_label"]
    v1_id = v1["id"]
    
    # 3. Change state - Update 101
    await client.patch("/api/v1/settings/operators/101", json={"full_name": "Alpha Admin Updated"}, headers=headers)
    
    # 4. Create Version 2
    await client.post("/api/v1/settings/user-pool/refresh", json={"preview": False, "script": "v2"}, headers=headers)
    
    # 5. Restore Version 1
    restore_res = await client.post(f"/api/v1/settings/user-pool/restore/{v1_id}", headers=headers)
    assert restore_res.status_code == 200
    
    # 6. Verify state is back to V1
    operators_res = await client.get("/api/v1/settings/operators", headers=headers)
    operators = operators_res.json()
    
    op_v1 = next((o for o in operators if o["external_id"] == "101"), None)
    assert op_v1 is not None
    
    # Let's verify the "Cloned from" label which was the main point.
    versions_res = await client.get("/api/v1/settings/user-pool/versions", headers=headers)
    versions = versions_res.json()
    
    latest_version = versions[0]
    assert "Cloned from" in latest_version["version_label"]
    assert v1_label in latest_version["version_label"]
    assert latest_version["is_active"] is True
    
    # Verify previous ones are inactive
    assert not any(v["is_active"] for v in versions[1:])
