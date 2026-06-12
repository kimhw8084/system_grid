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


@pytest.mark.anyio
async def test_external_archived_entity_blocks_new_links_and_secrets(client):
    team_res = await client.post("/api/v1/settings/teams", json={"name": "External Archive Ops"})
    team = team_res.json()
    operator_res = await client.post("/api/v1/settings/operators", json={
        "external_id": "external-ops-archive-001",
        "username": "external.archive.001",
        "full_name": "External Archive Owner",
        "email": "external.archive.001@example.com",
        "department": "Operations",
        "team_id": team["id"],
    })
    operator = operator_res.json()
    device_res = await client.post("/api/v1/devices", json={
        "name": "EXT-LINK-DEVICE-01",
        "system": "EXT-LINK-SYS",
        "status": "Active",
        "type": "Physical",
        "serial_number": "EXT-LINK-SN",
        "asset_tag": "EXT-LINK-AT",
    })
    device = device_res.json()

    entity_res = await client.post("/api/v1/intelligence/entities", json={
        "name": "ARCHIVE-EXT-01",
        "type": "API",
        "external_key": "archive-ext-01",
        "owner_organization": "PartnerCo",
        "ownership_mode": "individual",
        "internal_operator_id": operator["id"],
        "status": "Active",
        "environment": "Production",
        "description": "Archived external entity",
        "contacts_json": [{
            "role": "Primary",
            "full_name": "Jane Archive",
            "external_person_id": "JA-01",
            "email": "jane.archive@example.com",
            "phone": "+1-555-0110",
            "is_primary": True,
            "is_escalation": False,
        }],
        "business_purpose": "Archive validation",
        "criticality": "High",
        "dependency_tier": "Tier 2",
        "integration_mode": "API",
        "primary_endpoint_url": "https://archive.example.com",
        "auth_method": "Token",
        "risk_rating": "Medium",
        "metadata_json": {},
    })
    assert entity_res.status_code == 200, entity_res.text
    entity = entity_res.json()

    delete_res = await client.delete(f"/api/v1/intelligence/entities/{entity['id']}")
    assert delete_res.status_code == 200, delete_res.text

    secret_res = await client.post(f"/api/v1/intelligence/entities/{entity['id']}/secrets", json={
        "secret_label": "Archived secret",
        "secret_type": "VaultReference",
        "username": "svc_archived",
        "vault_provider": "1Password",
        "vault_path": "vault://archived/entity",
        "note": "Archived entity credential",
    })
    assert secret_res.status_code == 400
    assert "archived external entity" in secret_res.json()["detail"]

    link_res = await client.post("/api/v1/intelligence/links", json={
        "external_entity_id": entity["id"],
        "device_id": device["id"],
        "direction": "Outbound",
        "purpose": "Archive blocked link",
        "protocol": "HTTPS",
        "port": 443,
        "host_or_fqdn": "archive.example.com",
        "path_or_resource": "/health",
        "link_status": "Active",
    })
    assert link_res.status_code == 400
    assert "archived external entity" in link_res.json()["detail"]


