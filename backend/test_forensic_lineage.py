import pytest
from httpx import AsyncClient
from app.api.settings import ensure_tenant_admin_async
from app.models.config import Tenant
from sqlalchemy import select
from app.database import ConfigSessionLocal

@pytest.mark.asyncio
async def test_forensic_lineage_assurance(seeded_admin_tenant):
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

    # 1. Create a critical monitoring record
    res = await client.post("/api/v1/monitoring", json={
        "device_name": "FW-EDGE-01",
        "category": "Security",
        "status": "Existing",
        "title": "Firewall Rule Violation",
        "platform": "Splunk",
        "severity": "Warning"
    }, headers=headers)
    assert res.status_code == 200, res.text
    item_id = res.json()["id"]

    # 2. Mutate the critical record
    update_res = await client.put(f"/api/v1/monitoring/{item_id}", json={
        "severity": "Warning",
        "title": "Firewall Rule Violation - Investigating"
    }, headers=headers)
    assert update_res.status_code == 200, update_res.text

    # 3. Query the immutable history lineage
    hist_res = await client.get(f"/api/v1/monitoring/{item_id}/history", headers=headers)
    assert hist_res.status_code == 200, hist_res.text
    history = hist_res.json()

    # 4. Assure the lineage captured the mutation forensically
    assert len(history) > 0, "Forensic Lineage Failure: No history snapshot generated!"
    
    latest_snapshot = history[0]
    # Check forensic metadata
    assert latest_snapshot.get("created_by_user_id") == "admin_root", f"Forensic Lineage Failure: Operator ID not captured! Got: {latest_snapshot.get('created_by_user_id')}"
    delta = latest_snapshot.get("delta", [])
    assert isinstance(delta, list), "Forensic Lineage Failure: Delta should be a list!"
    assert any(d.get("field") == "title" for d in delta), "Forensic Lineage Failure: Title change not captured in delta!"
