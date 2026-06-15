import pytest

@pytest.mark.anyio
async def test_user_pool_refresh_persists_identity_records(seeded_admin_tenant):
    client = seeded_admin_tenant["client"] # Get client from seeded_admin_tenant
    records = [
        {
            "external_id": "ext-001",
            "username": "user.001",
            "full_name": "User One",
            "email": "user1@example.com",
            "department": "Engineering",
            "team": "Matrix Core",
            "registration_status": "Verified"
        }
    ]
    refresh_res = await client.post("/api/v1/settings/user-pool/refresh", json={
        "records": records,
        "source": "identity_provider_v1"
    })
    assert refresh_res.status_code == 200, refresh_res.text

    versions_res = await client.get("/api/v1/settings/user-pool/versions")
    assert versions_res.status_code == 200, versions_res.text
    versions = versions_res.json()
    assert len(versions) > 0
    assert versions[0]["diff_summary"]["source"] == "identity_provider_v1"
    assert any(user["username"] == "user.001" for user in versions[0]["snapshot_data"])


@pytest.mark.anyio
async def test_team_management_and_operator_assignment(seeded_admin_tenant, tmp_path):
    client = seeded_admin_tenant["client"] # Get client from seeded_admin_tenant
    create_team_res = await client.post("/api/v1/settings/teams", json={
        "name": f"Core Ops {tmp_path.name}",
        "description": "Primary operations team",
    })
    assert create_team_res.status_code == 200, create_team_res.text
    team = create_team_res.json()

    create_operator_res = await client.post("/api/v1/settings/operators", json={
        "external_id": "ops-001",
        "username": "ops.001",
        "full_name": "Ops One",
        "email": "ops1@example.com",
        "department": "Operations",
        "team_id": team["id"],
    })
    assert create_operator_res.status_code == 200, create_operator_res.text
    operator = create_operator_res.json()
    assert operator["team_id"] == team["id"]
    assert operator["team"] == f"Core Ops {tmp_path.name}"

    update_team_res = await client.patch(f"/api/v1/settings/teams/{team['id']}", json={
        "name": f"Core Platform Ops {tmp_path.name}",
        "description": "Renamed team",
    })
    assert update_team_res.status_code == 200, update_team_res.text

    operators_res = await client.get("/api/v1/settings/operators")
    assert operators_res.status_code == 200, operators_res.text
    updated_operator = next(op for op in operators_res.json() if op["username"] == "ops.001")
    assert updated_operator["team"] == f"Core Platform Ops {tmp_path.name}"

    audit_res = await client.get(f"/api/v1/settings/teams/{team['id']}/audit")
    assert audit_res.status_code == 200, audit_res.text
    assert any(entry["action"] == "team_created" for entry in audit_res.json())


@pytest.mark.anyio
async def test_team_delete_is_blocked_when_members_exist(seeded_admin_tenant, tmp_path):
    client = seeded_admin_tenant["client"] # Get client from seeded_admin_tenant
    team_res = await client.post("/api/v1/settings/teams", json={"name": f"Security Response {tmp_path.name}"})
    assert team_res.status_code == 200, team_res.text
    team = team_res.json()

    operator_res = await client.post("/api/v1/settings/operators", json={
        "external_id": "sec-001",
        "username": "sec.001",
        "full_name": "Sec One",
        "email": "sec1@example.com",
        "department": "Security",
        "team_id": team["id"],
    })
    assert operator_res.status_code == 200, operator_res.text

    delete_res = await client.delete(f"/api/v1/settings/teams/{team['id']}")
    assert delete_res.status_code == 400, delete_res.text
    assert "references still exist" in delete_res.json()["detail"]


@pytest.mark.anyio
async def test_tenant_storage_explorer_lists_accessible_locations(seeded_admin_tenant, tmp_path):
    client = seeded_admin_tenant["client"] # Get client from seeded_admin_tenant
    storage_root = str(tmp_path / "explorer-root")
    
    # First, set the storage root setting
    await client.post("/api/v1/tenants/admin/settings", json={
        "key": "tenant_storage_root",
        "value": storage_root,
        "description": "Explorer root"
    })

    explorer_res = await client.get(f"/api/v1/tenants/admin/storage-explorer?path={storage_root}")
    assert explorer_res.status_code == 200, explorer_res.text
    payload = explorer_res.json()

    assert payload["current_path"] == storage_root
    assert any(root["path"] == storage_root for root in payload["roots"])
    assert payload["current_access"]["readable"] is True
    assert "workspace_root" in payload["runtime_context"]