@pytest.mark.anyio
async def test_external_links_are_enriched_and_duplicate_shape_is_blocked(client):
    team_res = await client.post("/api/v1/settings/teams", json={"name": "External Link Ops"})
    team = team_res.json()
    operator_res = await client.post("/api/v1/settings/operators", json={
        "external_id": "external-link-001",
        "username": "external.link.001",
        "full_name": "External Link Owner",
        "email": "external.link.001@example.com",
        "department": "Operations",
        "team_id": team["id"],
    })
    operator = operator_res.json()
    device_res = await client.post("/api/v1/devices", json={
        "name": "EXT-ENRICH-DEVICE-01",
        "system": "EXT-ENRICH-SYS",
        "status": "Active",
        "type": "Physical",
        "serial_number": "EXT-ENRICH-SN",
        "asset_tag": "EXT-ENRICH-AT",
    })
    device = device_res.json()

    entity_res = await client.post("/api/v1/intelligence/entities", json={
        "name": "ENRICH-EXT-01",
        "type": "API",
        "external_key": "enrich-ext-01",
        "owner_organization": "PartnerCo",
        "ownership_mode": "individual",
        "internal_operator_id": operator["id"],
        "status": "Active",
        "environment": "Production",
        "description": "Enriched link target",
        "contacts_json": [{
            "role": "Primary",
            "full_name": "Link Primary",
            "external_person_id": "LP-01",
            "email": "link.primary@example.com",
            "phone": "+1-555-0111",
            "is_primary": True,
            "is_escalation": False,
        }],
        "business_purpose": "Link enrichment validation",
        "criticality": "High",
        "dependency_tier": "Tier 2",
        "integration_mode": "API",
        "primary_endpoint_url": "https://enrich.example.com",
        "auth_method": "Token",
        "risk_rating": "Medium",
        "metadata_json": {},
    })
    entity = entity_res.json()

    link_payload = {
        "external_entity_id": entity["id"],
        "device_id": device["id"],
        "direction": "Outbound",
        "purpose": "Primary partner feed",
        "protocol": "HTTPS",
        "port": 443,
        "host_or_fqdn": "enrich.example.com",
        "path_or_resource": "/status",
        "link_status": "Active",
    }
    create_link_res = await client.post("/api/v1/intelligence/links", json=link_payload)
    assert create_link_res.status_code == 200, create_link_res.text

    dup_link_res = await client.post("/api/v1/intelligence/links", json=link_payload)
    assert dup_link_res.status_code == 409
    assert "same shape already exists" in dup_link_res.json()["detail"]

    links_res = await client.get("/api/v1/intelligence/links")
    assert links_res.status_code == 200, links_res.text
    links = links_res.json()
    link = next(item for item in links if item["external_entity_id"] == entity["id"])
    assert link["external_entity_name"] == "ENRICH-EXT-01"
    assert link["device_name"] == "EXT-ENRICH-DEVICE-01"


@pytest.mark.anyio
async def test_external_entity_blocks_active_identity_duplicates_and_restore_conflicts(client):
    team_res = await client.post("/api/v1/settings/teams", json={"name": "External Identity Ops"})
    team = team_res.json()
    operator_res = await client.post("/api/v1/settings/operators", json={
        "external_id": "external-identity-001",
        "username": "external.identity.001",
        "full_name": "External Identity Owner",
        "email": "external.identity.001@example.com",
        "department": "Operations",
        "team_id": team["id"],
    })
    operator = operator_res.json()

    base_payload = {
        "name": "IDENTITY-EXT-01",
        "type": "API",
        "owner_organization": "PartnerCo",
        "ownership_mode": "individual",
        "internal_operator_id": operator["id"],
        "status": "Active",
        "environment": "Production",
        "description": "Identity conflict target",
        "contacts_json": [{
            "role": "Primary",
            "full_name": "Identity Primary",
            "external_person_id": "IP-01",
            "email": "identity.primary@example.com",
            "phone": "+1-555-0112",
            "is_primary": True,
            "is_escalation": False,
        }],
        "business_purpose": "Identity uniqueness validation",
        "criticality": "High",
        "dependency_tier": "Tier 2",
        "integration_mode": "API",
        "primary_endpoint_url": "https://identity.example.com",
        "auth_method": "Token",
        "risk_rating": "Medium",
        "metadata_json": {},
    }

    first_res = await client.post("/api/v1/intelligence/entities", json={**base_payload, "external_key": "identity-ext-01"})
    assert first_res.status_code == 200, first_res.text
    first = first_res.json()

    duplicate_res = await client.post("/api/v1/intelligence/entities", json={**base_payload, "external_key": "identity-ext-02"})
    assert duplicate_res.status_code == 409
    assert "same name, type, and owner organization" in duplicate_res.json()["detail"]

    archive_res = await client.delete(f"/api/v1/intelligence/entities/{first['id']}")
    assert archive_res.status_code == 200, archive_res.text

    replacement_res = await client.post("/api/v1/intelligence/entities", json={**base_payload, "external_key": "identity-ext-02"})
    assert replacement_res.status_code == 200, replacement_res.text

    restore_res = await client.post(f"/api/v1/intelligence/entities/{first['id']}/restore")
    assert restore_res.status_code == 409
    assert "same name, type, and owner organization" in restore_res.json()["detail"]
