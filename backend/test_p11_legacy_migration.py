from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.tenants import run_alembic_upgrade
from app.database import get_tenant_engine
from app.models import models as legacy_models
from app.pv1 import migration
from app.pv1 import models as pv1_models


async def _session_for(setup_db, seeded_admin_tenant):
    async with setup_db[1]() as config_session:
        tenant = await config_session.get(
            __import__("app.models.config", fromlist=["Tenant"]).Tenant,
            seeded_admin_tenant["tenant_id"],
        )
        url = tenant.db_url
    factory = async_sessionmaker(bind=get_tenant_engine(url), class_=AsyncSession, expire_on_commit=False)
    return factory()


def _headers(tenant_id: int, command_id: str | None = None):
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    if command_id:
        headers["Idempotency-Key"] = command_id
    return headers


@pytest.mark.asyncio
async def test_p11_backfill_preserves_identity_dates_statuses_tasks_and_unverified_history(setup_db, seeded_admin_tenant):
    session = await _session_for(setup_db, seeded_admin_tenant)
    try:
        parent = legacy_models.Project(
            name="Legacy Delivered",
            description="Original description",
            objective="Original objective",
            status="Completed",
            priority="Highest",
            start_date=datetime(2026, 1, 2, 14, 30, tzinfo=timezone.utc),
            end_date=datetime(2026, 2, 3, 9, 0, tzinfo=timezone.utc),
            owner="legacy-owner",
            expected_outcomes=["Acceptance evidence recorded"],
            budget=1250.0,
            team_members=["legacy-owner", "reviewer"],
            metadata_json={
                "project_outcome_realization_v1": {
                    "result": "Realized",
                    "value": 200,
                    "observed_at": "2026-02-03T09:00:00Z",
                },
                "legacy_unknown": {"preserve": True},
            },
        )
        child = legacy_models.Project(
            name="Legacy Child",
            status="Planning",
            parent_project_id=None,
            owner="legacy-owner",
        )
        session.add_all([parent, child])
        await session.flush()
        child.parent_project_id = parent.id
        done = legacy_models.ProjectTask(
            project_id=parent.id,
            name="Done legacy task",
            status="Completed",
            progress=73,
            start_date=datetime(2026, 1, 3, tzinfo=timezone.utc),
            end_date=datetime(2026, 1, 5, tzinfo=timezone.utc),
            owner="legacy-owner",
            dependencies_json=[],
        )
        follow_up = legacy_models.ProjectTask(
            project_id=parent.id,
            name="Follow-up",
            status="In Progress",
            progress=25,
            parent_task_id=None,
            dependencies_json=[],
            metadata_json={"custom_key": "retain"},
        )
        session.add_all([done, follow_up])
        await session.commit()
        legacy_id = parent.id
        child_id = child.id

        result = await migration.run_legacy_backfill(session, tenant_id=seeded_admin_tenant["tenant_id"])
        assert result["status"] == "Completed"
        assert result["source_counts"]["projects"] == 2
        assert result["source_counts"]["tasks"] == 2
        canonical = await session.get(pv1_models.PV1Project, str(legacy_id))
        assert canonical is not None
        assert canonical.legacy_project_id == legacy_id
        assert canonical.phase == "Delivered"
        assert canonical.run_state == "Active"
        assert canonical.priority == "Critical"
        assert canonical.start_date.isoformat() == "2026-01-02"
        assert canonical.target_date.isoformat() == "2026-02-03"
        assert canonical.outcome_result == "Unassessed"
        assert canonical.metadata_json["legacy_unknown"] == {"preserve": True}
        assert canonical.metadata_json["pv1_legacy_outcome_history"][0]["quality"] == "Unverified"
        assert canonical.metadata_json["pv1_legacy_outcome_history"][0]["legacy_result"] == "Reported legacy result"
        assert canonical.parent_project_id is None
        child_canonical = await session.get(pv1_models.PV1Project, str(child_id))
        assert child_canonical.parent_project_id == str(legacy_id)
        tasks = list((await session.scalars(select(pv1_models.PV1Task).where(pv1_models.PV1Task.project_id == str(legacy_id)))).all())
        assert {task.legacy_task_id for task in tasks} == {done.id, follow_up.id}
        assert next(task for task in tasks if task.legacy_task_id == done.id).status == "Done"

        shadow = await migration.shadow_compare_project(session, tenant_id=seeded_admin_tenant["tenant_id"], project_id=legacy_id)
        assert shadow["match"] is True, shadow
        legacy_response = await migration.canonical_project_legacy_response(session, canonical)
        assert legacy_response["start_date"].isoformat() == "2026-01-02T14:30:00+00:00"
        assert legacy_response["expected_outcomes"] == ["Acceptance evidence recorded"]
        assert legacy_response["budget"] == 1250.0
        follow_up_response = next(item for item in legacy_response["tasks"] if item["id"] == follow_up.id)
        assert follow_up_response["metadata_json"]["custom_key"] == "retain"
        repeated = await migration.run_legacy_backfill(session, tenant_id=seeded_admin_tenant["tenant_id"])
        assert repeated["run_id"] == result["run_id"]
        assert await session.scalar(select(func.count()).select_from(pv1_models.PV1Project).where(pv1_models.PV1Project.legacy_project_id == legacy_id)) == 1
        assert await session.scalar(select(func.count()).select_from(pv1_models.PV1Task).where(pv1_models.PV1Task.legacy_task_id == done.id)) == 1
    finally:
        await session.close()


