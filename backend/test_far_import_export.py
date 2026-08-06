from __future__ import annotations

import uuid

import pytest


def headers_for(seed: dict) -> dict[str, str]:
    return {"X-User-Id": "admin_root", "X-Tenant-Id": str(seed["tenant_id"])}


@pytest.mark.anyio
async def test_far_import_is_previewed_transactional_and_idempotent(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    headers = headers_for(seeded_admin_tenant)

    invalid_key = f"far-import-invalid-{uuid.uuid4()}"
    invalid = await client.post(
        "/api/v1/far/exchange/import/preview",
        headers=headers,
        json={
            "schema_id": "sysgrid.far.v1",
            "records": [{"system_name": "SYS", "title": "Bad", "severity": 11}],
            "idempotency_key": invalid_key,
        },
    )
    assert invalid.status_code == 200, invalid.text
    assert invalid.json()["can_execute"] is False
    assert invalid.json()["error_count"] == 1

    key = f"far-import-{uuid.uuid4()}"
    preview = await client.post(
        "/api/v1/far/exchange/import/preview",
        headers=headers,
        json={
            "schema_id": "sysgrid.far.v1",
            "records": [{
                "system_name": "IMPORT-SYS",
                "failure_type": "Process",
                "title": "Imported failure vector",
                "effect": "Import validation",
                "severity": 9,
                "occurrence": 4,
                "detection": 7,
                "status": "Analyzing",
                "affected_asset_ids": [],
                "cause_ids": [],
                "linked_rca_ids": [],
                "metadata_json": {"source": "test"},
            }],
            "idempotency_key": key,
        },
    )
    assert preview.status_code == 200, preview.text
    prepared = preview.json()
    assert prepared["can_execute"] is True

    execute_payload = {
        "preview_token": prepared["preview_token"],
        "preview_hash": prepared["preview_hash"],
        "idempotency_key": key,
        "confirm": True,
    }
    execute = await client.post("/api/v1/far/exchange/import/execute", headers=headers, json=execute_payload)
    assert execute.status_code == 200, execute.text
    assert execute.json()["changed_count"] == 1

    replay = await client.post("/api/v1/far/exchange/import/execute", headers=headers, json=execute_payload)
    assert replay.status_code == 200, replay.text
    assert replay.json()["idempotent_replay"] is True


@pytest.mark.anyio
async def test_far_exports_include_complete_entity_history_contract(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    headers = headers_for(seeded_admin_tenant)
    mode = await client.post(
        "/api/v1/far/modes",
        headers=headers,
        json={
            "system_name": "EXPORT-SYS",
            "title": "Exported vector",
            "severity": 4,
            "occurrence": 5,
            "detection": 6,
            "idempotency_key": f"far-export-mode-{uuid.uuid4()}",
        },
    )
    assert mode.status_code == 201, mode.text

    structured = await client.get("/api/v1/far/exchange/export/structured?include_retired=true", headers=headers)
    assert structured.status_code == 200, structured.text
    payload = structured.json()
    assert payload["schema_id"] == "sysgrid.far.v1"
    assert len(payload["export_hash"]) == 64
    assert set(payload["entities"]) == {"failure_modes", "causes", "mitigations", "prevention", "resolutions"}
    assert payload["history_count"] >= 1
    assert payload["recovery_contract"]["nested_entities_restore_through_their_own_history"] is True
    assert payload["recovery_contract"]["retirement_state_is_not_implicitly_changed_by_history_restore"] is True

    csv_response = await client.get("/api/v1/far/exchange/export/csv", headers=headers)
    assert csv_response.status_code == 200, csv_response.text
    assert "system_name" in csv_response.text
    assert "EXPORT-SYS" in csv_response.text
