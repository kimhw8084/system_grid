import pytest


@pytest.mark.anyio
async def test_investigation_log_updates_parent_timestamp_and_rejects_blank_entries(client):
    create_res = await client.post("/api/v1/investigations", json={
        "title": "RESEARCH-TIMESTAMP-CHECK",
        "status": "ANALYZING",
        "priority": "HIGH",
        "systems": ["GRID-TEST"],
        "initiation_at": "2037-01-01T01:00:00"
    })
    assert create_res.status_code == 200, create_res.text
    investigation = create_res.json()

    blank_log_res = await client.post(f"/api/v1/investigations/{investigation['id']}/logs", json={
        "entry_text": "   ",
        "entry_type": "DIAGNOSIS",
        "poc": "OPS"
    })
    assert blank_log_res.status_code == 400
    assert "Intelligence pulse text is required" in blank_log_res.json()["detail"]

    pre_fetch = await client.get("/api/v1/investigations")
    before = next(item for item in pre_fetch.json() if item["id"] == investigation["id"])

    log_res = await client.post(f"/api/v1/investigations/{investigation['id']}/logs", json={
        "entry_text": "Confirmed packet loss source",
        "entry_type": "DIAGNOSIS",
        "poc": "OPS"
    })
    assert log_res.status_code == 200, log_res.text

    post_fetch = await client.get("/api/v1/investigations")
    after = next(item for item in post_fetch.json() if item["id"] == investigation["id"])
    assert after["updated_at"] != before["updated_at"]
    assert len(after["progress_logs"]) == 1
