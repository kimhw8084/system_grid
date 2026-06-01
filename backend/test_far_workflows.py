import pytest


@pytest.mark.anyio
async def test_far_cause_and_mitigation_deletes_cleanly(client):
    device_res = await client.post("/api/v1/devices", json={
        "name": "FAR-DEL-ASSET-01",
        "system": "FAR-DEL-SYS",
        "status": "Active",
        "type": "Physical",
        "serial_number": "FAR-DEL-SN-01",
        "asset_tag": "FAR-DEL-AT-01",
    })
    assert device_res.status_code == 200, device_res.text
    device = device_res.json()

    mode_res = await client.post("/api/v1/far/modes", json={
        "system_name": "FAR-DEL-SYS",
        "title": "FAR-DEL-MODE-01",
        "effect": "Delete-path validation",
        "severity": 7,
        "occurrence": 4,
        "detection": 3,
        "affected_assets": [device["id"]],
    })
    assert mode_res.status_code == 200, mode_res.text
    mode = mode_res.json()

    cause_res = await client.post("/api/v1/far/causes", json={
        "cause_text": "Transient dependency fault",
        "occurrence_level": 4,
        "responsible_team": "Operations",
        "mode_ids": [mode["id"]],
    })
    assert cause_res.status_code == 200, cause_res.text
    cause = cause_res.json()

    mitigation_res = await client.post("/api/v1/far/mitigations", json={
        "mitigation_type": "Monitoring",
        "mitigation_steps": "Watch the service and alert on regression",
        "responsible_team": "Operations",
        "status": "Not Started",
        "cause_id": cause["id"],
        "mode_ids": [mode["id"]],
    })
    assert mitigation_res.status_code == 200, mitigation_res.text
    mitigation = mitigation_res.json()

    delete_mitigation_res = await client.delete(f"/api/v1/far/mitigations/{mitigation['id']}")
    assert delete_mitigation_res.status_code == 200, delete_mitigation_res.text

    modes_after_mitigation = await client.get("/api/v1/far/modes")
    assert modes_after_mitigation.status_code == 200, modes_after_mitigation.text
    refreshed_mode = next(item for item in modes_after_mitigation.json() if item["id"] == mode["id"])
    assert refreshed_mode["mitigations"] == []

    delete_cause_res = await client.delete(f"/api/v1/far/causes/{cause['id']}")
    assert delete_cause_res.status_code == 200, delete_cause_res.text

    final_modes_res = await client.get("/api/v1/far/modes")
    assert final_modes_res.status_code == 200, final_modes_res.text
    final_mode = next(item for item in final_modes_res.json() if item["id"] == mode["id"])
    assert final_mode["causes"] == []


@pytest.mark.anyio
async def test_far_mode_metadata_updates_persist_research_links(client):
    mode_res = await client.post("/api/v1/far/modes", json={
        "system_name": "FAR-LINK-SYS",
        "title": "FAR-LINK-MODE-01",
        "effect": "Metadata update validation",
        "severity": 5,
        "occurrence": 3,
        "detection": 2,
    })
    assert mode_res.status_code == 200, mode_res.text
    mode = mode_res.json()

    update_res = await client.put(f"/api/v1/far/modes/{mode['id']}", json={
        "metadata_json": {"linked_research_ids": [101, 202]}
    })
    assert update_res.status_code == 200, update_res.text
    updated_mode = update_res.json()
    assert updated_mode["metadata_json"]["linked_research_ids"] == [101, 202]
