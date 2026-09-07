"""PV1 legacy Project/Task migration and source-authority boundary.

The migration is intentionally an application service, not startup behavior.
Callers must provide a tenant session that is already bound to an isolated or
explicitly approved tenant database. The service never deletes legacy rows and
never treats a legacy result as verified PV1 outcome evidence.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import models as legacy_models
from . import models


MIGRATION_KEY = "legacy-projects-v1"
ADAPTER_VERSION = "pv1-v1-adapter-1"
CUTOVER_STATES = {"shadow", "cutover", "read_only"}
TERMINAL_RUN_STATES = {"Completed", "CompletedWithRejections"}


class MigrationInterrupted(RuntimeError):
    """Raised only after the committed checkpoint is durable."""


class MigrationBlocked(RuntimeError):
    """Raised when source drift or an identity collision prevents safe writes."""


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4()}"


def _json_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    return value


def _date_value(value: datetime | None) -> date | None:
    return value.date() if value is not None else None


def _compat_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _explicit_point_date(task: legacy_models.ProjectTask) -> date | None:
    raw = (task.metadata_json or {}).get("point_date")
    if not raw:
        return None
    try:
        return date.fromisoformat(str(raw)[:10])
    except ValueError:
        return None


def _hash_payload(value: Any) -> str:
    encoded = json.dumps(_json_value(value), sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _project_destination_id(source_id: int) -> str:
    # Existing decimal IDs remain exact and addressable through /api/v2.
    return str(source_id)


def _task_destination_id(source_id: int) -> str:
    return str(source_id)


def legacy_project_status(value: str | None, metadata: dict[str, Any] | None = None) -> tuple[str, str, str | None]:
    """Return phase, run state, and a non-authoritative preservation note."""

    raw = (value or "").strip()
    metadata = metadata or {}
    if raw == "Not Started":
        return "Proposed", "Active", None
    if raw == "Planning":
        return "Planning", "Active", None
    if raw == "In Progress":
        return "Executing", "Active", None
    if raw == "Completed":
        return "Delivered", "Active", "Legacy acceptance not verified"
    if raw == "Paused":
        previous = str(metadata.get("legacy_previous_status") or metadata.get("previous_status") or "Planning")
        phase, _, _ = legacy_project_status(previous, {})
        return phase if phase != "Unmapped legacy status" else "Planning", "Paused", "Legacy project was paused"
    if raw == "Cancelled":
        previous = str(metadata.get("legacy_previous_status") or metadata.get("previous_status") or "Planning")
        phase, _, _ = legacy_project_status(previous, {})
        return phase if phase != "Unmapped legacy status" else "Planning", "Cancelled", "Legacy cancellation preserved"
    if raw == "Blocked":
        return "Executing", "Active", "Legacy blocker requires review"
    return "Unmapped legacy status", "Active", f"Unmapped legacy status: {raw or '(blank)'}"


def legacy_task_status(value: str | None) -> tuple[str, str | None]:
    raw = (value or "").strip()
    if raw in {"Done", "Completed"}:
        return "Done", None
    if raw in {"Review", "Blocked", "In Progress", "To Do", "Cancelled"}:
        return raw, None
    return "Unmapped legacy status", f"Unmapped legacy task status: {raw or '(blank)'}"


def legacy_priority(value: str | None) -> tuple[str, str | None]:
    raw = (value or "Medium").strip()
    if raw == "Highest":
        return "Critical", "Highest mapped to Critical"
    if raw in {"Critical", "High", "Medium", "Low"}:
        return raw, None
    # Keep the canonical field safe while preserving the unknown source value.
    return "Medium", f"Unmapped legacy priority: {raw}"


def _project_snapshot(project: legacy_models.Project, tasks: list[legacy_models.ProjectTask]) -> dict[str, Any]:
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "problem_statement": project.problem_statement,
        "objective": project.objective,
        "type": project.type,
        "status": project.status,
        "priority": project.priority,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "completed_at": project.completed_at,
        "owner": project.owner,
        "owners": project.owners or [],
        "team_members": project.team_members or [],
        "parent_project_id": project.parent_project_id,
        "expected_outcomes": project.expected_outcomes or [],
        "key_functions": project.key_functions or [],
        "beneficiaries": project.beneficiaries or [],
        "roi_types": project.roi_types or [],
        "roi_defense_line": project.roi_defense_line,
        "roi_defense_line_desc": project.roi_defense_line_desc,
        "man_hours_saved": project.man_hours_saved,
        "man_hours_saved_math": project.man_hours_saved_math,
        "man_hours_saved_desc": project.man_hours_saved_desc,
        "stoploss_minutes_saved": project.stoploss_minutes_saved,
        "stoploss_minutes_saved_math": project.stoploss_minutes_saved_math,
        "stoploss_minutes_saved_desc": project.stoploss_minutes_saved_desc,
        "wafers_gained": project.wafers_gained,
        "wafers_gained_math": project.wafers_gained_math,
        "wafers_gained_desc": project.wafers_gained_desc,
        "appendix_json": project.appendix_json or {},
        "order_index": project.order_index,
        "budget": project.budget,
        "currency": project.currency,
        "is_deleted": project.is_deleted,
        "metadata_json": project.metadata_json or {},
        "tasks": [
            {
                "id": task.id,
                "parent_task_id": task.parent_task_id,
                "name": task.name,
                "description": task.description,
                "status": task.status,
                "progress": task.progress,
                "start_date": task.start_date,
                "end_date": task.end_date,
                "actual_start_date": task.actual_start_date,
                "actual_end_date": task.actual_end_date,
                "owner": task.owner,
                "dependencies_json": task.dependencies_json or [],
                "assigned_objects": task.assigned_objects or [],
                "estimate_hours": task.estimate_hours,
                "metadata_json": task.metadata_json or {},
            }
            for task in tasks
        ],
    }


def _source_row_hash(snapshot: dict[str, Any]) -> str:
    return _hash_payload(snapshot)


def _source_hash(projects: list[legacy_models.Project], tasks_by_project: dict[int, list[legacy_models.ProjectTask]]) -> str:
    return _hash_payload([
        _project_snapshot(project, tasks_by_project.get(project.id, []))
        for project in projects
    ])


def _legacy_metadata(project: legacy_models.Project, source_hash: str, note: str | None) -> dict[str, Any]:
    metadata = dict(project.metadata_json or {})
    payload = dict(metadata.get("pv1_legacy_migration_v1") or {})
    payload.update({
        "read_only": True,
        "source": "legacy.projects",
        "source_id": project.id,
        "source_hash": source_hash,
        "original_status": project.status,
        "original_priority": project.priority,
        "original_timestamps": {
            "start_date": _json_value(project.start_date),
            "end_date": _json_value(project.end_date),
            "completed_at": _json_value(project.completed_at),
        },
    })
    if note:
        payload["preservation_note"] = note
    metadata["pv1_legacy_migration_v1"] = payload
    return metadata


def _legacy_task_metadata(task: legacy_models.ProjectTask, source_hash: str, note: str | None) -> dict[str, Any]:
    metadata = dict(task.metadata_json or {})
    payload = dict(metadata.get("pv1_legacy_migration_v1") or {})
    payload.update({
        "read_only": True,
        "source": "legacy.project_tasks",
        "source_id": task.id,
        "source_hash": source_hash,
        "original_status": task.status,
        "original_timestamps": {
            "start_date": _json_value(task.start_date),
            "end_date": _json_value(task.end_date),
            "actual_start_date": _json_value(task.actual_start_date),
            "actual_end_date": _json_value(task.actual_end_date),
        },
    })
    if note:
        payload["preservation_note"] = note
    metadata["pv1_legacy_migration_v1"] = payload
    return metadata


async def get_tenant_cutover(session: AsyncSession, tenant_id: int) -> models.PV1TenantCutover | None:
    return await session.scalar(select(models.PV1TenantCutover).where(models.PV1TenantCutover.tenant_id == tenant_id))


async def set_tenant_cutover(
    session: AsyncSession,
    *,
    tenant_id: int,
    state: str,
    actor_id: str,
    migration_run_id: str | None = None,
) -> models.PV1TenantCutover:
    if state not in CUTOVER_STATES:
        raise ValueError(f"Unsupported cutover state: {state}")
    if state == "cutover":
        if not migration_run_id:
            raise MigrationBlocked("Cutover requires a completed migration run.")
        run = await session.get(models.PV1MigrationRun, migration_run_id)
        if not run or run.tenant_id != tenant_id or run.status != "Completed":
            raise MigrationBlocked("Cutover requires a completed run with no rejected rows.")
    record = await get_tenant_cutover(session, tenant_id)
    if record is None:
        record = models.PV1TenantCutover(tenant_id=tenant_id, state=state, migration_run_id=migration_run_id, adapter_version=ADAPTER_VERSION, changed_by=actor_id, rollback_mode="read_only")
        session.add(record)
    else:
        record.state = state
        record.migration_run_id = migration_run_id or record.migration_run_id
        record.adapter_version = ADAPTER_VERSION
        record.changed_by = actor_id
        record.changed_at = datetime.now(timezone.utc)
        record.rollback_mode = "read_only"
    await session.commit()
    await session.refresh(record)
    return record


async def _record_row(
    session: AsyncSession,
    *,
    run: models.PV1MigrationRun,
    tenant_id: int,
    source_kind: str,
    source_id: str,
    source_hash: str,
    destination_id: str | None,
    state: str,
    reason: str | None,
    snapshot: dict[str, Any],
) -> models.PV1MigrationRow:
    row = await session.scalar(select(models.PV1MigrationRow).where(
        models.PV1MigrationRow.tenant_id == tenant_id,
        models.PV1MigrationRow.source_kind == source_kind,
        models.PV1MigrationRow.source_id == source_id,
    ))
    if row is None:
        row = models.PV1MigrationRow(
            id=_new_id("migration-row"),
            run_id=run.id,
            tenant_id=tenant_id,
            source_kind=source_kind,
            source_id=source_id,
            source_hash=source_hash,
            destination_id=destination_id,
            state=state,
            reason=reason,
            source_snapshot=_json_value(snapshot),
        )
        session.add(row)
    else:
        row.run_id = run.id
        row.source_hash = source_hash
        row.destination_id = destination_id
        row.state = state
        row.reason = reason
        row.source_snapshot = _json_value(snapshot)
        row.processed_at = datetime.now(timezone.utc)
    return row


def _increment(mapping: dict[str, int], key: str, amount: int = 1) -> None:
    mapping[key] = int(mapping.get(key, 0)) + amount


async def _checkpoint(session: AsyncSession, run: models.PV1MigrationRun, checkpoint: dict[str, Any]) -> None:
    run.checkpoint = checkpoint
    await session.commit()
    await session.refresh(run)


async def _upsert_legacy_outcome_history(session: AsyncSession, *, project: models.PV1Project, source: legacy_models.Project, actor_id: str) -> None:
    raw = (source.metadata_json or {}).get("project_outcome_realization_v1")
    if not isinstance(raw, dict):
        return
    metadata = dict(project.metadata_json or {})
    history = list(metadata.get("pv1_legacy_outcome_history") or [])
    marker = _hash_payload(raw)
    if any(item.get("source_hash") == marker for item in history if isinstance(item, dict)):
        return
    history.append({
        "source": "legacy.project_outcome_realization_v1",
        "source_hash": marker,
        "quality": "Unverified",
        "status": "Historical only",
        "legacy_result": "Reported legacy result" if str(raw.get("result") or raw.get("status") or "").lower() == "realized" else None,
        "payload": _json_value(raw),
    })
    metadata["pv1_legacy_outcome_history"] = history
    project.metadata_json = metadata
    project.updated_by = actor_id


async def _migrate_project(
    session: AsyncSession,
    *,
    project: legacy_models.Project,
    tasks: list[legacy_models.ProjectTask],
    tenant_id: int,
    actor_id: str,
    source_hash: str,
    migrated: dict[str, int],
    rejected: dict[str, int],
) -> tuple[str, dict[str, Any], list[str]]:
    snapshot = _project_snapshot(project, tasks)
    row_hash = _source_row_hash(snapshot)
    destination_id = _project_destination_id(project.id)
    phase, run_state, status_note = legacy_project_status(project.status, project.metadata_json)
    priority, priority_note = legacy_priority(project.priority)
    notes = [note for note in (status_note, priority_note) if note]
    existing = await session.get(models.PV1Project, destination_id)
    if existing is not None and existing.legacy_project_id != project.id:
        reason = f"Project identity collision at PV1 id {destination_id}."
        _increment(rejected, "identity_collision")
        return "rejected", snapshot, [reason]

    if existing is None:
        metadata = _legacy_metadata(project, row_hash, "; ".join(notes) if notes else None)
        existing = models.PV1Project(
            id=destination_id,
            tenant_id=tenant_id,
            legacy_project_id=project.id,
            display_key=f"PRJ-{project.id:06d}",
            name=project.name or f"Legacy Project {project.id}",
            objective=project.objective,
            problem=project.problem_statement or project.description,
            owner_id=project.owner or f"legacy:unresolved:{project.id}",
            template_key=project.type,
            phase=phase,
            run_state=run_state,
            priority=priority,
            start_date=_date_value(project.start_date),
            target_date=_date_value(project.end_date),
            timezone="UTC",
            calendar_id="legacy-seven-day",
            calendar_revision=1,
            visibility="Team",
            # Legacy Realized is retained in the source-labelled history
            # below; it is never promoted to PV1 Realized by backfill.
            outcome_result="Unassessed",
            outcome_currency=project.currency,
            cancellation_reason=(project.metadata_json or {}).get("cancellation_reason"),
            pause_reason=(project.metadata_json or {}).get("pause_reason"),
            archived_at=project.updated_at if project.is_deleted else None,
            metadata_json=metadata,
            created_at=project.created_at,
            created_by=project.created_by_user_id or actor_id,
            updated_at=project.updated_at,
            updated_by=project.created_by_user_id or actor_id,
        )
        session.add(existing)
        await session.flush()
        _increment(migrated, "projects")
    else:
        # A completed row is never overwritten by a later source read. Source
        # drift is reported and requires an explicit reconciliation decision.
        previous = (existing.metadata_json or {}).get("pv1_legacy_migration_v1", {})
        if previous.get("source_hash") not in {None, row_hash}:
            reason = f"Legacy project {project.id} changed after its PV1 backfill."
            _increment(rejected, "source_changed")
            return "source_changed", snapshot, [reason]
        _increment(migrated, "projects_skipped")

    member_user = project.owner or f"legacy:unresolved:{project.id}"
    member = await session.scalar(select(models.PV1ProjectMember).where(
        models.PV1ProjectMember.tenant_id == tenant_id,
        models.PV1ProjectMember.project_id == destination_id,
        models.PV1ProjectMember.user_id == member_user,
    ))
    if member is None:
        session.add(models.PV1ProjectMember(
            id=_new_id("legacy-member"),
            tenant_id=tenant_id,
            project_id=destination_id,
            user_id=member_user,
            role="Owner",
            capabilities={"legacy_source": True},
            created_by=actor_id,
            updated_by=actor_id,
        ))
        _increment(migrated, "project_members")

    calendar = await session.scalar(select(models.PV1ProjectCalendar).where(
        models.PV1ProjectCalendar.tenant_id == tenant_id,
        models.PV1ProjectCalendar.project_id == destination_id,
    ))
    if calendar is None:
        session.add(models.PV1ProjectCalendar(
            id=_new_id("legacy-calendar"),
            tenant_id=tenant_id,
            project_id=destination_id,
            timezone="UTC",
            working_weekdays=[0, 1, 2, 3, 4, 5, 6],
            exceptions={},
            revision=1,
            created_by=actor_id,
            updated_by=actor_id,
        ))
        _increment(migrated, "calendars")

    await _upsert_legacy_outcome_history(session, project=existing, source=project, actor_id=actor_id)
    return "migrated", snapshot, notes


async def _migrate_task(
    session: AsyncSession,
    *,
    task: legacy_models.ProjectTask,
    tenant_id: int,
    actor_id: str,
    project_id: str,
    source_hash: str,
    migrated: dict[str, int],
    rejected: dict[str, int],
    task_ids: set[int],
) -> tuple[str, dict[str, Any], list[str]]:
    snapshot = _json_value({
        "id": task.id,
        "project_id": task.project_id,
        "parent_task_id": task.parent_task_id,
        "name": task.name,
        "description": task.description,
        "start_date": task.start_date,
        "end_date": task.end_date,
        "actual_start_date": task.actual_start_date,
        "actual_end_date": task.actual_end_date,
        "progress": task.progress,
        "status": task.status,
        "owner": task.owner,
        "assigned_objects": task.assigned_objects or [],
        "dependencies_json": task.dependencies_json or [],
        "estimate_hours": task.estimate_hours,
        "metadata_json": task.metadata_json or {},
    })
    row_hash = _source_row_hash(snapshot)
    destination_id = _task_destination_id(task.id)
    status_value, status_note = legacy_task_status(task.status)
    notes = [status_note] if status_note else []
    raw_kind = str((task.metadata_json or {}).get("kind") or "").lower()
    kind = "Milestone" if raw_kind == "milestone" and (task.metadata_json or {}).get("point_date") else "Task"
    if raw_kind == "milestone" and kind == "Task":
        notes.append("Legacy milestone lacked an explicit point_date; retained as a Task.")
    priority, priority_note = legacy_priority((task.metadata_json or {}).get("priority") or "Medium")
    if priority_note:
        notes.append(priority_note)
    progress = task.progress if isinstance(task.progress, int) and 0 <= task.progress <= 100 else max(0, min(100, int(task.progress or 0)))
    if progress != task.progress:
        notes.append("Legacy progress was outside 0..100 and was bounded; original value remains in the source snapshot.")

    existing = await session.get(models.PV1Task, destination_id)
    if existing is not None and existing.legacy_task_id != task.id:
        _increment(rejected, "identity_collision")
        return "rejected", snapshot, [f"Task identity collision at PV1 id {destination_id}."]
    if existing is None:
        start = _date_value(task.start_date)
        end = _date_value(task.end_date)
        duration = (end - start).days + 1 if start and end and end >= start else None
        existing = models.PV1Task(
            id=destination_id,
            tenant_id=tenant_id,
            project_id=project_id,
            legacy_task_id=task.id,
            kind=kind,
            title=task.name or f"Legacy Task {task.id}",
            description=task.description,
            owner_id=task.owner,
            status=status_value,
            priority=priority,
            progress=progress,
            start_date=start if kind == "Task" else None,
            end_date=end if kind == "Task" else None,
            point_date=_explicit_point_date(task) if kind == "Milestone" else None,
            milestone_anchor="finish" if kind == "Milestone" else "start",
            duration_workdays=0 if kind == "Milestone" else duration,
            estimate_hours=task.estimate_hours,
            actual_started_at=task.actual_start_date,
            finished_at=task.actual_end_date,
            order_key=(task.id or 0) * 1024,
            tags=list(task.assigned_objects or []),
            revision=1,
            created_at=task.created_at,
            created_by=task.created_by_user_id or actor_id,
            updated_at=task.updated_at,
            updated_by=task.created_by_user_id or actor_id,
        )
        # A legacy parent is linked in a second pass after all task identities
        # have been validated, so an invalid/cyclic parent cannot be authoritative.
        session.add(existing)
        await session.flush()
        _increment(migrated, "tasks")
    else:
        _increment(migrated, "tasks_skipped")
    if task.parent_task_id and task.parent_task_id in task_ids:
        existing.parent_task_id = _task_destination_id(task.parent_task_id)
    elif task.parent_task_id:
        notes.append(f"Unresolved legacy parent task reference: {task.parent_task_id}")
        _increment(rejected, "unresolved_parent")
    return "migrated", snapshot, notes


async def _migrate_dependencies(
    session: AsyncSession,
    *,
    run: models.PV1MigrationRun,
    task: legacy_models.ProjectTask,
    tenant_id: int,
    actor_id: str,
    project_id: str,
    task_ids: set[int],
    rejected: dict[str, int],
    migrated: dict[str, int],
) -> None:
    raw_dependencies = task.dependencies_json or []
    if not isinstance(raw_dependencies, list):
        _increment(rejected, "malformed_dependencies")
        return
    for index, raw in enumerate(raw_dependencies):
        if isinstance(raw, dict):
            predecessor = raw.get("predecessor_id", raw.get("task_id", raw.get("id")))
            dependency_type = str(raw.get("type", raw.get("dependency_type", "FS"))).upper()
            lag_days = raw.get("lag_days", raw.get("lag", 0))
        else:
            predecessor = raw
            dependency_type = "FS"
            lag_days = 0
        try:
            predecessor_int = int(predecessor)
            lag = int(lag_days)
        except (TypeError, ValueError):
            _increment(rejected, "malformed_dependencies")
            continue
        if predecessor_int not in task_ids or dependency_type not in {"FS", "SS", "FF", "SF"} or not -365 <= lag <= 365:
            _increment(rejected, "unresolved_dependencies")
            continue
        source_id = f"{predecessor_int}->{task.id}:{index}"
        existing = await session.scalar(select(models.PV1MigrationRow).where(
            models.PV1MigrationRow.tenant_id == tenant_id,
            models.PV1MigrationRow.source_kind == "dependency",
            models.PV1MigrationRow.source_id == source_id,
        ))
        dependency_id = f"legacy-dependency-{predecessor_int}-{task.id}-{index}"
        if existing and existing.state == "migrated":
            continue
        edge = await session.scalar(select(models.PV1Dependency).where(models.PV1Dependency.id == dependency_id))
        if edge is None:
            session.add(models.PV1Dependency(
                id=dependency_id,
                tenant_id=tenant_id,
                project_id=project_id,
                predecessor_id=_task_destination_id(predecessor_int),
                successor_id=_task_destination_id(task.id),
                dependency_type=dependency_type,
                lag_days=lag,
                active=True,
                revision=1,
                created_by=actor_id,
                updated_by=actor_id,
            ))
            _increment(migrated, "dependencies")
        await _record_row(
            session,
            run=run,
            tenant_id=tenant_id,
            source_kind="dependency",
            source_id=source_id,
            source_hash=_hash_payload(raw),
            destination_id=dependency_id,
            state="migrated",
            reason=None,
            snapshot={"raw": raw, "task_id": task.id},
        )


async def run_legacy_backfill(
    session: AsyncSession,
    *,
    tenant_id: int,
    actor_id: str = "pv1-migration",
    fail_after: int | None = None,
    cutover: bool = False,
) -> dict[str, Any]:
    """Backfill one tenant with committed row checkpoints and idempotency."""

    projects_result = await session.execute(select(legacy_models.Project).order_by(legacy_models.Project.id))
    projects = list(projects_result.scalars())
    task_result = await session.execute(select(legacy_models.ProjectTask).order_by(legacy_models.ProjectTask.project_id, legacy_models.ProjectTask.id))
    all_tasks = list(task_result.scalars())
    tasks_by_project: dict[int, list[legacy_models.ProjectTask]] = {}
    for task in all_tasks:
        tasks_by_project.setdefault(task.project_id, []).append(task)
    task_ids_by_project = {
        project_id: {task.id for task in tasks}
        for project_id, tasks in tasks_by_project.items()
    }
    source_hash = _source_hash(projects, tasks_by_project)
    source_counts = {"projects": len(projects), "tasks": len(all_tasks), "dependencies": sum(len(task.dependencies_json or []) for task in all_tasks)}

    run = await session.scalar(select(models.PV1MigrationRun).where(
        models.PV1MigrationRun.tenant_id == tenant_id,
        models.PV1MigrationRun.migration_key == MIGRATION_KEY,
        models.PV1MigrationRun.source_hash == source_hash,
    ))
    if run is not None and run.status in TERMINAL_RUN_STATES:
        if cutover and run.status == "Completed":
            await set_tenant_cutover(session, tenant_id=tenant_id, state="cutover", actor_id=actor_id, migration_run_id=run.id)
        return migration_run_summary(run)
    if run is None:
        run = models.PV1MigrationRun(
            id=_new_id("migration-run"),
            tenant_id=tenant_id,
            migration_key=MIGRATION_KEY,
            source_hash=source_hash,
            status="Running",
            source_counts=source_counts,
            migrated_counts={},
            rejected_counts={},
            checkpoint={"projects": None, "tasks": None, "processed_rows": 0},
            source_snapshot={"source": "legacy.projects + legacy.project_tasks", "source_hash": source_hash},
            rollback_mapping={"legacy_project_id": "pv1_projects.id", "legacy_task_id": "pv1_tasks.id", "schema_down": "prohibited_if_pv1_data_would_be_lost"},
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)
    elif run.status == "Blocked":
        raise MigrationBlocked(run.error or "Migration run is blocked.")

    migrated = dict(run.migrated_counts or {})
    rejected = dict(run.rejected_counts or {})
    checkpoint = dict(run.checkpoint or {})
    processed = int(checkpoint.get("processed_rows") or 0)
    async def process_row(kind: str, source_id: str, row_hash: str, snapshot: dict[str, Any], destination_id: str | None, state: str, reason: str | None) -> None:
        nonlocal processed
        existing_row = await session.scalar(select(models.PV1MigrationRow).where(
            models.PV1MigrationRow.tenant_id == tenant_id,
            models.PV1MigrationRow.source_kind == kind,
            models.PV1MigrationRow.source_id == source_id,
        ))
        if existing_row and existing_row.state == "migrated" and existing_row.source_hash == row_hash:
            return
        await _record_row(session, run=run, tenant_id=tenant_id, source_kind=kind, source_id=source_id, source_hash=row_hash, destination_id=destination_id, state=state, reason=reason, snapshot=snapshot)
        processed += 1
        _checkpoint_value = {"projects": checkpoint.get("projects"), "tasks": checkpoint.get("tasks"), "processed_rows": processed}
        if kind == "project":
            _checkpoint_value["projects"] = source_id
        if kind == "task":
            _checkpoint_value["tasks"] = source_id
        run.migrated_counts = migrated
        run.rejected_counts = rejected
        await session.flush()
        await _checkpoint(session, run, _checkpoint_value)
        checkpoint.update(_checkpoint_value)
        if fail_after is not None and processed >= fail_after:
            run.status = "Interrupted"
            run.error = "Interrupted after requested deterministic checkpoint."
            await _checkpoint(session, run, checkpoint)
            raise MigrationInterrupted(run.error)

    for project in projects:
        tasks = tasks_by_project.get(project.id, [])
        snapshot = _project_snapshot(project, tasks)
        row_hash = _source_row_hash(snapshot)
        prior = await session.scalar(select(models.PV1MigrationRow).where(
            models.PV1MigrationRow.tenant_id == tenant_id,
            models.PV1MigrationRow.source_kind == "project",
            models.PV1MigrationRow.source_id == str(project.id),
        ))
        if prior and prior.state == "migrated" and prior.source_hash == row_hash:
            continue
        state, project_snapshot, notes = await _migrate_project(
            session,
            project=project,
            tasks=tasks,
            tenant_id=tenant_id,
            actor_id=actor_id,
            source_hash=source_hash,
            migrated=migrated,
            rejected=rejected,
        )
        reason = "; ".join(notes) if notes else None
        if state in {"rejected", "source_changed"}:
            _increment(rejected, "projects")
        if any(note.startswith("Unmapped legacy status") for note in notes):
            _increment(rejected, "projects")
            _increment(rejected, "unmapped_status")
        if any(note.startswith("Unmapped legacy priority") for note in notes):
            _increment(rejected, "unmapped_priority")
        await process_row("project", str(project.id), row_hash, project_snapshot, _project_destination_id(project.id) if state == "migrated" else None, "migrated" if state == "migrated" else state, reason)

    project_ids = {project.id for project in projects}
    parent_map = {project.id: project.parent_project_id for project in projects}
    for project in projects:
        if not project.parent_project_id:
            continue
        parent_id = project.parent_project_id
        invalid = parent_id not in project_ids or parent_id == project.id
        seen: set[int] = set()
        current: int | None = project.id
        while not invalid and current is not None:
            if current in seen:
                invalid = True
                break
            seen.add(current)
            current = parent_map.get(current)
        canonical = await session.get(models.PV1Project, _project_destination_id(project.id))
        if invalid or canonical is None:
            _increment(rejected, "unresolved_or_cyclic_parent")
            migration_row = await session.scalar(select(models.PV1MigrationRow).where(
                models.PV1MigrationRow.tenant_id == tenant_id,
                models.PV1MigrationRow.source_kind == "project",
                models.PV1MigrationRow.source_id == str(project.id),
            ))
            if migration_row:
                migration_row.reason = f"Legacy parent reference {parent_id} is unresolved or cyclic; canonical parent remains null."
            continue
        canonical.parent_project_id = _project_destination_id(parent_id)

    for task in all_tasks:
        project_id = _project_destination_id(task.project_id)
        if not await session.get(models.PV1Project, project_id):
            _increment(rejected, "task_without_project")
            await process_row("task", str(task.id), _source_row_hash(_json_value({"id": task.id, "project_id": task.project_id})), _json_value({"id": task.id, "project_id": task.project_id}), None, "rejected", f"Project {task.project_id} was not migrated.")
            continue
        snapshot = _json_value({
            "id": task.id, "project_id": task.project_id, "parent_task_id": task.parent_task_id,
            "name": task.name, "description": task.description, "start_date": task.start_date,
            "end_date": task.end_date, "actual_start_date": task.actual_start_date,
            "actual_end_date": task.actual_end_date, "progress": task.progress,
            "status": task.status, "owner": task.owner, "assigned_objects": task.assigned_objects or [],
            "dependencies_json": task.dependencies_json or [], "estimate_hours": task.estimate_hours,
            "metadata_json": task.metadata_json or {},
        })
        row_hash = _source_row_hash(snapshot)
        prior = await session.scalar(select(models.PV1MigrationRow).where(
            models.PV1MigrationRow.tenant_id == tenant_id,
            models.PV1MigrationRow.source_kind == "task",
            models.PV1MigrationRow.source_id == str(task.id),
        ))
        if prior and prior.state == "migrated" and prior.source_hash == row_hash:
            continue
        state, task_snapshot, notes = await _migrate_task(
            session,
            task=task,
            tenant_id=tenant_id,
            actor_id=actor_id,
            project_id=project_id,
            source_hash=source_hash,
            migrated=migrated,
            rejected=rejected,
            task_ids=task_ids_by_project.get(task.project_id, set()),
        )
        if state in {"rejected", "source_changed"}:
            _increment(rejected, "tasks")
        if any(note.startswith("Unmapped legacy task status") for note in notes):
            _increment(rejected, "tasks")
            _increment(rejected, "unmapped_status")
        await process_row("task", str(task.id), row_hash, task_snapshot, _task_destination_id(task.id) if state == "migrated" else None, "migrated" if state == "migrated" else state, "; ".join(notes) if notes else None)
        await _migrate_dependencies(
            session,
            run=run,
            task=task,
            tenant_id=tenant_id,
            actor_id=actor_id,
            project_id=project_id,
            task_ids=task_ids_by_project.get(task.project_id, set()),
            rejected=rejected,
            migrated=migrated,
        )

    run.migrated_counts = migrated
    run.rejected_counts = rejected
    run.source_counts = source_counts
    run.status = "CompletedWithRejections" if rejected else "Completed"
    run.completed_at = datetime.now(timezone.utc)
    run.checkpoint = {**checkpoint, "processed_rows": processed, "complete": True}
    await session.commit()
    await session.refresh(run)
    if cutover and run.status == "Completed":
        await set_tenant_cutover(session, tenant_id=tenant_id, state="cutover", actor_id=actor_id, migration_run_id=run.id)
    return migration_run_summary(run)


def migration_run_summary(run: models.PV1MigrationRun) -> dict[str, Any]:
    return {
        "run_id": run.id,
        "tenant_id": run.tenant_id,
        "migration_key": run.migration_key,
        "source_hash": run.source_hash,
        "status": run.status,
        "source_counts": run.source_counts or {},
        "migrated_counts": run.migrated_counts or {},
        "rejected_counts": run.rejected_counts or {},
        "checkpoint": run.checkpoint or {},
        "rollback_mapping": run.rollback_mapping or {},
    }


async def shadow_compare_project(session: AsyncSession, *, tenant_id: int, project_id: str | int) -> dict[str, Any]:
    """Compare legacy and PV1 projections without mutating either source."""

    legacy_id = int(str(project_id)) if str(project_id).isdigit() else None
    legacy = await session.get(legacy_models.Project, legacy_id) if legacy_id is not None else None
    canonical = await session.get(models.PV1Project, str(project_id))
    mismatches: list[dict[str, Any]] = []
    if legacy is None or canonical is None:
        return {"project_id": str(project_id), "match": False, "mismatches": [{"field": "identity", "legacy": bool(legacy), "pv1": bool(canonical)}], "source": "legacy-shadow"}
    mapped_phase, mapped_run_state, _ = legacy_project_status(legacy.status, legacy.metadata_json)
    mapped_priority, _ = legacy_priority(legacy.priority)
    comparisons = {
        "identity": (canonical.legacy_project_id, legacy.id),
        "name": (canonical.name, legacy.name),
        "objective": (canonical.objective, legacy.objective),
        "phase": (canonical.phase, mapped_phase),
        "run_state": (canonical.run_state, mapped_run_state),
        "priority": (canonical.priority, mapped_priority),
        "start_date": (_json_value(canonical.start_date), _json_value(_date_value(legacy.start_date))),
        "target_date": (_json_value(canonical.target_date), _json_value(_date_value(legacy.end_date))),
        "owner": (canonical.owner_id, legacy.owner or f"legacy:unresolved:{legacy.id}"),
    }
    for field, (actual, expected) in comparisons.items():
        if actual != expected:
            mismatches.append({"field": field, "pv1": actual, "legacy": expected})
    legacy_tasks = list((await session.scalars(select(legacy_models.ProjectTask).where(legacy_models.ProjectTask.project_id == legacy.id).order_by(legacy_models.ProjectTask.id))).all())
    pv1_tasks = list((await session.scalars(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == canonical.id).order_by(models.PV1Task.id))).all())
    if {task.id for task in pv1_tasks if task.legacy_task_id is not None} != {str(task.id) for task in legacy_tasks}:
        mismatches.append({"field": "task_identity", "pv1": sorted(str(task.legacy_task_id) for task in pv1_tasks if task.legacy_task_id is not None), "legacy": sorted(str(task.id) for task in legacy_tasks)})
    return {
        "project_id": str(project_id),
        "match": not mismatches,
        "mismatches": mismatches,
        "identity": {"legacy_project_id": legacy.id, "pv1_project_id": canonical.id},
        "permissions": {"legacy_policy": "tenant-admin", "pv1_owner": canonical.owner_id, "pv1_visibility": canonical.visibility},
        "dates": {"legacy_start": _json_value(legacy.start_date), "legacy_end": _json_value(legacy.end_date), "pv1_start": _json_value(canonical.start_date), "pv1_target": _json_value(canonical.target_date)},
        "aggregates": {"legacy_task_count": len(legacy_tasks), "pv1_task_count": len([task for task in pv1_tasks if task.legacy_task_id is not None])},
        "outcome_history_source": "legacy.project_outcome_realization_v1",
    }


shadow_read_project = shadow_compare_project


async def legacy_projects_read(session: AsyncSession, *, tenant_id: int) -> list[models.PV1Project]:
    """Return only canonical rows for migrated projects; never merge writers."""

    result = await session.execute(select(models.PV1Project).where(models.PV1Project.tenant_id == tenant_id).order_by(models.PV1Project.display_key))
    return list(result.scalars())


def _compat_status(project: models.PV1Project) -> str:
    original = (project.metadata_json or {}).get("pv1_legacy_migration_v1", {}).get("original_status")
    if original:
        return str(original)
    if project.run_state == "Paused":
        return "Paused"
    if project.run_state == "Cancelled":
        return "Cancelled"
    return {
        "Proposed": "Not Started",
        "Planning": "Planning",
        "Executing": "In Progress",
        "Validating": "In Progress",
        "Delivered": "Completed",
    }.get(project.phase, project.phase)


async def canonical_project_legacy_response(session: AsyncSession, project: models.PV1Project) -> dict[str, Any]:
    """Project v1 response shape backed only by canonical PV1 records."""

    legacy_project_id = project.legacy_project_id
    project_snapshot: dict[str, Any] = {}
    if legacy_project_id is not None:
        project_row = await session.scalar(select(models.PV1MigrationRow).where(
            models.PV1MigrationRow.tenant_id == project.tenant_id,
            models.PV1MigrationRow.source_kind == "project",
            models.PV1MigrationRow.source_id == str(legacy_project_id),
        ))
        project_snapshot = (project_row.source_snapshot or {}) if project_row else {}

    task_result = await session.execute(
        select(models.PV1Task)
        .where(models.PV1Task.tenant_id == project.tenant_id, models.PV1Task.project_id == project.id)
        .order_by(models.PV1Task.order_key, models.PV1Task.id)
    )
    tasks = list(task_result.scalars())
    task_ids = [str(task.legacy_task_id) for task in tasks if task.legacy_task_id is not None]
    task_rows = []
    if task_ids:
        task_rows = list((await session.scalars(select(models.PV1MigrationRow).where(
            models.PV1MigrationRow.tenant_id == project.tenant_id,
            models.PV1MigrationRow.source_kind == "task",
            models.PV1MigrationRow.source_id.in_(task_ids),
        ))).all())
    task_snapshots = {row.source_id: (row.source_snapshot or {}) for row in task_rows}
    raw_metadata = dict(project.metadata_json or {})
    migration_metadata = raw_metadata.get("pv1_legacy_migration_v1") or {}
    original_timestamps = migration_metadata.get("original_timestamps") or {}
    original_priority = migration_metadata.get("original_priority") or project.priority
    task_payload = []
    for task in tasks:
        source = task_snapshots.get(str(task.legacy_task_id), {})
        task_metadata = dict(source.get("metadata_json") or {})
        task_metadata.update({"pv1_source": "canonical", "legacy_task_id": task.legacy_task_id})
        task_start = source.get("start_date") or task.start_date
        task_end = source.get("end_date") or task.end_date
        task_actual_start = source.get("actual_start_date") or task.actual_started_at
        task_actual_end = source.get("actual_end_date") or task.finished_at
        task_payload.append({
            "id": int(task.legacy_task_id) if task.legacy_task_id is not None else task.id,
            "name": task.title,
            "description": task.description,
            "start_date": _compat_datetime(task_start),
            "end_date": _compat_datetime(task_end),
            "actual_start_date": _compat_datetime(task_actual_start),
            "actual_end_date": _compat_datetime(task_actual_end),
            "progress": task.progress,
            "status": "Completed" if task.status == "Done" else task.status,
            "owner": task.owner_id,
            "assigned_objects": source.get("assigned_objects") if isinstance(source.get("assigned_objects"), list) else (task.tags if isinstance(task.tags, list) else []),
            "project_id": project.legacy_project_id or project.id,
            "parent_task_id": int(task.parent_task_id) if task.parent_task_id and str(task.parent_task_id).isdigit() else None,
            "dependencies_json": source.get("dependencies_json") if isinstance(source.get("dependencies_json"), list) else [],
            "metadata_json": task_metadata,
        })

    legacy_comments: list[dict[str, Any]] = []
    legacy_qa_items: list[dict[str, Any]] = []
    if legacy_project_id is not None:
        comments = list((await session.scalars(select(legacy_models.ProjectComment).where(legacy_models.ProjectComment.project_id == legacy_project_id).order_by(legacy_models.ProjectComment.id))).all())
        legacy_comments = [{
            "id": item.id, "project_id": item.project_id, "task_id": item.task_id,
            "author": item.author, "content": item.content, "timestamp": item.timestamp,
            "created_at": item.created_at, "updated_at": item.updated_at, "created_by_user_id": item.created_by_user_id,
        } for item in comments]
        qa_items = list((await session.scalars(select(legacy_models.ProjectQA).where(legacy_models.ProjectQA.project_id == legacy_project_id).order_by(legacy_models.ProjectQA.id))).all())
        legacy_qa_items = [{
            "id": item.id, "project_id": item.project_id, "task_id": item.task_id,
            "question": item.question, "answer": item.answer, "asked_by": item.asked_by,
            "answered_by": item.answered_by, "status": item.status,
            "created_at": item.created_at, "updated_at": item.updated_at, "created_by_user_id": item.created_by_user_id,
        } for item in qa_items]

    legacy_source = project_snapshot
    return {
        "id": legacy_project_id if legacy_project_id is not None else project.id,
        "name": project.name,
        "description": project.problem or legacy_source.get("description"),
        "type": project.template_key or legacy_source.get("type"),
        "status": _compat_status(project),
        "priority": original_priority,
        "start_date": _compat_datetime(original_timestamps.get("start_date") or project.start_date),
        "end_date": _compat_datetime(original_timestamps.get("end_date") or project.target_date),
        "completed_at": _compat_datetime(original_timestamps.get("completed_at")),
        "owner": project.owner_id,
        "owners": legacy_source.get("owners") if isinstance(legacy_source.get("owners"), list) else ([project.owner_id] if project.owner_id else []),
        "problem_statement": project.problem or legacy_source.get("problem_statement"),
        "objective": project.objective,
        "key_functions": legacy_source.get("key_functions") or [],
        "expected_outcomes": legacy_source.get("expected_outcomes") or [],
        "beneficiaries": legacy_source.get("beneficiaries") or [],
        "roi_types": legacy_source.get("roi_types") or [],
        "roi_defense_line": legacy_source.get("roi_defense_line") or 0,
        "roi_defense_line_desc": legacy_source.get("roi_defense_line_desc"),
        "man_hours_saved": legacy_source.get("man_hours_saved") or 0.0,
        "man_hours_saved_math": legacy_source.get("man_hours_saved_math"),
        "man_hours_saved_desc": legacy_source.get("man_hours_saved_desc"),
        "stoploss_minutes_saved": legacy_source.get("stoploss_minutes_saved") or 0.0,
        "stoploss_minutes_saved_math": legacy_source.get("stoploss_minutes_saved_math"),
        "stoploss_minutes_saved_desc": legacy_source.get("stoploss_minutes_saved_desc"),
        "wafers_gained": legacy_source.get("wafers_gained") or 0.0,
        "wafers_gained_math": legacy_source.get("wafers_gained_math"),
        "wafers_gained_desc": legacy_source.get("wafers_gained_desc"),
        "appendix_json": legacy_source.get("appendix_json") or {},
        "parent_project_id": int(project.parent_project_id) if project.parent_project_id and str(project.parent_project_id).isdigit() else legacy_source.get("parent_project_id"),
        "budget": legacy_source.get("budget") if legacy_source.get("budget") is not None else 0.0,
        "currency": legacy_source.get("currency") or project.outcome_currency or "USD",
        "order_index": legacy_source.get("order_index") or 0,
        "team_members": legacy_source.get("team_members") or [],
        "metadata_json": raw_metadata,
        "is_deleted": project.archived_at is not None,
        "tasks": task_payload,
        "comments": legacy_comments,
        "qa_items": legacy_qa_items,
    }
