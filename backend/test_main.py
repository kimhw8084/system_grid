import pytest

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
async def test_provision_asset_full_flow(client):
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
    response = await client.post("/api/v1/devices", json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["system"] == "GRID-ASYNC"

@pytest.mark.anyio
async def test_create_site_and_audit(client):
    await client.post("/api/v1/sites", json={"name": "ASYNC-SITE", "address": "Cloud"})
    logs_res = await client.get("/api/v1/audit")
    logs = logs_res.json()
    assert any(l["target_table"] == "sites" for l in logs)

@pytest.mark.anyio
async def test_settings_initialization_idempotency(client):
    response1 = await client.get("/api/v1/settings/initialize")
    assert response1.status_code == 200

    response2 = await client.get("/api/v1/settings/initialize")
    assert response2.status_code == 200
    assert response2.json()["status"] == "initialized"

    options_res = await client.get("/api/v1/settings/options")
    options = options_res.json()
    assert len(options) > 0
    assert any(o["category"] == "LogicalSystem" for o in options)

@pytest.mark.anyio
async def test_global_settings_flow(client):
    await client.get("/api/v1/settings/initialize")

    get_res = await client.get("/api/v1/settings/global")
    assert get_res.status_code == 200
    settings = get_res.json()
    assert settings["app_name"] == "SYSGRID ENGINE"

    payload = {"app_name": "NEW GRID", "org_name": "ACME CORP"}
    post_res = await client.post("/api/v1/settings/global", json=payload)
    assert post_res.status_code == 200

    get_res_2 = await client.get("/api/v1/settings/global")
    settings_2 = get_res_2.json()
    assert settings_2["app_name"] == "NEW GRID"
    assert settings_2["org_name"] == "ACME CORP"
    assert settings_2["site_id"] == "HQ-01"

@pytest.mark.anyio
async def test_monitoring_matrix_flow(client):
    dev_res = await client.post("/api/v1/devices", json={
        "name": "MON-SRV", "serial_number": "MON-SN", "asset_tag": "MON-AT",
        "system": "GRID-TEST", "status": "Active", "type": "Physical",
        "owner": "IT", "business_unit": "ENG"
    })
    assert dev_res.status_code == 200, dev_res.text
    dev_id = dev_res.json()["id"]

    # Create a team to satisfy monitoring ownership requirement
    await client.post("/api/v1/settings/teams", json={"name": "Infrastructure"})

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
    post_res = await client.post("/api/v1/monitoring", json=payload)
    assert post_res.status_code == 200
    item_id = post_res.json()["id"]

    get_res = await client.get("/api/v1/monitoring")
    items = get_res.json()
    assert any(i["id"] == item_id and i["device_name"] == "MON-SRV" for i in items)

    await client.put(f"/api/v1/monitoring/{item_id}", json={"status": "Existing"})

    get_res_2 = await client.get("/api/v1/monitoring")
    assert any(i["id"] == item_id and i["status"] == "Existing" for i in get_res_2.json())
