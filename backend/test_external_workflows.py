import pytest


@pytest.mark.anyio
async def test_external_entity_creation_and_secret_management(client):
    team_res = await client.post("/api/v1/settings/teams", json={"name": "External Governance"})
    assert team_res.status_code == 200, team_res.text
    team = team_res.json()
    operator_res = await client.post("/api/v1/settings/operators", json={
        "external_id": "external-ops-001",
        "username": "external.ops.001",
        "full_name": "External Ops One",
        "email": "external.ops.001@example.com",
        "department": "Operations",
        "team_id": team["id"],
    })
    assert operator_res.status_code == 200, operator_res.text
    default_operator = operator_res.json()

    create_res = await client.post("/api/v1/intelligence/entities", json={
        "name": "EXT-QA-01",
        "type": "API",
        "external_key": "ext-qa-01",
        "owner_organization": "PartnerCo",
        "owner_team": "B2B",
        "ownership_mode": "individual",
        "internal_operator_id": default_operator["id"],
        "status": "Active",
        "environment": "Production",
        "description": "External partner feed",
        "contacts_json": [{
            "role": "Primary",
            "full_name": "Jane Doe",
            "external_person_id": "JD-01",
            "email": "jane.doe@example.com",
            "phone": "+1-555-0101",
            "is_primary": True,
            "is_escalation": False,
        }],
        "business_purpose": "External partner feed",
        "criticality": "High",
        "dependency_tier": "Tier 2",
        "integration_mode": "API",
        "primary_endpoint_url": "https://partner.example.com",
        "auth_method": "Token",
        "risk_rating": "Medium",
        "metadata_json": {"custom_note": "retain-me"},
    })
    assert create_res.status_code == 200, create_res.text
    entity = create_res.json()
    assert entity["name"] == "EXT-QA-01"
    assert entity["secrets"] == []

    secret_res = await client.post(f"/api/v1/intelligence/entities/{entity['id']}/secrets", json={
        "secret_label": "Readonly feed",
        "secret_type": "VaultReference",
        "username": "svc_partner",
        "vault_provider": "1Password",
        "vault_path": "vault://partner/feed/readonly",
        "note": "Readonly feed access",
    })
    assert secret_res.status_code == 200, secret_res.text

    update_res = await client.put(f"/api/v1/intelligence/entities/{entity['id']}", json={
        "id": entity["id"],
        "name": "EXT-QA-01",
        "external_key": "ext-qa-01",
        "type": "Virtual Server",
        "owner_organization": "PartnerCo",
        "owner_team": "B2B",
        "ownership_mode": "individual",
        "internal_operator_id": default_operator["id"],
        "status": "Active",
        "environment": "Production",
        "description": "External partner feed",
        "contacts_json": [{
            "role": "Primary",
            "full_name": "Jane Doe",
            "external_person_id": "JD-01",
            "email": "jane.doe@example.com",
            "phone": "+1-555-0101",
            "is_primary": True,
            "is_escalation": False,
        }],
        "business_purpose": "External partner feed",
        "criticality": "High",
        "dependency_tier": "Tier 2",
        "integration_mode": "Database",
        "primary_endpoint_url": "https://partner.example.com",
        "auth_method": "Token",
        "risk_rating": "Medium",
        "metadata_json": {"hypervisor": "", "vcpu": "", "vram": "", "os": ""},
    })
    assert update_res.status_code == 200, update_res.text

    list_res = await client.get("/api/v1/intelligence/entities?include_deleted=true")
    assert list_res.status_code == 200, list_res.text
    loaded = next(item for item in list_res.json() if item["id"] == entity["id"])
    assert loaded["metadata_json"]["hypervisor"] == ""
    assert len(loaded["secrets"]) == 1
    assert loaded["secrets"][0]["username"] == "svc_partner"
