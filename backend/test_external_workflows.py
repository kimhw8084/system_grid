import pytest


@pytest.mark.anyio
async def test_external_entity_creation_and_secret_management(client):
    create_res = await client.post("/api/v1/intelligence/entities", json={
        "name": "EXT-QA-01",
        "type": "API",
        "owner_organization": "PartnerCo",
        "owner_team": "B2B",
        "status": "Active",
        "environment": "Production",
        "description": "External partner feed",
        "poc_json": [{
            "first_name": "Jane",
            "last_name": "Doe",
            "id": "JD-01",
            "email": "jane.doe@example.com",
            "phone": "+1-555-0101",
        }],
        "metadata_json": {
            "base_url": "https://partner.example.com",
            "auth_type": "token",
            "custom_note": "retain-me",
        },
    })
    assert create_res.status_code == 200, create_res.text
    entity = create_res.json()
    assert entity["name"] == "EXT-QA-01"
    assert entity["secrets"] == []

    secret_res = await client.post(f"/api/v1/intelligence/entities/{entity['id']}/secrets", json={
        "username": "svc_partner",
        "password": "super-secret",
        "note": "Readonly feed access",
    })
    assert secret_res.status_code == 200, secret_res.text

    update_res = await client.put(f"/api/v1/intelligence/entities/{entity['id']}", json={
        "id": entity["id"],
        "name": "EXT-QA-01",
        "type": "Virtual Server",
        "owner_organization": "PartnerCo",
        "owner_team": "B2B",
        "status": "Active",
        "environment": "Production",
        "description": "External partner feed",
        "poc_json": [{
            "first_name": "Jane",
            "last_name": "Doe",
            "id": "JD-01",
            "email": "jane.doe@example.com",
            "phone": "+1-555-0101",
        }],
        "metadata_json": {
            "base_url": "https://partner.example.com",
            "auth_type": "token",
            "custom_note": "retain-me",
            "hypervisor": "",
            "vcpu": "",
            "vram": "",
            "os": "",
        },
    })
    assert update_res.status_code == 200, update_res.text

    list_res = await client.get("/api/v1/intelligence/entities?include_deleted=true")
    assert list_res.status_code == 200, list_res.text
    loaded = next(item for item in list_res.json() if item["id"] == entity["id"])
    assert loaded["metadata_json"]["custom_note"] == "retain-me"
    assert len(loaded["secrets"]) == 1
    assert loaded["secrets"][0]["username"] == "svc_partner"