@pytest.mark.asyncio
async def test_p11_unknown_status_is_readable_rejected_and_blocks_cutover(setup_db, seeded_admin_tenant):
    session = await _session_for(setup_db, seeded_admin_tenant)
    try:
        legacy = legacy_models.Project(name="Unknown legacy status", status="Waiting for oracle", priority="Urgent")
        session.add(legacy)
        await session.commit()
        result = await migration.run_legacy_backfill(session, tenant_id=seeded_admin_tenant["tenant_id"])
        assert result["status"] == "CompletedWithRejections"
        assert result["rejected_counts"].get("projects") == 1
        canonical = await session.get(pv1_models.PV1Project, str(legacy.id))
        assert canonical.phase == "Unmapped legacy status"
        with pytest.raises(migration.MigrationBlocked):
            await migration.set_tenant_cutover(
                session,
                tenant_id=seeded_admin_tenant["tenant_id"],
                state="cutover",
                actor_id="admin_root",
                migration_run_id=result["run_id"],
            )
    finally:
        await session.close()


@pytest.mark.asyncio
async def test_p11_interrupted_backfill_resumes_without_duplicate_rows(setup_db, seeded_admin_tenant):
    session = await _session_for(setup_db, seeded_admin_tenant)
    try:
        session.add_all([
            legacy_models.Project(name="Resume one", status="Planning"),
            legacy_models.Project(name="Resume two", status="Planning"),
        ])
        await session.commit()
        with pytest.raises(migration.MigrationInterrupted):
            await migration.run_legacy_backfill(session, tenant_id=seeded_admin_tenant["tenant_id"], fail_after=1)
        interrupted = await session.scalar(select(pv1_models.PV1MigrationRun).where(pv1_models.PV1MigrationRun.tenant_id == seeded_admin_tenant["tenant_id"]))
        assert interrupted.status == "Interrupted"
        resumed = await migration.run_legacy_backfill(session, tenant_id=seeded_admin_tenant["tenant_id"])
        assert resumed["status"] == "Completed"
        assert await session.scalar(select(func.count()).select_from(pv1_models.PV1MigrationRow).where(pv1_models.PV1MigrationRow.tenant_id == seeded_admin_tenant["tenant_id"], pv1_models.PV1MigrationRow.source_kind == "project")) == 2
        assert await session.scalar(select(func.count()).select_from(pv1_models.PV1Project).where(pv1_models.PV1Project.tenant_id == seeded_admin_tenant["tenant_id"], pv1_models.PV1Project.legacy_project_id.is_not(None))) == 2
    finally:
        await session.close()


@pytest.mark.asyncio
async def test_p11_v1_route_reads_and_writes_canonical_after_cutover(client, setup_db, seeded_admin_tenant):
    tenant_id = seeded_admin_tenant["tenant_id"]
    session = await _session_for(setup_db, seeded_admin_tenant)
    try:
        legacy = legacy_models.Project(name="Only canonical writer", status="Planning", owner="admin_root")
        session.add(legacy)
        await session.flush()
        legacy_task = legacy_models.ProjectTask(project_id=legacy.id, name="Only legacy task", status="To Do", progress=10)
        session.add(legacy_task)
        await session.commit()
        result = await migration.run_legacy_backfill(session, tenant_id=tenant_id)
        await migration.set_tenant_cutover(session, tenant_id=tenant_id, state="cutover", actor_id="admin_root", migration_run_id=result["run_id"])
        legacy_id = legacy.id
        legacy_task_id = legacy_task.id
    finally:
        await session.close()

    response = await client.put(
        f"/api/v1/projects/{legacy_id}",
        headers=_headers(tenant_id),
        json={"name": "Canonical writer name", "tasks": [{"id": legacy_task_id, "name": "Canonical task name", "status": "To Do", "progress": 25}]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Canonical writer name"
    assert response.json()["tasks"][0]["name"] == "Canonical task name"

    check = await _session_for(setup_db, seeded_admin_tenant)
    try:
        old = await check.get(legacy_models.Project, legacy_id)
        old_task = await check.get(legacy_models.ProjectTask, legacy_task_id)
        canonical = await check.get(pv1_models.PV1Project, str(legacy_id))
        canonical_task = await check.get(pv1_models.PV1Task, str(legacy_task_id))
        assert old.name == "Only canonical writer"
        assert old_task.name == "Only legacy task"
        assert canonical.name == "Canonical writer name"
        assert canonical_task.title == "Canonical task name"
        assert await check.scalar(select(func.count()).select_from(pv1_models.PV1Event).where(pv1_models.PV1Event.project_id == str(legacy_id))) >= 1
    finally:
        await check.close()
