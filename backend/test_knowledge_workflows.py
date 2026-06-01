import pytest


@pytest.mark.anyio
async def test_knowledge_search_expands_to_linked_entities_and_version_history(client):
    device_res = await client.post("/api/v1/devices", json={
        "name": "KNOWLEDGE-SEARCH-ASSET",
        "system": "KNOWLEDGE-SYS",
        "status": "Active",
        "type": "Physical",
        "serial_number": "KNOWLEDGE-SN-1"
    })
    assert device_res.status_code == 200, device_res.text
    device = device_res.json()

    service_res = await client.post("/api/v1/logical-services", json={
        "name": "KNOWLEDGE-LINKED-SERVICE",
        "service_type": "Database",
        "status": "Active",
        "device_id": device["id"]
    })
    assert service_res.status_code == 200, service_res.text
    service = service_res.json()

    vendor_res = await client.post("/api/v1/vendors", json={"name": "KNOWLEDGE-VENDOR"})
    assert vendor_res.status_code == 200, vendor_res.text
    vendor = vendor_res.json()

    create_res = await client.post("/api/v1/knowledge", json={
        "category": "BKM",
        "title": "KNOWLEDGE-RECOVERY",
        "content": "Recovery instructions",
        "linked_device_ids": [device["id"]],
        "metadata_json": {
            "ownership": {"owner": "ops_lead"},
            "verification": {"state": "Needs Review", "next_review_at": "2038-01-01"},
            "links": {
                "service_ids": [service["id"]],
                "vendor_ids": [vendor["id"]]
            }
        }
    })
    assert create_res.status_code == 200, create_res.text
    created = create_res.json()
    assert len(created["metadata_json"]["version_history"]) == 1

    search_res = await client.get("/api/v1/knowledge", params={"search": "KNOWLEDGE-VENDOR"})
    assert search_res.status_code == 200, search_res.text
    matches = search_res.json()
    assert any(item["id"] == created["id"] for item in matches)

    update_res = await client.put(f"/api/v1/knowledge/{created['id']}", json={
        "category": "BKM",
        "title": "KNOWLEDGE-RECOVERY-V2",
        "content": "Recovery instructions updated",
        "linked_device_ids": [device["id"]],
        "metadata_json": {
            "ownership": {"owner": "ops_lead"},
            "verification": {"state": "Verified", "verified_by": "ops_lead"},
            "links": {
                "service_ids": [service["id"]],
                "vendor_ids": [vendor["id"]]
            }
        }
    })
    assert update_res.status_code == 200, update_res.text
    updated = update_res.json()
    assert len(updated["metadata_json"]["version_history"]) == 2
    assert updated["metadata_json"]["version_history"][-1]["snapshot"]["title"] == "KNOWLEDGE-RECOVERY-V2"

    initial_snapshot = updated["metadata_json"]["version_history"][0]["snapshot"]
    restore_res = await client.put(f"/api/v1/knowledge/{created['id']}", json={
        "category": initial_snapshot["category"],
        "title": initial_snapshot["title"],
        "content": initial_snapshot["content"],
        "content_json": initial_snapshot["content_json"],
        "question_context": initial_snapshot["question_context"],
        "tags": initial_snapshot["tags"],
        "impacted_systems": initial_snapshot["impacted_systems"],
        "linked_device_ids": initial_snapshot["linked_device_ids"],
        "status": initial_snapshot["status"],
        "metadata_json": initial_snapshot["metadata_json"]
    })
    assert restore_res.status_code == 200, restore_res.text
    restored = restore_res.json()
    assert restored["title"] == "KNOWLEDGE-RECOVERY"
    assert len(restored["metadata_json"]["version_history"]) == 3
