import pytest


@pytest.mark.anyio
async def test_user_pool_refresh_persists_script_history(client):
    script = "print('sync users')"
    refresh_res = await client.post("/api/v1/settings/user-pool/refresh", json={"script": script})
    assert refresh_res.status_code == 200, refresh_res.text

    versions_res = await client.get("/api/v1/settings/user-pool/versions")
    assert versions_res.status_code == 200, versions_res.text
    versions = versions_res.json()
    assert len(versions) > 0
    assert versions[0]["diff_summary"]["script"] == script
    assert any(user.get("team") for user in versions[0]["snapshot_data"])


@pytest.mark.anyio
async def test_team_management_and_operator_assignment(client):
    create_team_res = await client.post("/api/v1/settings/teams", json={
        "name": "Core Ops",
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
    assert operator["team"] == "Core Ops"

    update_team_res = await client.patch(f"/api/v1/settings/teams/{team['id']}", json={
        "name": "Core Platform Ops",
        "description": "Renamed team",
    })
    assert update_team_res.status_code == 200, update_team_res.text

    operators_res = await client.get("/api/v1/settings/operators")
    assert operators_res.status_code == 200, operators_res.text
    updated_operator = operators_res.json()[0]
    assert updated_operator["team"] == "Core Platform Ops"

    audit_res = await client.get(f"/api/v1/settings/teams/{team['id']}/audit")
    assert audit_res.status_code == 200, audit_res.text
    assert any(entry["action"] == "team_created" for entry in audit_res.json())


@pytest.mark.anyio
async def test_team_delete_is_blocked_when_members_exist(client):
    team_res = await client.post("/api/v1/settings/teams", json={"name": "Security Response"})
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
    assert "assigned operators" in delete_res.json()["detail"]


@pytest.mark.anyio
async def test_tenant_storage_explorer_lists_accessible_locations(client):
    settings_res = await client.get("/api/v1/tenants/admin/settings")
    assert settings_res.status_code == 200, settings_res.text
    storage_root = next(item["value"] for item in settings_res.json() if item["key"] == "tenant_storage_root")

    explorer_res = await client.get(f"/api/v1/tenants/admin/storage-explorer?path={storage_root}")
    assert explorer_res.status_code == 200, explorer_res.text
    payload = explorer_res.json()

    assert payload["current_path"] == storage_root
    assert any(root["path"] == storage_root for root in payload["roots"])
    assert payload["current_access"]["readable"] is True
    assert "workspace_root" in payload["runtime_context"]
