import pytest


@pytest.mark.anyio
async def test_architecture_history_approval_and_restore(client):
    create_res = await client.post("/api/v1/data-flows", json={
        "name": "ARCH-HIST-01",
        "description": "Architecture history coverage",
        "category": "Service",
        "status": "Planned",
        "metadata": {
            "owner_team": "Architecture",
            "business_purpose": "Initial manifest",
        },
        "nodes": [{"id": "device-1", "type": "device", "data": {"name": "APP-01"}}],
        "edges": [],
    })
    assert create_res.status_code == 200, create_res.text
    flow = create_res.json()
    assert flow["current_version"] == 1

    update_res = await client.put(f"/api/v1/data-flows/{flow['id']}", json={
        "description": "Architecture history coverage updated",
        "metadata": {
            **flow["metadata"],
            "business_purpose": "Updated manifest",
            "review_status": "Needs Review",
        },
        "edges": [{
            "id": "edge-1",
            "source": "device-1",
            "target": "external-1",
            "data": {"label": "PRIMARY_PATH"},
        }],
        "change_summary": "Mapped primary path",
    })
    assert update_res.status_code == 200, update_res.text
    updated = update_res.json()
    assert updated["current_version"] == 2

    approve_res = await client.post(f"/api/v1/data-flows/{flow['id']}/approve", json={
        "approved_by": "Architecture Board",
        "approval_notes": "Reviewed for release",
    })
    assert approve_res.status_code == 200, approve_res.text
    approved = approve_res.json()
    assert approved["metadata"]["review_status"] == "Approved"
    assert approved["metadata"]["approved_by"] == "Architecture Board"

    history_res = await client.get(f"/api/v1/data-flows/{flow['id']}/history")
    assert history_res.status_code == 200, history_res.text
    history = history_res.json()
    assert [entry["version"] for entry in history[:3]] == [3, 2, 1]
    assert history[0]["snapshot"]["metadata"]["review_status"] == "Approved"
    assert history[1]["change_summary"] == "Mapped primary path"

    restore_res = await client.post(f"/api/v1/data-flows/{flow['id']}/history/{history[-1]['id']}/restore")
    assert restore_res.status_code == 200, restore_res.text
    restored = restore_res.json()
    assert restored["current_version"] == 4
    assert restored["edges"] == []
    assert restored["metadata"]["review_status"] == "Needs Review"

    history_res_2 = await client.get(f"/api/v1/data-flows/{flow['id']}/history")
    assert history_res_2.status_code == 200, history_res_2.text
    history_2 = history_res_2.json()
    assert history_2[0]["change_summary"] == "Restored version 1"
