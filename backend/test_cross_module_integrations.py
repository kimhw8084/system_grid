from __future__ import annotations

import uuid

import pytest


@pytest.mark.anyio
async def test_far_prevention_project_is_atomic_and_linked(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    headers = {
        "X-User-Id": "admin_root",
        "X-Tenant-Id": str(seeded_admin_tenant["tenant_id"]),
    }
    mode_response = await client.post(
        "/api/v1/far/modes",
        headers=headers,
        json={
            "system_name": "PREVENTION-SYS",
            "title": "Prevention project vector",
            "severity": 8,
            "occurrence": 5,
            "detection": 4,
            "idempotency_key": f"far-mode-{uuid.uuid4()}",
        },
    )
    assert mode_response.status_code == 201, mode_response.text
    mode = mode_response.json()

    response = await client.post(
        "/api/v1/far/prevention/projects",
        headers=headers,
        json={
            "failure_mode_id": mode["id"],
            "cause_id": None,
            "prevention_action": "Eliminate the recurring failure through controlled automation",
            "responsible_team": "Reliability",
            "target_date": "2030-01-01T00:00:00Z",
            "project": {
                "name": "FAR prevention project",
                "description": "Created atomically with FAR evidence",
                "type": "Operational",
                "status": "Planning",
                "priority": "High",
                "owner": "Reliability",
                "tasks": [],
            },
            "idempotency_key": f"far-prevention-project-{uuid.uuid4()}",
        },
    )
    assert response.status_code == 201, response.text
    result = response.json()
    assert result["project_id"] > 0
    assert result["prevention"]["project_id"] == result["project_id"]
    assert result["prevention"]["failure_mode_id"] == mode["id"]

    refreshed = await client.get(f"/api/v1/far/modes/{mode['id']}", headers=headers)
    assert refreshed.status_code == 200, refreshed.text
    prevention = refreshed.json()["prevention_actions"]
    assert len(prevention) == 1
    assert prevention[0]["project_id"] == result["project_id"]
