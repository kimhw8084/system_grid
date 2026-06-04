import pytest


@pytest.mark.anyio
async def test_monitoring_bulk_actions_create_history_entries(client):
    await client.get("/api/v1/settings/initialize")
    device_res = await client.post("/api/v1/devices", json={
        "name": "MON-HIST-01",
        "system": "MON-HIST",
        "status": "Active",
        "type": "Physical",
        "serial_number": "MON-HIST-SN",
        "asset_tag": "MON-HIST-AT",
    })
    assert device_res.status_code == 200, device_res.text
    device = device_res.json()

    knowledge_res = await client.post("/api/v1/knowledge", json={
        "title": "History Recovery",
        "category": "Runbook",
        "content": "Recovery steps",
        "status": "Draft",
    })
    assert knowledge_res.status_code == 200, knowledge_res.text
    knowledge = knowledge_res.json()

    create_res = await client.post("/api/v1/monitoring", json={
        "device_id": device["id"],
        "category": "Hardware",
        "status": "Existing",
        "title": "MON-HISTORY",
        "platform": "Zabbix",
        "purpose": "History validation",
        "notification_method": "Slack",
        "recovery_docs": [knowledge["id"]],
    })
    assert create_res.status_code == 200, create_res.text
    monitor = create_res.json()

    update_res = await client.post("/api/v1/monitoring/bulk-action", json={
        "ids": [monitor["id"]],
        "action": "update",
        "payload": {"severity": "Critical", "recovery_docs": [knowledge["id"]]},
    })
    assert update_res.status_code == 200, update_res.text

    delete_res = await client.post("/api/v1/monitoring/bulk-action", json={
        "ids": [monitor["id"]],
        "action": "delete",
    })
    assert delete_res.status_code == 200, delete_res.text

    restore_res = await client.post("/api/v1/monitoring/bulk-action", json={
        "ids": [monitor["id"]],
        "action": "restore",
    })
    assert restore_res.status_code == 200, restore_res.text

    history_res = await client.get(f"/api/v1/monitoring/{monitor['id']}/history")
    assert history_res.status_code == 200, history_res.text
    history = history_res.json()

    assert [entry["version"] for entry in history[:4]] == [4, 3, 2, 1]
    assert history[0]["change_summary"] == "Bulk restore"
    assert history[0]["snapshot"]["status"] == "Existing"
    assert history[1]["change_summary"] == "Bulk delete"
    assert history[1]["snapshot"]["status"] == "Deleted"
    assert history[2]["change_summary"] == "Bulk update: recovery_docs, severity"
    assert history[2]["snapshot"]["severity"] == "Critical"


@pytest.mark.anyio
async def test_monitoring_enforces_guardrails_and_security_rules(client):
    await client.get("/api/v1/settings/initialize")
    device_res = await client.post("/api/v1/devices", json={
        "name": "MON-VAL-01",
        "system": "MON-VAL",
        "status": "Active",
        "type": "Physical",
        "serial_number": "MON-VAL-SN",
        "asset_tag": "MON-VAL-AT",
    })
    device = device_res.json()

    bad_frequency = await client.post("/api/v1/monitoring", json={
        "device_id": device["id"],
        "category": "Infrastructure",
        "status": "Existing",
        "title": "BAD-FREQ",
        "platform": "Zabbix",
        "check_interval": 5,
    })
    assert bad_frequency.status_code == 400
    assert "check_interval" in bad_frequency.json()["detail"]

    bad_url = await client.post("/api/v1/monitoring", json={
        "device_id": device["id"],
        "category": "Infrastructure",
        "status": "Existing",
        "title": "BAD-URL",
        "platform": "Zabbix",
        "monitoring_url": "javascript:alert(1)",
    })
    assert bad_url.status_code == 400
    assert "http or https" in bad_url.json()["detail"]

    missing_bkm = await client.post("/api/v1/monitoring", json={
        "device_id": device["id"],
        "category": "Infrastructure",
        "status": "Existing",
        "title": "NO-BKM",
        "platform": "Zabbix",
        "severity": "Critical",
    })
    assert missing_bkm.status_code == 400
    assert "recovery document" in missing_bkm.json()["detail"]


@pytest.mark.anyio
async def test_monitoring_links_platform_team_and_operator_owners(client):
    await client.get("/api/v1/settings/initialize")

    operator_res = await client.post("/api/v1/settings/operators", json={
        "external_id": "op-1001",
        "username": "monitor.alpha",
        "full_name": "Monitor Alpha",
        "email": "alpha@example.com",
        "department": "Operations",
        "team": "Operations",
        "registration_status": "Verified",
    })
    assert operator_res.status_code == 200, operator_res.text
    operator = operator_res.json()

    options_res = await client.get("/api/v1/settings/options")
    assert options_res.status_code == 200, options_res.text
    team_option = next(option for option in options_res.json() if option["category"] == "MonitoringTeam" and option["value"] == "Operations")
    update_team_res = await client.put(f"/api/v1/settings/options/{team_option['id']}", json={
        "label": "Operations",
        "value": "Operations",
        "metadata_keys": [operator["external_id"]],
    })
    assert update_team_res.status_code == 200, update_team_res.text

    knowledge_res = await client.post("/api/v1/knowledge", json={
        "title": "CPU Recovery",
        "category": "Runbook",
        "content": "Restart service and reduce load",
        "status": "Draft",
    })
    assert knowledge_res.status_code == 200, knowledge_res.text
    knowledge = knowledge_res.json()

    device_res = await client.post("/api/v1/devices", json={
        "name": "MON-TEAM-01",
        "system": "MON-TEAM",
        "status": "Active",
        "type": "Physical",
        "serial_number": "MON-TEAM-SN",
        "asset_tag": "MON-TEAM-AT",
    })
    device = device_res.json()

    create_res = await client.post("/api/v1/monitoring", json={
        "device_id": device["id"],
        "category": "Infrastructure",
        "status": "Existing",
        "title": "TEAMED-MONITOR",
        "platform": "Zabbix",
        "owner_team": "Operations",
        "severity": "Critical",
        "recovery_docs": [knowledge["id"]],
        "owners": [{"operator_id": operator["id"], "role": "Primary Support"}],
    })
    assert create_res.status_code == 200, create_res.text
    monitor = create_res.json()
    assert monitor["owner_team"] == "Operations"
    assert monitor["owners"][0]["operator_id"] == operator["id"]
    assert monitor["owners"][0]["name"] == "Monitor Alpha"
