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
async def test_investigation_log_updates_parent_timestamp_and_rejects_blank_entries(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    create_res = await client.post("/api/v1/investigations", json={
        "title": "RESEARCH-TIMESTAMP-CHECK",
        "status": "ANALYZING",
        "priority": "HIGH",
        "systems": ["GRID-TEST"],
        "initiation_at": "2037-01-01T01:00:00"
    }, headers=headers)
    assert create_res.status_code == 200, create_res.text
    investigation = create_res.json()

    blank_log_res = await client.post(f"/api/v1/investigations/{investigation['id']}/logs", json={
        "entry_text": "   ",
        "entry_type": "DIAGNOSIS",
        "poc": "OPS"
    }, headers=headers)
    assert blank_log_res.status_code == 400
    assert "Intelligence pulse text is required" in blank_log_res.json()["detail"]

    pre_fetch = await client.get("/api/v1/investigations", headers=headers)
    before = next(item for item in pre_fetch.json() if item["id"] == investigation["id"])

    log_res = await client.post(f"/api/v1/investigations/{investigation['id']}/logs", json={
        "entry_text": "Confirmed packet loss source",
        "entry_type": "DIAGNOSIS",
        "poc": "OPS"
    }, headers=headers)
    assert log_res.status_code == 200, log_res.text

    post_fetch = await client.get("/api/v1/investigations", headers=headers)
    after = next(item for item in post_fetch.json() if item["id"] == investigation["id"])
    assert after["updated_at"] != before["updated_at"]
    assert len(after["progress_logs"]) == 1
