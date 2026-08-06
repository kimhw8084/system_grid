from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.models.config import Tenant


def idem(label: str) -> str:
    return f"test-{label}-{uuid.uuid4()}"


def headers_for(seeded_admin_tenant: dict) -> dict[str, str]:
    return {
        "X-User-Id": "admin_root",
        "X-Tenant-Id": str(seeded_admin_tenant["tenant_id"]),
    }


async def create_mode(client, headers: dict[str, str], *, title: str = "FAR mode") -> dict:
    response = await client.post(
        "/api/v1/far/modes",
        headers=headers,
        json={
            "system_name": "FAR-TEST-SYSTEM",
            "failure_type": "Design",
            "title": title,
            "effect": "Controlled workflow verification",
            "severity": 7,
            "occurrence": 4,
            "detection": 3,
            "status": "Analyzing",
            "affected_asset_ids": [],
            "cause_ids": [],
            "linked_rca_ids": [],
            "metadata_json": {},
            "idempotency_key": idem("mode-create"),
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


async def nested_preview_execute(
    client,
    headers: dict[str, str],
    *,
    entity_type: str,
    entity_id: int,
    expected_version: int,
    reason: str,
    mode_id: int | None = None,
) -> dict:
    key = idem(f"{entity_type}-lifecycle")
    preview = await client.post(
        f"/api/v1/far/{entity_type}/{entity_id}/retirement/preview",
        headers=headers,
        json={
            "expected_version": expected_version,
            "reason": reason,
            "mode_id": mode_id,
            "idempotency_key": key,
        },
    )
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert body["can_execute"] is True
    execute = await client.post(
        "/api/v1/far/nested/retirement/execute",
        headers=headers,
        json={
            "preview_token": body["preview_token"],
            "preview_hash": body["preview_hash"],
            "idempotency_key": key,
            "confirm": True,
        },
    )
    assert execute.status_code == 200, execute.text
    return execute.json()




@pytest.mark.anyio
async def test_far_list_repairs_stale_derived_rpn_before_serving_the_registry(seeded_admin_tenant, setup_db):
    client = seeded_admin_tenant["client"]
    headers = headers_for(seeded_admin_tenant)
    mode = await create_mode(client, headers, title="Stale derived score repair")
    expected_rpn = mode["severity"] * mode["occurrence"] * mode["detection"]

    _config_engine, config_session_local = setup_db
    async with config_session_local() as config_session:
        db_url = (await config_session.execute(
            select(Tenant.db_url).where(Tenant.id == seeded_admin_tenant["tenant_id"])
        )).scalar_one()

    repair_engine = create_async_engine(db_url)
    try:
        async with repair_engine.begin() as connection:
            await connection.execute(
                text("UPDATE far_failure_modes SET rpn = 1 WHERE id = :mode_id"),
                {"mode_id": mode["id"]},
            )

        response = await client.get("/api/v1/far/modes", headers=headers)
        assert response.status_code == 200, response.text
        repaired = next(item for item in response.json() if item["id"] == mode["id"])
        assert repaired["rpn"] == expected_rpn
        assert repaired["risk_band"] == "Low"

        async with repair_engine.connect() as connection:
            stored_rpn = (await connection.execute(
                text("SELECT rpn FROM far_failure_modes WHERE id = :mode_id"),
                {"mode_id": mode["id"]},
            )).scalar_one()
        assert stored_rpn == expected_rpn
    finally:
        await repair_engine.dispose()


@pytest.mark.anyio
async def test_far_nested_lifecycle_preserves_history_and_requires_preview(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    headers = headers_for(seeded_admin_tenant)
    mode = await create_mode(client, headers, title="Nested lifecycle")

    cause_response = await client.post(
        "/api/v1/far/causes",
        headers=headers,
        json={
            "cause_text": "Transient dependency fault",
            "occurrence_level": 4,
            "responsible_team": "Operations",
            "mode_ids": [mode["id"]],
            "idempotency_key": idem("cause-create"),
        },
    )
    assert cause_response.status_code == 201, cause_response.text
    cause = cause_response.json()

    mitigation_response = await client.post(
        "/api/v1/far/mitigations",
        headers=headers,
        json={
            "mitigation_type": "Monitoring",
            "mitigation_steps": "Watch the service and alert on regression",
            "responsible_team": "Operations",
            "status": "Not Started",
            "cause_id": cause["id"],
            "monitoring_item_id": None,
            "mode_ids": [mode["id"]],
            "idempotency_key": idem("mitigation-create"),
        },
    )
    assert mitigation_response.status_code == 201, mitigation_response.text
    mitigation = mitigation_response.json()

    legacy_delete = await client.delete(f"/api/v1/far/mitigations/{mitigation['id']}", headers=headers)
    assert legacy_delete.status_code == 428
    direct_retire = await client.post(f"/api/v1/far/mitigation/{mitigation['id']}/retire", headers=headers)
    assert direct_retire.status_code == 428

    retirement = await nested_preview_execute(
        client,
        headers,
        entity_type="mitigation",
        entity_id=mitigation["id"],
        expected_version=mitigation["version"],
        reason="No longer the approved mitigation",
    )
    assert retirement["operation"] == "retire"
    retired_version = retirement["versions"][str(mitigation["id"])]

    default_mode = await client.get(f"/api/v1/far/modes/{mode['id']}", headers=headers)
    assert default_mode.status_code == 200, default_mode.text
    assert default_mode.json()["mitigations"] == []

    forensic_mode = await client.get(
        f"/api/v1/far/modes/{mode['id']}?include_retired_nested=true",
        headers=headers,
    )
    assert forensic_mode.status_code == 200, forensic_mode.text
    retired_mitigation = next(item for item in forensic_mode.json()["mitigations"] if item["id"] == mitigation["id"])
    assert retired_mitigation["is_retired"] is True

    history = await client.get(f"/api/v1/far/mitigation/{mitigation['id']}/history", headers=headers)
    assert history.status_code == 200, history.text
    history_versions = [item["version"] for item in history.json()]
    assert mitigation["version"] in history_versions
    assert retired_version in history_versions

    history_restore = await client.post(
        f"/api/v1/far/mitigation/{mitigation['id']}/history/restore",
        headers=headers,
        json={
            "expected_version": retired_version,
            "history_version": mitigation["version"],
            "reason": "Recover the prior mitigation content without changing retirement",
            "idempotency_key": idem("mitigation-history-restore"),
        },
    )
    assert history_restore.status_code == 200, history_restore.text
    history_restored_version = history_restore.json()["versions"][str(mitigation["id"])]

    still_retired = await client.get(
        f"/api/v1/far/modes/{mode['id']}?include_retired_nested=true",
        headers=headers,
    )
    restored_snapshot = next(item for item in still_retired.json()["mitigations"] if item["id"] == mitigation["id"])
    assert restored_snapshot["is_retired"] is True

    explicit_restore = await client.post(
        f"/api/v1/far/mitigation/{mitigation['id']}/restore",
        headers=headers,
        json={
            "expected_version": history_restored_version,
            "reason": "Re-approve this mitigation for active use",
            "idempotency_key": idem("mitigation-restore"),
        },
    )
    assert explicit_restore.status_code == 200, explicit_restore.text

    active_mode = await client.get(f"/api/v1/far/modes/{mode['id']}", headers=headers)
    active_mitigation = next(item for item in active_mode.json()["mitigations"] if item["id"] == mitigation["id"])
    assert active_mitigation["is_retired"] is False

    current_cause = next(item for item in active_mode.json()["causes"] if item["id"] == cause["id"])
    unlink = await nested_preview_execute(
        client,
        headers,
        entity_type="cause",
        entity_id=cause["id"],
        expected_version=current_cause["version"],
        reason="Attribution superseded for this failure mode",
        mode_id=mode["id"],
    )
    assert unlink["operation"] == "unlink"

    final_mode = await client.get(f"/api/v1/far/modes/{mode['id']}", headers=headers)
    assert final_mode.status_code == 200, final_mode.text
    assert final_mode.json()["causes"] == []
    cause_history = await client.get(f"/api/v1/far/cause/{cause['id']}/history", headers=headers)
    assert cause_history.status_code == 200
    assert len(cause_history.json()) >= 2


@pytest.mark.anyio
async def test_far_mode_updates_are_versioned_idempotent_and_server_scored(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    headers = headers_for(seeded_admin_tenant)
    mode = await create_mode(client, headers, title="Scoring and metadata")
    assert mode["rpn"] == 84
    assert mode["risk_band"] == "Low"

    key = idem("mode-update")
    payload = {
        "expected_version": mode["version"],
        "severity": 10,
        "occurrence": 10,
        "detection": 3,
        "metadata_json": {"linked_research_ids": [101, 202]},
        "change_summary": "Escalate scored risk and preserve research links",
        "idempotency_key": key,
    }
    update = await client.put(f"/api/v1/far/modes/{mode['id']}", headers=headers, json=payload)
    assert update.status_code == 200, update.text
    updated = update.json()
    assert updated["rpn"] == 300
    assert updated["risk_band"] == "Critical"
    assert updated["metadata_json"]["linked_research_ids"] == [101, 202]
    assert updated["version"] == mode["version"] + 1

    replay = await client.put(f"/api/v1/far/modes/{mode['id']}", headers=headers, json=payload)
    assert replay.status_code == 200, replay.text
    assert replay.json()["version"] == updated["version"]

    stale = await client.put(
        f"/api/v1/far/modes/{mode['id']}",
        headers=headers,
        json={**payload, "idempotency_key": idem("stale-update")},
    )
    assert stale.status_code == 409
    assert stale.json()["detail"]["code"] == "FAR_VERSION_CONFLICT"
