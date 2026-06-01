import pytest


@pytest.mark.anyio
async def test_monitoring_bulk_actions_create_history_entries(client):
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

    create_res = await client.post("/api/v1/monitoring", json={
        "device_id": device["id"],
        "category": "Hardware",
        "status": "Existing",
        "title": "MON-HISTORY",
        "platform": "Zabbix",
        "purpose": "History validation",
        "notification_method": "Slack",
    })
    assert create_res.status_code == 200, create_res.text
    monitor = create_res.json()

    update_res = await client.post("/api/v1/monitoring/bulk-action", json={
        "ids": [monitor["id"]],
        "action": "update",
        "payload": {"severity": "Critical"},
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
    assert history[2]["change_summary"] == "Bulk update: severity"
    assert history[2]["snapshot"]["severity"] == "Critical"
