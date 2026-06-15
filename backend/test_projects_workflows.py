import pytest


@pytest.mark.anyio
async def test_project_update_records_project_level_activity_log(seeded_admin_tenant):
    client = seeded_admin_tenant["client"] # Get client from seeded_admin_tenant
    
    create_res = await client.post("/api/v1/projects", json={
        "name": "PROJECT-QA-01",
        "type": "Strategic",
        "status": "Planning",
        "priority": "Medium",
        "metadata_json": {}
    })
    assert create_res.status_code == 200, create_res.text
    project = create_res.json()

    update_res = await client.put(f"/api/v1/projects/{project['id']}", json={
        "name": "PROJECT-QA-01A",
        "type": "Tactical",
        "status": "In Progress",
        "priority": "High"
    })
    assert update_res.status_code == 200, update_res.text
    updated = update_res.json()
    audit_log = updated["metadata_json"]["audit_log"]
    assert len(audit_log) == 1
    assert "status: Planning -> In Progress" in audit_log[0]["content"]
    assert "priority: Medium -> High" in audit_log[0]["content"]
    assert "name: PROJECT-QA-01 -> PROJECT-QA-01A" in audit_log[0]["content"]
