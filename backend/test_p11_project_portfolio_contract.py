from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.database import get_tenant_engine
from app.models import models as legacy_models
from app.pv1 import migration


def _headers(tenant_id: int) -> dict[str, str]:
    return {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}


async def _tenant_session(setup_db, tenant_id: int) -> AsyncSession:
    from app.models.config import Tenant

    async with setup_db[1]() as config_session:
        tenant = await config_session.get(Tenant, tenant_id)
        assert tenant is not None
        db_url = tenant.db_url
    return async_sessionmaker(bind=get_tenant_engine(db_url), class_=AsyncSession, expire_on_commit=False)()


def _assert_story_contract(item: dict) -> None:
    assert isinstance(item.get("id"), str)
    assert isinstance(item.get("display_key"), str)
    assert isinstance(item.get("name"), str)
    assert isinstance(item.get("capabilities"), dict)
    story = item.get("story")
    assert isinstance(story, dict), item
    assert set(story) >= {
        "health", "delivery", "next_milestone", "milestones", "attention",
        "attention_count", "acceptance_criteria", "primary_metric", "latest_update",
        "governance", "architecture", "resources", "freshness", "coverage",
    }
    assert story["health"]["level"] in {"Off track", "At risk", "Unknown", "On track"}
    assert isinstance(story["health"]["reason"], str)
    assert set(story["delivery"]) >= {"percent", "label", "method"}
    assert story["delivery"]["percent"] is None or isinstance(story["delivery"]["percent"], (int, float))
    assert isinstance(story["delivery"]["label"], str)
    assert isinstance(story["delivery"]["method"], str)
    for field in ("milestones", "attention", "acceptance_criteria", "governance", "resources"):
        assert isinstance(story[field], list), field
    assert story["attention_count"] == len(story["attention"])
    assert isinstance(story["architecture"], dict)
    assert isinstance(story["freshness"], dict)
    assert isinstance(story["freshness"].get("source"), str)
    assert isinstance(story["coverage"], dict)


@pytest.mark.asyncio
async def test_p11_v2_portfolio_contract_is_complete_for_native_and_migrated_projects(client, seeded_admin_tenant, setup_db):
    tenant_id = seeded_admin_tenant["tenant_id"]
    session = await _tenant_session(setup_db, tenant_id)
    try:
        legacy = legacy_models.Project(
            name="Migrated Sparse Portfolio Project",
            status="Planning",
            priority="High",
            owner="legacy-owner",
            start_date=datetime(2026, 9, 1, tzinfo=timezone.utc),
            metadata_json=None,
        )
        session.add(legacy)
        await session.commit()
        legacy_id = legacy.id
        await migration.run_legacy_backfill(session, tenant_id=tenant_id)

        native_response = await client.post(
            "/api/v2/projects",
            headers={**_headers(tenant_id), "Idempotency-Key": str(uuid4())},
            json={"name": "Native Empty Story Project", "owner_id": "admin_root", "phase": "Draft"},
        )
        assert native_response.status_code == 200, native_response.text
        native_id = native_response.json()["project"]["id"]

        response = await client.get("/api/v2/projects?limit=200", headers=_headers(tenant_id))
        assert response.status_code == 200, response.text
        payload = response.json()
        items = {item["id"]: item for item in payload["items"]}
        assert str(legacy_id) in items
        assert native_id in items

        for item in (items[str(legacy_id)], items[native_id]):
            _assert_story_contract(item)
            assert item["story"]["governance"] == []
            assert item["story"]["milestones"] == []
            assert item["story"]["acceptance_criteria"] == []
            assert item["story"]["resources"] == []

        assert items[str(legacy_id)]["legacy_project_id"] == legacy_id
        assert items[str(legacy_id)]["legacy_source"] == "legacy.projects"
        assert items[str(legacy_id)]["story"]["coverage"]["architecture"] == "assessment-only"
        assert items[native_id]["story"]["attention"] == []
        assert items[native_id]["story"]["attention_count"] == 0
    finally:
        await session.close()


@pytest.mark.asyncio
async def test_p11_v2_project_detail_contract_is_complete_for_migrated_project(client, seeded_admin_tenant, setup_db):
    tenant_id = seeded_admin_tenant["tenant_id"]
    session = await _tenant_session(setup_db, tenant_id)
    try:
        legacy = legacy_models.Project(name="Migrated Detail Contract", status="Planning", owner="legacy-owner")
        session.add(legacy)
        await session.commit()
        await migration.run_legacy_backfill(session, tenant_id=tenant_id)
        response = await client.get(f"/api/v2/projects/{legacy.id}", headers=_headers(tenant_id))
        assert response.status_code == 200, response.text
        _assert_story_contract(response.json())
    finally:
        await session.close()
