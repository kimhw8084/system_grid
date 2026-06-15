import pytest
from sqlalchemy import select

@pytest.mark.anyio
async def test_read_main(client):
    response = await client.get("/")
    assert response.status_code == 200

@pytest.mark.anyio
async def test_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "online"}

@pytest.mark.anyio
async def test_provision_asset_full_flow(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}

    payload = {
        "name": "SRV-ASYNC-01",
        "system": "GRID-ASYNC",
        "status": "Active",
        "model": "R740",
        "type": "Physical",
        "serial_number": "SN-ASYNC-01",
        "asset_tag": "AT-ASYNC-01",
        "owner": "IT-OPS",
        "business_unit": "METROLOGY"
    }
    response = await client.post("/api/v1/devices", json=payload, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["system"] == "GRID-ASYNC"

@pytest.mark.anyio
async def test_create_site_and_audit(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}

    site_res = await client.post("/api/v1/sites", json={"name": "ASYNC-SITE", "address": "Cloud"}, headers=headers)
    assert site_res.status_code == 200, site_res.text # Ensure site creation is successful
    
    logs_res = await client.get("/api/v1/audit", headers=headers)
    print(f"Audit Logs Status Code: {logs_res.status_code}")
    print(f"Audit Logs Response Text: {logs_res.text}")
    assert logs_res.status_code == 200, logs_res.text
    logs = logs_res.json()
    assert any(l["target_table"] == "sites" for l in logs)

@pytest.mark.anyio
async def test_global_settings_flow(setup_db, seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}

    # Setup: Create an Admin Operator for the test user
    # Note: Default test user_id depends on get_current_user_id, typically "admin_root" or similar
    from app.core.config import settings
    admin_id = settings.DEFAULT_USER_ID
    
    # We need a db session to seed the admin
    from app.models import models
    from app.models.config import GlobalSetting, Tenant
    async with setup_db[1]() as db: # Use the ConfigSessionLocal from setup_db tuple
        # Seed a default setting for the test
        db.add(GlobalSetting(key="app_name", value="SYSGRID ENGINE", is_public=True))
        await db.commit()

    from app.api.settings import ensure_tenant_admin_async
    # Get the tenant_db_url directly from the config DB for the seeded tenant
    async with setup_db[1]() as config_db:
        tenant_res = await config_db.execute(select(Tenant).filter(Tenant.id == tenant_id))
        selected_tenant_obj = tenant_res.scalar_one_or_none()
        if not selected_tenant_obj:
            pytest.fail(f"Seeded tenant with ID {tenant_id} not found in config DB.")
        tenant_db_url = selected_tenant_obj.db_url

    await ensure_tenant_admin_async(tenant_db_url=tenant_db_url, admin_user="admin_root", full_name="Admin Root", email="admin_root@test.com", department="IT")

    get_res = await client.get("/api/v1/settings/global", headers=headers)
    assert get_res.status_code == 200, get_res.text
    settings_data = get_res.json()
    assert settings_data["app_name"] == "SYSGRID ENGINE"

    payload = {"app_name": "NEW GRID", "VITE_ORG_NAME": "ACME CORP"}
    post_res = await client.post("/api/v1/settings/global", json=payload, headers=headers)
    assert post_res.status_code == 200, post_res.text

    get_res_2 = await client.get("/api/v1/settings/global", headers=headers)
    settings_2 = get_res_2.json()
    assert settings_2["app_name"] == "NEW GRID"
    assert settings_2["VITE_ORG_NAME"] == "ACME CORP"

@pytest.mark.anyio
async def test_monitoring_matrix_flow(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}

    dev_res = await client.post("/api/v1/devices", json={
        "name": "MON-SRV", "serial_number": "MON-SN", "asset_tag": "MON-AT",
        "system": "GRID-TEST", "status": "Active", "type": "Physical",
        "owner": "IT", "business_unit": "ENG"
    }, headers=headers)
    assert dev_res.status_code == 200, dev_res.text
    dev_id = dev_res.json()["id"]

    # Create a team to satisfy monitoring ownership requirement
    await client.post("/api/v1/settings/teams", json={"name": "Infrastructure"}, headers=headers)

    payload = {
        "device_id": dev_id,
        "category": "Hardware",
        "status": "Planned",
        "title": "CPU Thermal Monitoring",
        "platform": "Zabbix",
        "purpose": "Prevent overheating",
        "notification_method": "Slack",
        "owner_team": "Infrastructure"
    }
    post_res = await client.post("/api/v1/monitoring", json=payload, headers=headers)
    assert post_res.status_code == 200
    item_id = post_res.json()["id"]

    get_res = await client.get("/api/v1/monitoring", headers=headers)
    items = get_res.json()
    assert any(i["id"] == item_id and i["device_name"] == "MON-SRV" for i in items)

    await client.put(f"/api/v1/monitoring/{item_id}", json={"status": "Existing"}, headers=headers)

    get_res_2 = await client.get("/api/v1/monitoring", headers=headers)
    assert any(i["id"] == item_id and i["status"] == "Existing" for i in get_res_2.json())
