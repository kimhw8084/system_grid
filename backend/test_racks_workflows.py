import pytest
from app.api.settings import ensure_tenant_admin_async
from app.models.config import Tenant
from sqlalchemy import select
from app.database import ConfigSessionLocal

async def create_site(client, name: str, headers: dict):
    response = await client.post("/api/v1/sites", json={"name": name, "address": "QA"}, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()

async def create_rack(client, site_id: int, name: str, headers: dict):
    response = await client.post("/api/v1/racks", json={
        "site_id": site_id,
        "name": name,
        "aisle": "A",
        "row": "1",
        "total_u": 12,
        "max_power_kw": 10.0,
    }, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()

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
async def test_rack_bulk_relocate_reports_conflicts(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    source_site = await create_site(client, "RACK-SRC", headers)
    target_site = await create_site(client, "RACK-TGT", headers)

    rack_conflict = await create_rack(client, source_site["id"], "RACK-CONFLICT", headers)
    rack_unique = await create_rack(client, source_site["id"], "RACK-UNIQUE", headers)
    await create_rack(client, target_site["id"], "RACK-CONFLICT", headers)

    response = await client.post("/api/v1/racks/bulk-action", json={
        "action": "relocate",
        "ids": [rack_conflict["id"], rack_unique["id"]],
        "payload": {"new_site_id": target_site["id"]},
    }, headers=headers)
    assert response.status_code == 200, response.text

    data = response.json()
    assert sorted(data["relocated"]) == [rack_unique["id"]]
    assert data["conflicts"] == [rack_conflict["id"]]


@pytest.mark.anyio
async def test_rack_bulk_restore_reports_conflicts(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    source_site = await create_site(client, "RESTORE-SRC", headers)
    target_site = await create_site(client, "RESTORE-TGT", headers)

    rack_deleted = await create_rack(client, source_site["id"], "RESTORE-CONFLICT", headers)
    rack_ok = await create_rack(client, source_site["id"], "RESTORE-OK", headers)
    await create_rack(client, target_site["id"], "RESTORE-CONFLICT", headers)

    delete_response = await client.post("/api/v1/racks/bulk-action", json={
        "action": "delete",
        "ids": [rack_deleted["id"], rack_ok["id"]],
    }, headers=headers)
    assert delete_response.status_code == 200, delete_response.text

    restore_response = await client.post("/api/v1/racks/bulk-action", json={
        "action": "restore",
        "ids": [rack_deleted["id"], rack_ok["id"]],
        "payload": {"new_site_id": target_site["id"]},
    }, headers=headers)
    assert restore_response.status_code == 200, restore_response.text

    data = restore_response.json()
    assert sorted(data["restored"]) == [rack_ok["id"]]
    assert data["conflicts"] == [rack_deleted["id"]]
