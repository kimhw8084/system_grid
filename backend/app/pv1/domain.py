import hashlib
import base64
import csv
import hmac
import io
import json
from dataclasses import replace
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi import status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import models as legacy_models
from ..core.config import settings
from . import focus, models, schedule


PHASES = ["Draft", "Proposed", "Planning", "Ready", "Executing", "Validating", "Delivered"]
RUN_STATES = {"Active", "Paused", "Cancelled"}
OUTCOME_PHASES = {"Not configured", "Planned", "Pilot", "Adopting", "Measuring", "Closed"}
OUTCOME_RESULTS = {"Unassessed", "Realized", "Partial", "Not realized", "Inconclusive", "Not applicable"}
PROJECT_ROLES = {"Owner", "Lead", "Contributor", "Stakeholder"}
EDIT_ROLES = {"Owner", "Lead", "Tenant administrator"}
READ_ROLES = PROJECT_ROLES | {"Tenant administrator"}


class PV1DomainError(Exception):
    def __init__(self, code: str, message: str, *, http_status: int = 422, details: dict[str, Any] | None = None, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details or {}
        self.retryable = retryable


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_payload(payload: Any) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _new_id() -> str:
    return str(uuid4())


def _date(value: Any) -> date | None:
    if value is None or isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise PV1DomainError("VALIDATION_FAILED", "Date must use ISO YYYY-MM-DD.", details={"value": value})
    raise PV1DomainError("VALIDATION_FAILED", "Date must use ISO YYYY-MM-DD.")


def _decimal(value: Any, field: str) -> Decimal:
    try:
        return Decimal(str(value))
    except Exception as exc:
        raise PV1DomainError("VALIDATION_FAILED", f"{field} must be a decimal string.", details={"field": field}) from exc


def _serialize(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return format(value, "f")
    return value


def project_dict(project: models.PV1Project) -> dict[str, Any]:
    return {
        "id": project.id,
        "display_key": project.display_key,
        "tenant_id": project.tenant_id,
        "legacy_project_id": project.legacy_project_id,
        "name": project.name,
        "objective": project.objective,
        "problem": project.problem,
        "in_scope": project.in_scope,
        "out_of_scope": project.out_of_scope,
        "team_id": project.team_id,
        "owner_id": project.owner_id,
        "template_key": project.template_key,
        "template_version": project.template_version,
        "phase": project.phase,
        "run_state": project.run_state,
        "priority": project.priority,
        "start_date": _serialize(project.start_date),
        "target_date": _serialize(project.target_date),
        "no_deadline_reason": project.no_deadline_reason,
        "timezone": project.timezone,
        "calendar_id": project.calendar_id,
        "calendar_revision": project.calendar_revision,
        "visibility": project.visibility,
        "parent_project_id": project.parent_project_id,
        "architecture_assessment": project.architecture_assessment,
        "architecture_rationale": project.architecture_rationale,
        "outcome_phase": project.outcome_phase,
        "outcome_result": project.outcome_result,
        "update_cadence": project.update_cadence,
        "cancellation_reason": project.cancellation_reason,
        "pause_reason": project.pause_reason,
        "resume_review_date": _serialize(project.resume_review_date),
        "creation_draft": (project.metadata_json or {}).get("creation_draft_v1"),
        "revision": project.revision,
        "graph_revision": project.graph_revision,
        "created_at": _serialize(project.created_at),
        "created_by": project.created_by,
        "updated_at": _serialize(project.updated_at),
        "updated_by": project.updated_by,
        "archived_at": _serialize(project.archived_at),
    }


def task_dict(task: models.PV1Task) -> dict[str, Any]:
    return {
        "id": task.id,
        "project_id": task.project_id,
        "legacy_task_id": task.legacy_task_id,
        "parent_task_id": task.parent_task_id,
        "milestone_id": task.milestone_id,
        "kind": task.kind,
        "title": task.title,
        "description": task.description,
        "owner_id": task.owner_id,
        "status": task.status,
        "priority": task.priority,
        "progress": task.progress,
        "start_date": _serialize(task.start_date),
        "end_date": _serialize(task.end_date),
        "point_date": _serialize(task.point_date),
        "milestone_anchor": task.milestone_anchor,
        "duration_workdays": task.duration_workdays,
        "start_pinned": task.start_pinned,
        "finish_pinned": task.finish_pinned,
        "not_before_date": _serialize(task.not_before_date),
        "estimate_hours": _serialize(task.estimate_hours),
        "remaining_workdays": task.remaining_workdays,
        "planning_weight": task.planning_weight,
        "mandatory": task.mandatory,
        "order_key": _serialize(task.order_key),
        "actual_started_at": _serialize(task.actual_started_at),
        "finished_at": _serialize(task.finished_at),
        "actual_finished_at": _serialize(task.finished_at),
        "tags": task.tags or [],
        "revision": task.revision,
    }


def _schedule_calendar_value(project: models.PV1Project, item: models.PV1ProjectCalendar | None) -> schedule.ProjectCalendar:
    if item is None:
        return schedule.ProjectCalendar(
            timezone=project.timezone or "UTC",
            working_weekdays=tuple(range(7)) if project.calendar_id == "legacy-seven-day" else (0, 1, 2, 3, 4),
            revision=project.calendar_revision or 1,
        )
    exceptions: list[tuple[date, bool]] = []
    for raw in item.exceptions or []:
        if isinstance(raw, dict) and raw.get("date") and isinstance(raw.get("working"), bool):
            exceptions.append((_date(raw["date"]), raw["working"]))  # type: ignore[arg-type]
    return schedule.ProjectCalendar(
        timezone=item.timezone,
        working_weekdays=tuple(item.working_weekdays or []),
        exceptions=tuple(exceptions),
        revision=item.revision,
    )


def _schedule_task_value(task: models.PV1Task) -> schedule.ScheduleTask:
    return schedule.ScheduleTask(
        id=task.id,
        title=task.title,
        kind=task.kind,
        start=task.start_date,
        finish=task.end_date,
        point_date=task.point_date,
        anchor=task.milestone_anchor or ("finish" if task.kind == "Milestone" else "start"),
        duration=task.duration_workdays,
        parent_id=task.parent_task_id,
        status=task.status,
        progress=task.progress,
        remaining_workdays=task.remaining_workdays,
        actual_finish=task.finished_at.date() if task.finished_at else None,
        pinned=bool(task.start_pinned or task.finish_pinned),
        not_before=task.not_before_date,
        revision=task.revision,
    )


def _schedule_edge_value(edge: models.PV1Dependency, cancelled_task_ids: set[str] | None = None) -> schedule.ScheduleEdge:
    cancelled_task_ids = cancelled_task_ids or set()
    return schedule.ScheduleEdge(
        id=edge.id,
        predecessor_id=edge.predecessor_id,
        successor_id=edge.successor_id,
        dependency_type=edge.dependency_type,
        lag_days=edge.lag_days,
        active=edge.active and edge.predecessor_id not in cancelled_task_ids and edge.successor_id not in cancelled_task_ids,
    )


def _schedule_tasks_with_external_constraints(
    tasks: list[schedule.ScheduleTask],
    external_records: list[models.PV1ExternalDependency],
    calendar: schedule.ProjectCalendar,
) -> tuple[list[schedule.ScheduleTask], list[dict[str, Any]]]:
    """Project external milestones into local not-before constraints only after confirmation."""
    by_id = {task.id: task for task in tasks}
    warnings: list[dict[str, Any]] = []
    for item in external_records:
        if not item.active or item.local_task_id not in by_id:
            continue
        warning = {
            "external_dependency_id": item.id,
            "local_task_id": item.local_task_id,
            "external_project_ref": item.external_project_ref if item.access_policy == "Visible" else None,
        }
        if item.access_policy != "Visible":
            warnings.append({**warning, "code": "EXTERNAL_DEPENDENCY_UNAVAILABLE"})
            continue
        if item.observed_milestone_revision and item.observed_milestone_revision != item.external_milestone_revision:
            warnings.append({**warning, "code": "EXTERNAL_MILESTONE_CHANGED", "pinned_revision": item.external_milestone_revision, "observed_revision": item.observed_milestone_revision})
            continue
        if not item.confirmed or item.external_date is None:
            warnings.append({**warning, "code": "EXTERNAL_DEPENDENCY_UNCONFIRMED"})
            continue
        task = by_id[item.local_task_id]
        duration = task.resolved_duration(calendar)
        if duration is None:
            warnings.append({**warning, "code": "EXTERNAL_LOCAL_TASK_UNSCHEDULED"})
            continue
        external_point = calendar.normalize(item.external_date)
        external_boundary = calendar.shift(external_point, 1) if item.external_anchor == "finish" else external_point
        if item.dependency_type in {"FS", "SS"}:
            required = calendar.shift(external_boundary, item.lag_days)
        else:
            required = calendar.shift(external_boundary, item.lag_days - duration)
        by_id[task.id] = replace(task, not_before=max(value for value in (task.not_before, required) if value is not None))
    return [by_id[task.id] for task in tasks], warnings


async def _schedule_records(
    session: AsyncSession,
    *,
    tenant_id: int,
    project_id: str,
) -> tuple[models.PV1ProjectCalendar | None, list[models.PV1Task], list[models.PV1Dependency], list[models.PV1ExternalDependency], list[models.PV1ScheduleBaseline]]:
    calendar_record = await session.scalar(select(models.PV1ProjectCalendar).where(
        models.PV1ProjectCalendar.tenant_id == tenant_id,
        models.PV1ProjectCalendar.project_id == project_id,
    ))
    task_result = await session.execute(select(models.PV1Task).where(
        models.PV1Task.tenant_id == tenant_id,
        models.PV1Task.project_id == project_id,
    ).order_by(models.PV1Task.order_key, models.PV1Task.id))
    dependency_result = await session.execute(select(models.PV1Dependency).where(
        models.PV1Dependency.tenant_id == tenant_id,
        models.PV1Dependency.project_id == project_id,
    ).order_by(models.PV1Dependency.created_at, models.PV1Dependency.id))
    external_result = await session.execute(select(models.PV1ExternalDependency).where(
        models.PV1ExternalDependency.tenant_id == tenant_id,
        models.PV1ExternalDependency.project_id == project_id,
    ).order_by(models.PV1ExternalDependency.created_at, models.PV1ExternalDependency.id))
    baseline_result = await session.execute(select(models.PV1ScheduleBaseline).where(
        models.PV1ScheduleBaseline.tenant_id == tenant_id,
        models.PV1ScheduleBaseline.project_id == project_id,
    ).order_by(models.PV1ScheduleBaseline.created_at, models.PV1ScheduleBaseline.id))
    return calendar_record, list(task_result.scalars()), list(dependency_result.scalars()), list(external_result.scalars()), list(baseline_result.scalars())


def _dependency_dict(item: models.PV1Dependency, cancelled_task_ids: set[str] | None = None) -> dict[str, Any]:
    cancelled_task_ids = cancelled_task_ids or set()
    effective_active = item.active and item.predecessor_id not in cancelled_task_ids and item.successor_id not in cancelled_task_ids
    return {
        "id": item.id,
        "predecessor_id": item.predecessor_id,
        "successor_id": item.successor_id,
        "dependency_type": item.dependency_type,
        "lag_days": item.lag_days,
        "active": effective_active,
        "retained_active": item.active,
        "disabled_reason": "Cancelled endpoint" if item.active and not effective_active else None,
        "revision": item.revision,
    }


def _baseline_dict(item: models.PV1ScheduleBaseline) -> dict[str, Any]:
    return {
        "id": item.id,
        "owner_id": item.owner_id,
        "label": item.label,
        "rationale": item.rationale,
        "calendar_revision": item.calendar_revision,
        "graph_revision": item.graph_revision,
        "snapshot": item.snapshot,
        "is_default": item.is_default,
        "created_at": _serialize(item.created_at),
    }


def _preview_token_encode(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()
    body = base64.urlsafe_b64encode(encoded).decode().rstrip("=")
    signature = hmac.new(settings.SCHEDULE_PREVIEW_SIGNING_KEY.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{signature}"


def _preview_token_decode(token: str) -> dict[str, Any]:
    try:
        body, signature = token.rsplit(".", 1)
        expected = hmac.new(settings.SCHEDULE_PREVIEW_SIGNING_KEY.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        padding = "=" * (-len(body) % 4)
        value = json.loads(base64.urlsafe_b64decode(body + padding))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise PV1DomainError("PREVIEW_INVALID", "Schedule preview identity is invalid.", http_status=status.HTTP_409_CONFLICT) from exc
    if not isinstance(value, dict):
        raise PV1DomainError("PREVIEW_INVALID", "Schedule preview identity is invalid.", http_status=status.HTTP_409_CONFLICT)
    return value


def _schedule_error(error: schedule.ScheduleError) -> PV1DomainError:
    conflict_codes = {"DEPENDENCY_CYCLE", "SCHEDULE_CONFLICT"}
    return PV1DomainError(
        error.code,
        str(error),
        http_status=status.HTTP_409_CONFLICT if error.code in conflict_codes else status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=error.details,
    )


async def schedule_projection(
    session: AsyncSession,
    *,
    tenant_id: int,
    project_id: str,
    actor_id: str,
    request_role: str | None,
    as_of: date | None = None,
) -> dict[str, Any]:
    project = await get_pv1_project(session, tenant_id, project_id)
    if not project:
        if project_id.isdigit():
            raise PV1DomainError("MIGRATION_REQUIRED", "Legacy Project schedule data remains readable through v1 and must be migrated before v2 scheduling.", http_status=status.HTTP_409_CONFLICT)
        raise PV1DomainError("NOT_FOUND", "Project not found.", http_status=status.HTTP_404_NOT_FOUND)
    await require_project_role(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, request_role=request_role)
    calendar_record, task_records, dependency_records, external_records, baselines = await _schedule_records(session, tenant_id=tenant_id, project_id=project_id)
    try:
        calendar = _schedule_calendar_value(project, calendar_record)
        tasks, external_warnings = _schedule_tasks_with_external_constraints(
            [_schedule_task_value(item) for item in task_records], external_records, calendar
        )
        cancelled_task_ids = {item.id for item in task_records if item.status == "Cancelled"}
        edges = [_schedule_edge_value(item, cancelled_task_ids) for item in dependency_records]
        analysis = schedule.critical_path(tasks, edges, calendar, completion_anchor=project.target_date)
        if external_warnings:
            analysis = {**analysis, "status": "Critical path incomplete", "external_warnings": external_warnings}
        blocker_result = await session.execute(select(models.PV1TaskBlocker.task_id).where(
            models.PV1TaskBlocker.tenant_id == tenant_id,
            models.PV1TaskBlocker.project_id == project_id,
            models.PV1TaskBlocker.state == "Open",
        ))
        forecast = schedule.forecast_schedule(tasks, edges, calendar, as_of=as_of or _now().date(), unresolved_blocker_ids=set(blocker_result.scalars()))
    except schedule.ScheduleError as error:
        raise _schedule_error(error) from error
    history_result = await session.execute(select(models.PV1Event).where(
        models.PV1Event.tenant_id == tenant_id,
        models.PV1Event.project_id == project_id,
        models.PV1Event.event_type.in_(["schedule.apply", "dependency.create", "dependency.update", "dependency.remove", "external_dependency.create", "external_dependency.refresh", "external_dependency.confirm", "external_dependency.remove", "baseline.capture", "baseline.set_default", "task.undo", "task.redo"]),
    ).order_by(models.PV1Event.sequence.desc()).limit(50))
    baseline_variance: list[dict[str, Any]] = []
    default_baseline = next((item for item in baselines if item.is_default), baselines[0] if baselines else None)
    if default_baseline:
        try:
            baseline_calendar = schedule.calendar_from_dict(default_baseline.snapshot.get("calendar") or {})
            current_by_id = {item.id: item for item in task_records}
            baseline_by_id = {str(item.get("id")): item for item in default_baseline.snapshot.get("tasks") or [] if isinstance(item, dict) and item.get("id")}
            all_ids = sorted(set(current_by_id) | set(baseline_by_id))
            for task_id in all_ids:
                current = current_by_id.get(task_id)
                baseline_task = baseline_by_id.get(task_id)
                if current is None or baseline_task is None:
                    baseline_variance.append({"task_id": task_id, "scope_change": "Added" if baseline_task is None else "Removed", "start_delta_workdays": None, "finish_delta_workdays": None})
                    continue
                milestone = current.kind == "Milestone"
                baseline_start = _date(baseline_task.get("point_date") if milestone else baseline_task.get("start_date"))
                baseline_finish = _date(baseline_task.get("point_date") if milestone else baseline_task.get("end_date"))
                current_start = current.point_date if milestone else current.start_date
                current_finish = current.point_date if milestone else current.end_date
                baseline_variance.append({
                    "task_id": task_id,
                    "scope_change": None,
                    "start_delta_workdays": baseline_calendar.boundary_delta(baseline_start, current_start) if baseline_start and current_start else None,
                    "finish_delta_workdays": baseline_calendar.boundary_delta(baseline_finish, current_finish) if baseline_finish and current_finish else None,
                })
        except schedule.ScheduleError:
            baseline_variance = [{"baseline_id": default_baseline.id, "status": "Baseline calendar unavailable"}]
    return {
        "project_id": project_id,
        "project": project_dict(project),
        "project_revision": project.revision,
        "graph_revision": project.graph_revision,
        "calendar": calendar.to_dict() | {"id": project.calendar_id},
        "tasks": [task_dict(item) for item in task_records],
        "dependencies": [_dependency_dict(item, cancelled_task_ids) for item in dependency_records],
        "external_dependencies": [{
            "id": item.id,
            "local_task_id": item.local_task_id,
            "external_project_ref": item.external_project_ref if item.access_policy == "Visible" else None,
            "external_task_ref": item.external_task_ref if item.access_policy == "Visible" else None,
            "external_milestone_revision": item.external_milestone_revision,
            "external_date": _serialize(item.external_date),
            "observed_milestone_revision": item.observed_milestone_revision,
            "observed_date": _serialize(item.observed_date),
            "external_anchor": item.external_anchor,
            "access_policy": item.access_policy,
            "dependency_type": item.dependency_type,
            "lag_days": item.lag_days,
            "confirmed": item.confirmed,
            "active": item.active,
            "revision": item.revision,
        } for item in external_records],
        "baselines": [_baseline_dict(item) for item in baselines],
        "baseline_variance": baseline_variance,
        "analysis": analysis,
        "forecast": forecast,
        "external_warnings": external_warnings,
        "history": [{"event_id": item.event_id, "command_id": item.command_id, "sequence": item.sequence, "event_type": item.event_type, "actor_id": item.actor_id, "timestamp": _serialize(item.timestamp), "delta": item.delta or {}} for item in history_result.scalars()],
        "as_of": _now().isoformat(),
        "source_revisions": {"project_revision": project.revision, "graph_revision": project.graph_revision, "calendar_revision": calendar.revision},
    }


async def preview_project_schedule(
    session: AsyncSession,
    *,
    tenant_id: int,
    project_id: str,
    actor_id: str,
    request_role: str | None,
    operation: str,
    selection_ids: list[str],
    parameters: dict[str, Any],
    graph_revision: int,
    calendar_revision: int,
) -> dict[str, Any]:
    project = await get_pv1_project(session, tenant_id, project_id)
    if not project:
        raise PV1DomainError("NOT_FOUND", "Project not found.", http_status=status.HTTP_404_NOT_FOUND)
    await require_project_role(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, request_role=request_role, write=True)
    if graph_revision != project.graph_revision or calendar_revision != project.calendar_revision:
        raise PV1DomainError("REVISION_CONFLICT", "The schedule changed before preview.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"graph_revision": project.graph_revision, "calendar_revision": project.calendar_revision}})
    calendar_record, task_records, dependency_records, external_records, _ = await _schedule_records(session, tenant_id=tenant_id, project_id=project_id)
    try:
        project_calendar = _schedule_calendar_value(project, calendar_record)
        constrained_tasks, external_warnings = _schedule_tasks_with_external_constraints(
            [_schedule_task_value(item) for item in task_records], external_records, project_calendar
        )
        cancelled_task_ids = {item.id for item in task_records if item.status == "Cancelled"}
        preview = schedule.preview_schedule(
            constrained_tasks,
            [_schedule_edge_value(item, cancelled_task_ids) for item in dependency_records],
            project_calendar,
            operation=operation,
            selection_ids=selection_ids,
            parameters=parameters,
            graph_revision=graph_revision,
        )
    except schedule.ScheduleError as error:
        raise _schedule_error(error) from error
    issued_at = int(_now().timestamp())
    token_payload = {
        "version": 1,
        "tenant_id": tenant_id,
        "project_id": project_id,
        "actor_id": actor_id,
        "base_graph_revision": graph_revision,
        "calendar_revision": calendar_revision,
        "operation": operation,
        "selection_ids": sorted(selection_ids),
        "parameters": parameters,
        "content_hash": preview["content_hash"],
        "issued_at": issued_at,
        "expires_at": issued_at + 300,
    }
    return {**preview, "external_warnings": external_warnings, "preview_id": _preview_token_encode(token_payload), "expires_at": datetime.fromtimestamp(token_payload["expires_at"], timezone.utc).isoformat()}


async def _apply_project_schedule(
    session: AsyncSession,
    *,
    tenant_id: int,
    project: models.PV1Project,
    actor_id: str,
    command_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    preview_id = str(payload.get("preview_id") or "")
    preview_hash = str(payload.get("preview_hash") or "")
    token = _preview_token_decode(preview_id)
    if any(token.get(field) != value for field, value in (("tenant_id", tenant_id), ("project_id", project.id), ("actor_id", actor_id))):
        raise PV1DomainError("PREVIEW_INVALID", "Schedule preview does not belong to this actor and project.", http_status=status.HTTP_409_CONFLICT)
    if int(token.get("expires_at") or 0) < int(_now().timestamp()):
        raise PV1DomainError("PREVIEW_EXPIRED", "Schedule preview expired; calculate it again.", http_status=status.HTTP_409_CONFLICT)
    if token.get("content_hash") != preview_hash:
        raise PV1DomainError("PREVIEW_HASH_MISMATCH", "Schedule preview hash does not match the reviewed result.", http_status=status.HTTP_409_CONFLICT)
    if token.get("base_graph_revision") != project.graph_revision or token.get("calendar_revision") != project.calendar_revision:
        raise PV1DomainError("REVISION_CONFLICT", "The schedule changed after preview; calculate it again before applying.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"graph_revision": project.graph_revision, "calendar_revision": project.calendar_revision}})

    calendar_record, task_records, dependency_records, external_records, _ = await _schedule_records(session, tenant_id=tenant_id, project_id=project.id)
    calendar = _schedule_calendar_value(project, calendar_record)
    try:
        constrained_tasks, _ = _schedule_tasks_with_external_constraints(
            [_schedule_task_value(item) for item in task_records], external_records, calendar
        )
        cancelled_task_ids = {item.id for item in task_records if item.status == "Cancelled"}
        preview = schedule.preview_schedule(
            constrained_tasks,
            [_schedule_edge_value(item, cancelled_task_ids) for item in dependency_records],
            calendar,
            operation=str(token.get("operation") or ""),
            selection_ids=[str(item) for item in token.get("selection_ids") or []],
            parameters=token.get("parameters") or {},
            graph_revision=project.graph_revision,
        )
    except schedule.ScheduleError as error:
        raise _schedule_error(error) from error
    if preview["content_hash"] != preview_hash:
        raise PV1DomainError("REVISION_CONFLICT", "The reviewed schedule result no longer matches current truth.", http_status=status.HTTP_409_CONFLICT)

    tasks_by_id = {task.id: task for task in task_records}
    before_values: dict[str, Any] = {}
    after_values: dict[str, Any] = {}
    before_revisions: dict[str, int] = {}
    after_revisions: dict[str, int] = {}
    for change in preview["changes"]:
        task_id = str(change["task_id"])
        task = tasks_by_id.get(task_id)
        if task is None:
            raise PV1DomainError("REVISION_CONFLICT", "A preview task no longer exists.", http_status=status.HTTP_409_CONFLICT)
        before = {
            "start_date": _serialize(task.start_date),
            "end_date": _serialize(task.end_date),
            "point_date": _serialize(task.point_date),
            "milestone_anchor": task.milestone_anchor,
            "duration_workdays": task.duration_workdays,
            "start_pinned": task.start_pinned,
            "finish_pinned": task.finish_pinned,
            "not_before_date": _serialize(task.not_before_date),
        }
        raw_after = change["after"]
        after = {
            "start_date": raw_after.get("start_date"),
            "end_date": raw_after.get("end_date"),
            "point_date": raw_after.get("point_date"),
            "milestone_anchor": raw_after.get("anchor") or task.milestone_anchor,
            "duration_workdays": raw_after.get("duration_workdays"),
            "start_pinned": task.start_pinned,
            "finish_pinned": task.finish_pinned,
            "not_before_date": _serialize(task.not_before_date),
        }
        before_values[task_id] = before
        after_values[task_id] = after
        before_revisions[task_id] = task.revision
        after_revisions[task_id] = task.revision + 1
        task.start_date = _date(after["start_date"])
        task.end_date = _date(after["end_date"])
        task.point_date = _date(after["point_date"])
        task.milestone_anchor = after["milestone_anchor"]
        task.duration_workdays = after["duration_workdays"]
        task.revision += 1
        task.updated_by = actor_id
        task.updated_at = _now()

    next_calendar_revision = project.calendar_revision or 1
    project_values: dict[str, Any] = {}
    if token["operation"] == "change_calendar":
        if calendar_record is None:
            raise PV1DomainError("SCHEDULE_UNAVAILABLE", "Project calendar is unavailable.", http_status=status.HTTP_409_CONFLICT)
        try:
            target_calendar = schedule.calendar_from_dict({**(token.get("parameters") or {}), "revision": calendar.revision + 1})
        except schedule.ScheduleError as error:
            raise _schedule_error(error) from error
        calendar_record.timezone = target_calendar.timezone
        calendar_record.working_weekdays = list(target_calendar.working_weekdays)
        calendar_record.exceptions = target_calendar.to_dict()["exceptions"]
        calendar_record.revision = target_calendar.revision
        calendar_record.updated_by = actor_id
        calendar_record.updated_at = _now()
        next_calendar_revision = target_calendar.revision
        project_values.update({"timezone": target_calendar.timezone, "calendar_revision": next_calendar_revision})

    project_result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(
        models.PV1Project.id == project.id,
        models.PV1Project.revision == project.revision,
        models.PV1Project.graph_revision == project.graph_revision,
    ).values(
        revision=models.PV1Project.revision + 1,
        graph_revision=models.PV1Project.graph_revision + 1,
        updated_by=actor_id,
        updated_at=func.now(),
        **project_values,
    ))
    if project_result.rowcount != 1:
        raise PV1DomainError("REVISION_CONFLICT", "The graph changed while applying the schedule.", http_status=status.HTTP_409_CONFLICT)
    event_id, _ = await append_event(
        session,
        tenant_id=tenant_id,
        project_id=project.id,
        actor_id=actor_id,
        command_id=command_id,
        event_type="schedule.apply",
        aggregate_type="task_set",
        aggregate_id=project.id,
        aggregate_revision=project.graph_revision + 1,
        delta={"operation": token["operation"], "preview_hash": preview_hash, "task_ids": sorted(before_values), "change_count": len(before_values)},
    )
    if before_values:
        await _record_task_history(
            session,
            tenant_id=tenant_id,
            project_id=project.id,
            actor_id=actor_id,
            command_id=command_id,
            command_type="schedule.apply",
            before_values=before_values,
            after_values=after_values,
            before_revisions=before_revisions,
            after_revisions=after_revisions,
        )
    return _success(
        command_id,
        revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision + 1, "calendar_revision": next_calendar_revision, "task_revisions": after_revisions},
        changed_entities=[{"kind": "task", "id": task_id} for task_id in sorted(before_values)],
        event_id=event_id,
    )


def legacy_phase(status_value: str | None) -> tuple[str, str]:
    value = (status_value or "").strip()
    if value == "Not Started": return "Proposed", "Active"
    if value == "Planning": return "Planning", "Active"
    if value == "In Progress": return "Executing", "Active"
    if value == "Completed": return "Delivered", "Active"
    if value == "Paused": return "Planning", "Paused"
    if value == "Cancelled": return "Planning", "Cancelled"
    if value == "Blocked": return "Executing", "Active"
    return "Proposed", "Active"


def legacy_project_dict(project: legacy_models.Project, tenant_id: int) -> dict[str, Any]:
    phase, run_state = legacy_phase(project.status)
    return {
        "id": str(project.id),
        "display_key": f"PRJ-{project.id:06d}",
        "tenant_id": tenant_id,
        "legacy_project_id": project.id,
        "name": project.name,
        "objective": project.objective,
        "problem": project.problem_statement,
        "in_scope": None,
        "out_of_scope": None,
        "team_id": None,
        "owner_id": project.owner or "legacy:unresolved",
        "template_key": project.type,
        "template_version": None,
        "phase": phase,
        "run_state": run_state,
        "priority": "Critical" if project.priority == "Highest" else project.priority or "Medium",
        "start_date": _serialize(project.start_date.date() if project.start_date else None),
        "target_date": _serialize(project.end_date.date() if project.end_date else None),
        "no_deadline_reason": None,
        "timezone": "UTC",
        "calendar_id": "legacy-seven-day",
        "calendar_revision": 1,
        "visibility": "Team",
        "parent_project_id": str(project.parent_project_id) if project.parent_project_id else None,
        "architecture_assessment": "Not assessed",
        "architecture_rationale": None,
        "outcome_phase": "Not configured",
        "outcome_result": "Unassessed",
        "update_cadence": 7,
        "cancellation_reason": None,
        "pause_reason": None,
        "resume_review_date": None,
        "creation_draft": None,
        "revision": 1,
        "graph_revision": 1,
        "created_at": _serialize(project.created_at),
        "created_by": project.created_by_user_id or "legacy:unknown",
        "updated_at": _serialize(project.updated_at),
        "updated_by": project.created_by_user_id or "legacy:unknown",
        "archived_at": None,
        "legacy_status": project.status,
        "legacy_metadata": project.metadata_json or {},
    }


def legacy_task_dict(task: legacy_models.ProjectTask, project_id: str) -> dict[str, Any]:
    return {
        "id": str(task.id),
        "project_id": project_id,
        "legacy_task_id": task.id,
        "parent_task_id": str(task.parent_task_id) if task.parent_task_id else None,
        "milestone_id": None,
        "kind": "Summary" if (task.metadata_json or {}).get("kind") == "summary" else "Task",
        "title": task.name,
        "description": task.description,
        "owner_id": task.owner,
        "status": "Done" if task.status in {"Done", "Completed"} else task.status,
        "priority": "Medium",
        "progress": task.progress or 0,
        "start_date": _serialize(task.start_date.date() if task.start_date else None),
        "end_date": _serialize(task.end_date.date() if task.end_date else None),
        "point_date": None,
        "estimate_hours": _serialize(task.estimate_hours),
        "remaining_workdays": None,
        "planning_weight": 1,
        "mandatory": True,
        "order_key": str(task.id * 1024),
        "actual_started_at": _serialize(task.actual_start_date),
        "finished_at": _serialize(task.actual_end_date),
        "tags": [],
        "revision": 1,
    }


async def get_pv1_project(session: AsyncSession, tenant_id: int, project_id: str) -> models.PV1Project | None:
    result = await session.execute(select(models.PV1Project).where(models.PV1Project.tenant_id == tenant_id, models.PV1Project.id == project_id))
    return result.scalar_one_or_none()


async def get_member_role(session: AsyncSession, tenant_id: int, project_id: str, actor_id: str, request_role: str | None = None) -> str | None:
    result = await session.execute(select(models.PV1ProjectMember).where(
        models.PV1ProjectMember.tenant_id == tenant_id,
        models.PV1ProjectMember.project_id == project_id,
        models.PV1ProjectMember.user_id == actor_id,
    ))
    member = result.scalar_one_or_none()
    if member:
        return member.role
    if (request_role or "").upper() == "ADMIN":
        return "Tenant administrator"
    return None


async def require_project_role(session: AsyncSession, *, tenant_id: int, project_id: str, actor_id: str, request_role: str | None, write: bool = False) -> str:
    role = await get_member_role(session, tenant_id, project_id, actor_id, request_role)
    if role is None:
        raise PV1DomainError("NOT_FOUND", "Project not found.", http_status=status.HTTP_404_NOT_FOUND)
    if write and role not in EDIT_ROLES:
        raise PV1DomainError("FORBIDDEN", "You do not have permission to edit this project.", http_status=status.HTTP_403_FORBIDDEN)
    return role


def project_capabilities(role: str | None, explicit: dict[str, Any] | None = None, *, legacy: bool = False) -> dict[str, bool]:
    explicit = explicit or {}
    can_edit = not legacy and role in EDIT_ROLES
    can_manage = not legacy and role in {"Owner", "Tenant administrator"}
    is_tenant_admin = role == "Tenant administrator"
    return {
        "view": role in READ_ROLES,
        "edit": can_edit,
        "manage_people": can_manage,
        "transition": can_edit,
        "pause": can_manage,
        "cancel": can_manage,
        "archive": can_manage,
        "restore": can_manage,
        "export": role in READ_ROLES,
        "financial_view": (is_tenant_admin or bool(explicit.get("financial.view", False))) and role in READ_ROLES,
        "financial_edit": (is_tenant_admin or bool(explicit.get("financial.edit", False))) and can_edit,
    }


async def project_capabilities_for_actor(
    session: AsyncSession,
    *,
    tenant_id: int,
    project_id: str,
    actor_id: str,
    request_role: str | None,
    legacy: bool = False,
) -> dict[str, bool]:
    role = await get_member_role(session, tenant_id, project_id, actor_id, request_role)
    explicit: dict[str, Any] = {}
    if role != "Tenant administrator" and not legacy:
        result = await session.execute(select(models.PV1ProjectMember).where(
            models.PV1ProjectMember.tenant_id == tenant_id,
            models.PV1ProjectMember.project_id == project_id,
            models.PV1ProjectMember.user_id == actor_id,
        ))
        member = result.scalar_one_or_none()
        explicit = member.capabilities or {} if member else {}
    return project_capabilities(role, explicit, legacy=legacy)


def _health_projection(project: models.PV1Project, tasks: list[models.PV1Task], blockers: list[models.PV1TaskBlocker]) -> dict[str, Any]:
    today = _now().date()
    if project.run_state in {"Paused", "Cancelled"}:
        return {"level": "Unknown", "reason": f"Project is {project.run_state.lower()}."}
    if blockers:
        return {"level": "Off track", "reason": blockers[0].reason}
    overdue = [task for task in tasks if task.status not in {"Done", "Cancelled"} and (task.point_date or task.end_date) and (task.point_date or task.end_date) < today]
    if overdue or (project.target_date and project.phase != "Delivered" and project.target_date < today):
        return {"level": "At risk", "reason": "A delivery commitment is overdue."}
    executable_tasks = [task for task in tasks if task.kind not in {"Summary", "Milestone"} and task.status != "Cancelled"]
    if project.phase in {"Draft", "Proposed", "Planning"} and not executable_tasks:
        return {"level": "Unknown", "reason": "Delivery work is not planned yet."}
    return {"level": "On track", "reason": "No current blocker or missed commitment is recorded."}


def _delivery_projection(tasks: list[models.PV1Task]) -> dict[str, Any]:
    delivery_tasks = [task for task in tasks if task.kind not in {"Summary", "Milestone"} and task.status != "Cancelled"]
    if not delivery_tasks:
        return {"percent": None, "label": "Not planned", "method": "No executable work is recorded."}
    denominator = sum(max(1, task.planning_weight or 1) for task in delivery_tasks)
    numerator = sum(max(1, task.planning_weight or 1) * max(0, min(100, task.progress or 0)) for task in delivery_tasks)
    percent = round(numerator / denominator)
    return {"percent": percent, "label": f"{percent}%", "method": "Weighted by canonical planning weight."}


async def project_story_projection(session: AsyncSession, project: models.PV1Project) -> dict[str, Any]:
    tenant_id, project_id = project.tenant_id, project.id
    task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id).order_by(models.PV1Task.order_key, models.PV1Task.id))
    tasks = list(task_result.scalars())
    criterion_result = await session.execute(select(models.PV1TaskCriterion).where(models.PV1TaskCriterion.tenant_id == tenant_id, models.PV1TaskCriterion.project_id == project_id).order_by(models.PV1TaskCriterion.created_at, models.PV1TaskCriterion.id))
    criteria = list(criterion_result.scalars())
    blocker_result = await session.execute(select(models.PV1TaskBlocker).where(models.PV1TaskBlocker.tenant_id == tenant_id, models.PV1TaskBlocker.project_id == project_id, models.PV1TaskBlocker.state == "Open").order_by(models.PV1TaskBlocker.review_date, models.PV1TaskBlocker.id))
    blockers = list(blocker_result.scalars())
    governance_result = await session.execute(select(models.PV1GovernanceRecord).where(models.PV1GovernanceRecord.tenant_id == tenant_id, models.PV1GovernanceRecord.project_id == project_id, models.PV1GovernanceRecord.state.not_in(["Closed", "Resolved", "Approved"])).order_by(models.PV1GovernanceRecord.created_at.desc()))
    governance = list(governance_result.scalars())
    update_result = await session.execute(select(models.PV1Update).where(models.PV1Update.tenant_id == tenant_id, models.PV1Update.project_id == project_id, models.PV1Update.state == "Published").order_by(models.PV1Update.published_at.desc()).limit(1))
    latest_update = update_result.scalar_one_or_none()
    metric_result = await session.execute(select(models.PV1Metric).where(models.PV1Metric.tenant_id == tenant_id, models.PV1Metric.project_id == project_id, models.PV1Metric.archived_at.is_(None)).order_by(models.PV1Metric.required_for_success.desc(), models.PV1Metric.created_at, models.PV1Metric.id))
    metrics = list(metric_result.scalars())
    primary_metric = metrics[0] if metrics else None
    measurement = None
    if primary_metric:
        measurement_result = await session.execute(select(models.PV1Measurement).where(models.PV1Measurement.tenant_id == tenant_id, models.PV1Measurement.project_id == project_id, models.PV1Measurement.metric_id == primary_metric.id).order_by(models.PV1Measurement.period_end.desc(), models.PV1Measurement.recorded_at.desc()).limit(1))
        measurement = measurement_result.scalar_one_or_none()

    open_milestones = [task for task in tasks if task.kind == "Milestone" and task.status not in {"Done", "Cancelled"}]
    open_milestones.sort(key=lambda task: (task.point_date or task.end_date or date.max, task.order_key, task.id))
    next_milestone = open_milestones[0] if open_milestones else None
    today = _now().date()
    overdue = [task for task in tasks if task.status not in {"Done", "Cancelled"} and (task.point_date or task.end_date) and (task.point_date or task.end_date) < today]
    attention: list[dict[str, Any]] = []
    seen_reasons: set[str] = set()
    for blocker in blockers:
        reason_key = blocker.reason.strip().casefold()
        if reason_key in seen_reasons:
            continue
        seen_reasons.add(reason_key)
        attention.append({"id": blocker.id, "kind": "Blocker", "reason": blocker.reason, "accountable": blocker.resolver_id or project.owner_id, "due_date": _serialize(blocker.review_date), "action": "Open work", "entity_id": blocker.task_id})
    for task in overdue:
        if any(blocker.task_id == task.id for blocker in blockers):
            continue
        reason_key = f"commitment:{task.id}"
        if reason_key in seen_reasons:
            continue
        seen_reasons.add(reason_key)
        attention.append({"id": reason_key, "kind": "Missed commitment", "reason": task.title, "accountable": task.owner_id or project.owner_id, "due_date": _serialize(task.point_date or task.end_date), "action": "Open work", "entity_id": task.id})
    if project.target_date and project.phase != "Delivered" and project.target_date < today and not overdue:
        attention.append({"id": f"project-target:{project.id}", "kind": "Missed commitment", "reason": "The Project target date has passed.", "accountable": project.owner_id, "due_date": _serialize(project.target_date), "action": "Open work", "entity_id": None})
    for record in governance:
        if record.record_type != "Decision":
            continue
        payload = record.payload or {}
        due_date = payload.get("due_date") or payload.get("review_date")
        try:
            parsed_due_date = date.fromisoformat(str(due_date)[:10]) if due_date else None
        except ValueError:
            parsed_due_date = None
        if parsed_due_date is None or parsed_due_date >= today:
            continue
        reason_key = f"decision:{record.id}"
        if reason_key in seen_reasons:
            continue
        seen_reasons.add(reason_key)
        attention.append({"id": record.id, "kind": "Overdue decision", "reason": record.title, "accountable": payload.get("approver_id") or record.owner_id or project.owner_id, "due_date": due_date, "action": "Open decision", "entity_id": record.id})
    if not project.owner_id or project.owner_id.startswith("legacy:unresolved"):
        attention.append({"id": f"owner-missing:{project.id}", "kind": "Owner missing", "reason": "Assign one accountable Project Owner.", "accountable": "Team administrator", "due_date": None, "action": "Manage people", "entity_id": None})
    if primary_metric and primary_metric.target_date and primary_metric.target_date < today and (not measurement or measurement.period_end < primary_metric.target_date):
        attention.append({"id": f"outcome-checkpoint:{primary_metric.id}", "kind": "Overdue outcome checkpoint", "reason": primary_metric.name, "accountable": primary_metric.steward_id, "due_date": _serialize(primary_metric.target_date), "action": "Record measurement", "entity_id": primary_metric.id})
    if project.phase in {"Executing", "Validating"}:
        freshness_cutoff = _now() - timedelta(days=max(1, project.update_cadence or 7))
        if not latest_update or not latest_update.published_at or latest_update.published_at < freshness_cutoff:
            attention.append({"id": f"late-update:{project.id}", "kind": "Late update", "reason": "The published project update is overdue.", "accountable": project.owner_id, "due_date": None, "action": "Draft update", "entity_id": None})

    metric_current: Any = None
    if measurement:
        if measurement.observed_numeric is not None:
            metric_current = _serialize(measurement.observed_numeric)
        elif measurement.observed_binary is not None:
            metric_current = measurement.observed_binary
        elif measurement.numerator is not None and measurement.denominator:
            metric_current = _serialize(Decimal(measurement.numerator) * Decimal(100) / Decimal(measurement.denominator))
    target_value = None
    next_measurement_date = None
    if primary_metric and isinstance(primary_metric.target_spec, dict):
        target_value = primary_metric.target_spec.get("value")
    if primary_metric:
        if measurement and primary_metric.cadence_days:
            cadence_days = max(1, primary_metric.cadence_days)
            next_measurement_date = measurement.period_end + timedelta(days=cadence_days)
            if next_measurement_date <= today:
                elapsed_days = (today - next_measurement_date).days
                next_measurement_date += timedelta(days=((elapsed_days // cadence_days) + 1) * cadence_days)
        elif primary_metric.target_date and primary_metric.target_date >= today:
            next_measurement_date = primary_metric.target_date

    return {
        "health": _health_projection(project, tasks, blockers),
        "delivery": _delivery_projection(tasks),
        "next_milestone": task_dict(next_milestone) if next_milestone else None,
        "milestones": [task_dict(task) for task in open_milestones[:3]],
        "attention": attention,
        "attention_count": len(attention),
        "acceptance_criteria": [{"id": item.id, "description": item.description, "state": item.state, "mandatory": item.mandatory} for item in criteria],
        "primary_metric": ({"id": primary_metric.id, "name": primary_metric.name, "kind": primary_metric.kind, "unit": primary_metric.unit, "target": target_value, "current": metric_current, "quality": measurement.quality if measurement else None, "measured_at": _serialize(measurement.recorded_at) if measurement else None, "next_measurement_date": _serialize(next_measurement_date), "steward_id": primary_metric.steward_id} if primary_metric else None),
        "latest_update": ({"id": latest_update.id, "content": latest_update.content, "published_at": _serialize(latest_update.published_at), "author_id": latest_update.author_id} if latest_update else None),
        "governance": [{"id": item.id, "type": item.record_type, "title": item.title, "state": item.state, "owner_id": item.owner_id, "approver_id": (item.payload or {}).get("approver_id")} for item in governance[:3]],
        "architecture": {"assessment": project.architecture_assessment, "rationale": project.architecture_rationale},
        "resources": [],
        "freshness": {"updated_at": _serialize(project.updated_at), "source": "Canonical Project projection"},
        "coverage": {"resources": "unavailable", "architecture": "assessment-only", "updates": "available"},
    }


async def project_readiness_gaps(session: AsyncSession, project: models.PV1Project, to_phase: str) -> list[dict[str, Any]]:
    if to_phase not in PHASES:
        raise PV1DomainError("VALIDATION_FAILED", "Unknown delivery phase.", details={"field": "to_phase"})
    gaps: list[dict[str, Any]] = []

    def add(code: str, field: str, message: str, action: str) -> None:
        gaps.append({"code": code, "field": field, "message": message, "action": action, "blocking": True})

    target_index = PHASES.index(to_phase)
    approved_exception_result = await session.execute(select(models.PV1GovernanceRecord).where(models.PV1GovernanceRecord.tenant_id == project.tenant_id, models.PV1GovernanceRecord.project_id == project.id, models.PV1GovernanceRecord.record_type == "Decision", models.PV1GovernanceRecord.state == "Approved"))
    approved_exceptions = {
        str((record.payload or {}).get("exception_type"))
        for record in approved_exception_result.scalars()
        if (record.payload or {}).get("rationale") and ((record.payload or {}).get("approver_id") or record.owner_id)
    }
    if target_index >= PHASES.index("Proposed"):
        if not project.name.strip(): add("MISSING_NAME", "name", "Add a project name.", "Add purpose")
        if not project.owner_id.strip(): add("MISSING_OWNER", "owner_id", "Assign one accountable Owner.", "Add purpose")
        if not (project.objective or "").strip(): add("MISSING_OBJECTIVE", "objective", "Describe what will change.", "Add purpose")
    if target_index >= PHASES.index("Ready"):
        if not (project.in_scope or "").strip(): add("MISSING_IN_SCOPE", "in_scope", "Define what is in scope.", "Add purpose")
        if not (project.out_of_scope or "").strip(): add("MISSING_OUT_SCOPE", "out_of_scope", "Define what is out of scope.", "Add purpose")
        criteria_count = await session.scalar(select(func.count()).select_from(models.PV1TaskCriterion).where(models.PV1TaskCriterion.tenant_id == project.tenant_id, models.PV1TaskCriterion.project_id == project.id, models.PV1TaskCriterion.mandatory.is_(True)))
        if not criteria_count: add("MISSING_ACCEPTANCE", "acceptance_criteria", "Add at least one delivery acceptance criterion.", "Add success")
        task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == project.tenant_id, models.PV1Task.project_id == project.id, models.PV1Task.status != "Cancelled"))
        tasks = list(task_result.scalars())
        executable = [task for task in tasks if task.kind not in {"Summary", "Milestone"}]
        if not executable: add("MISSING_EXECUTABLE_WORK", "tasks", "Add at least one non-cancelled executable task.", "Open work")
        ownerless_milestones = [task for task in tasks if task.kind == "Milestone" and task.mandatory and not task.owner_id]
        if ownerless_milestones: add("MILESTONE_OWNER_REQUIRED", "milestones", "Assign owners to mandatory milestones.", "Add delivery plan")
        if not project.target_date and not (project.no_deadline_reason or "").strip(): add("MISSING_TARGET", "target_date", "Add a target date or an approved no-deadline reason.", "Add delivery plan")
        metric_count = await session.scalar(select(func.count()).select_from(models.PV1Metric).where(models.PV1Metric.tenant_id == project.tenant_id, models.PV1Metric.project_id == project.id, models.PV1Metric.archived_at.is_(None), models.PV1Metric.steward_id.is_not(None)))
        outcome_na = "outcome_not_applicable" in approved_exceptions
        if not metric_count and not outcome_na: add("MISSING_METRIC", "metric", "Add a success metric and steward or an approved not-applicable rationale.", "Add success")
        if project.architecture_assessment == "Not assessed": add("MISSING_ARCHITECTURE_ASSESSMENT", "architecture_assessment", "Assess architecture impact.", "Add delivery plan")
        if project.architecture_assessment == "No" and not (project.architecture_rationale or "").strip(): add("MISSING_ARCHITECTURE_RATIONALE", "architecture_rationale", "Explain why architecture is not affected.", "Add delivery plan")
    if target_index >= PHASES.index("Executing"):
        milestone_count = await session.scalar(select(func.count()).select_from(models.PV1Task).where(models.PV1Task.tenant_id == project.tenant_id, models.PV1Task.project_id == project.id, models.PV1Task.kind == "Milestone", models.PV1Task.status != "Cancelled"))
        if not milestone_count: add("MISSING_NEXT_MILESTONE", "milestones", "Add a next mandatory milestone.", "Add delivery plan")
        scheduled_count = await session.scalar(select(func.count()).select_from(models.PV1Task).where(models.PV1Task.tenant_id == project.tenant_id, models.PV1Task.project_id == project.id, models.PV1Task.mandatory.is_(True), models.PV1Task.status != "Cancelled", models.PV1Task.start_date.is_not(None), models.PV1Task.end_date.is_not(None)))
        schedule_exception = "critical_schedule" in approved_exceptions
        if not scheduled_count and not schedule_exception: add("MISSING_CRITICAL_SCHEDULE", "tasks", "Schedule critical mandatory work or record an approved exception.", "Open timeline")
    return gaps


async def _next_display_key(session: AsyncSession, tenant_id: int) -> str:
    result = await session.execute(select(models.PV1Project.display_key).where(models.PV1Project.tenant_id == tenant_id))
    maximum = 0
    for value in result.scalars():
        if isinstance(value, str) and value.startswith("PRJ-") and value[4:].isdigit():
            maximum = max(maximum, int(value[4:]))
    return f"PRJ-{maximum + 1:06d}"


async def append_event(session: AsyncSession, *, tenant_id: int, project_id: str, actor_id: str, command_id: str, event_type: str, aggregate_type: str, aggregate_id: str, aggregate_revision: int, delta: dict[str, Any] | None = None) -> tuple[str, int]:
    result = await session.execute(select(func.max(models.PV1Event.sequence)).where(models.PV1Event.tenant_id == tenant_id, models.PV1Event.project_id == project_id))
    sequence = (result.scalar_one() or 0) + 1
    event_id = _new_id()
    session.add(models.PV1Event(
        event_id=event_id,
        tenant_id=tenant_id,
        project_id=project_id,
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        aggregate_revision=aggregate_revision,
        sequence=sequence,
        actor_id=actor_id,
        event_type=event_type,
        command_id=command_id,
        delta=delta or {},
    ))
    session.add(models.PV1OutboxEvent(
        id=_new_id(),
        tenant_id=tenant_id,
        event_id=event_id,
        topic=f"project.{event_type}",
        payload={"event_id": event_id, "project_id": project_id, "sequence": sequence, "type": event_type},
    ))
    return event_id, sequence


async def _idempotency_start(session: AsyncSession, *, tenant_id: int, actor_id: str, command_type: str, command_id: str, request_payload: Any) -> models.PV1IdempotencyKey | None:
    request_hash = _hash_payload(request_payload)
    existing_result = await session.execute(select(models.PV1IdempotencyKey).where(
        models.PV1IdempotencyKey.tenant_id == tenant_id,
        models.PV1IdempotencyKey.actor_id == actor_id,
        models.PV1IdempotencyKey.command_type == command_type,
        models.PV1IdempotencyKey.command_id == command_id,
    ))
    existing = existing_result.scalar_one_or_none()
    if existing:
        if existing.request_hash != request_hash:
            raise PV1DomainError("IDEMPOTENCY_CONFLICT", "The command id was already used with a different request body.", http_status=status.HTTP_409_CONFLICT)
        return existing
    record = models.PV1IdempotencyKey(
        id=_new_id(), tenant_id=tenant_id, actor_id=actor_id, command_type=command_type,
        command_id=command_id, request_hash=request_hash, status="pending",
        response_json={}, expires_at=_now() + timedelta(hours=72),
    )
    try:
        async with session.begin_nested():
            session.add(record)
            await session.flush()
    except IntegrityError:
        existing_result = await session.execute(select(models.PV1IdempotencyKey).where(
            models.PV1IdempotencyKey.tenant_id == tenant_id,
            models.PV1IdempotencyKey.actor_id == actor_id,
            models.PV1IdempotencyKey.command_type == command_type,
            models.PV1IdempotencyKey.command_id == command_id,
        ))
        existing = existing_result.scalar_one_or_none()
        if existing and existing.request_hash == request_hash:
            return existing
        raise PV1DomainError("IDEMPOTENCY_CONFLICT", "The command id was concurrently used with a different request body.", http_status=status.HTTP_409_CONFLICT)
    return None


async def _idempotency_finish(session: AsyncSession, *, tenant_id: int, actor_id: str, command_type: str, command_id: str, response: dict[str, Any], event_id: str | None) -> None:
    result = await session.execute(select(models.PV1IdempotencyKey).where(
        models.PV1IdempotencyKey.tenant_id == tenant_id,
        models.PV1IdempotencyKey.actor_id == actor_id,
        models.PV1IdempotencyKey.command_type == command_type,
        models.PV1IdempotencyKey.command_id == command_id,
    ))
    record = result.scalar_one()
    record.status = "applied"
    record.response_json = response
    record.event_id = event_id


def _success(command_id: str, *, revisions: dict[str, Any], changed_entities: list[dict[str, Any]], event_id: str | None, as_of: datetime | None = None) -> dict[str, Any]:
    return {
        "command_id": command_id,
        "status": "applied",
        "revisions": revisions,
        "changed_entities": changed_entities,
        "event_id": event_id,
        "as_of": (as_of or _now()).isoformat(),
    }


def _require_expected(expected: dict[str, Any], field: str) -> int:
    value = expected.get(field)
    if not isinstance(value, int) or value < 1:
        raise PV1DomainError("REVISION_CONFLICT", f"{field} is required for this command.", http_status=status.HTTP_409_CONFLICT)
    return value


def _next_working_day(value: date) -> date:
    candidate = value + timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    return candidate


async def _last_non_done_progress(session: AsyncSession, *, tenant_id: int, project_id: str, task_id: str) -> int:
    result = await session.execute(select(models.PV1Event).where(
        models.PV1Event.tenant_id == tenant_id,
        models.PV1Event.project_id == project_id,
        models.PV1Event.aggregate_type == "task",
        models.PV1Event.aggregate_id == task_id,
        models.PV1Event.event_type == "task.transition",
    ).order_by(models.PV1Event.sequence.desc()).limit(10))
    for event in result.scalars():
        delta = event.delta or {}
        progress = delta.get("previous_progress")
        if isinstance(progress, int) and 0 <= progress < 100:
            return progress
    return 0


async def _record_task_history(
    session: AsyncSession,
    *,
    tenant_id: int,
    project_id: str,
    actor_id: str,
    command_id: str,
    command_type: str,
    before_values: dict[str, Any],
    after_values: dict[str, Any],
    before_revisions: dict[str, int],
    after_revisions: dict[str, int],
) -> None:
    session.add(models.PV1TaskCommandHistory(
        id=_new_id(), tenant_id=tenant_id, project_id=project_id, actor_id=actor_id,
        original_command_id=command_id, command_type=command_type,
        task_ids=list(before_values), before_values=before_values, after_values=after_values,
        before_revisions=before_revisions, after_revisions=after_revisions, state="Active",
    ))
    await session.flush()
    history_result = await session.execute(select(models.PV1TaskCommandHistory).where(
        models.PV1TaskCommandHistory.tenant_id == tenant_id,
        models.PV1TaskCommandHistory.project_id == project_id,
        models.PV1TaskCommandHistory.actor_id == actor_id,
    ).order_by(models.PV1TaskCommandHistory.created_at.desc(), models.PV1TaskCommandHistory.id.desc()))
    for stale in list(history_result.scalars())[50:]:
        await session.delete(stale)


async def _validate_done_requirements(
    session: AsyncSession,
    *,
    task: models.PV1Task,
    actor_id: str,
    role: str | None,
    payload: dict[str, Any],
) -> None:
    exception = str(payload.get("completion_exception") or "").strip()
    criteria_result = await session.execute(select(models.PV1TaskCriterion).where(
        models.PV1TaskCriterion.tenant_id == task.tenant_id,
        models.PV1TaskCriterion.project_id == task.project_id,
        models.PV1TaskCriterion.task_id == task.id,
        models.PV1TaskCriterion.mandatory.is_(True),
    ))
    criteria = list(criteria_result.scalars())
    open_criteria = [item for item in criteria if item.state not in {"Passed", "Waived"}]
    if open_criteria and not exception:
        raise PV1DomainError("COMPLETION_CRITERIA_REQUIRED", "Complete mandatory checklist evidence or provide a named Owner/Lead exception.", details={"criterion_ids": [item.id for item in open_criteria]})
    if not criteria and not exception:
        raise PV1DomainError("COMPLETION_CRITERIA_REQUIRED", "Done requires task-level acceptance evidence or a named Owner/Lead exception.")
    if exception and role not in {"Owner", "Lead", "Tenant administrator"}:
        raise PV1DomainError("FORBIDDEN", "Only the named Owner or Lead may record a completion exception.", http_status=status.HTTP_403_FORBIDDEN)
    if task.kind == "Milestone":
        linked_result = await session.execute(select(models.PV1Task).where(
            models.PV1Task.tenant_id == task.tenant_id,
            models.PV1Task.project_id == task.project_id,
            models.PV1Task.milestone_id == task.id,
            models.PV1Task.mandatory.is_(True),
            models.PV1Task.status.notin_({"Done", "Cancelled"}),
        ))
        linked = list(linked_result.scalars())
        if linked and not exception:
            raise PV1DomainError("MILESTONE_LINKED_WORK_REQUIRED", "Complete mandatory linked work or record a named milestone exception.", details={"task_ids": [item.id for item in linked]})


async def create_project(session: AsyncSession, *, tenant_id: int, actor_id: str, request_role: str | None, command_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    existing = await _idempotency_start(session, tenant_id=tenant_id, actor_id=actor_id, command_type="project.create", command_id=command_id, request_payload=payload)
    if existing:
        return existing.response_json
    name = str(payload.get("name", "")).strip()
    if not name or len(name) > 120:
        raise PV1DomainError("VALIDATION_FAILED", "name is required and must be at most 120 characters.")
    owner_id = str(payload.get("owner_id") or actor_id)
    project_id = _new_id()
    calendar_record_id = _new_id()
    inherited_calendar_id = str(payload.get("calendar_id") or "").strip() or None
    inherited_calendar_revision = payload.get("calendar_revision")
    calendar_revision = inherited_calendar_revision if isinstance(inherited_calendar_revision, int) and not isinstance(inherited_calendar_revision, bool) and inherited_calendar_revision >= 1 else 1
    project = models.PV1Project(
        id=project_id,
        tenant_id=tenant_id,
        display_key=await _next_display_key(session, tenant_id),
        name=name,
        objective=payload.get("objective"),
        problem=payload.get("problem"),
        in_scope=payload.get("in_scope"),
        out_of_scope=payload.get("out_of_scope"),
        team_id=payload.get("team_id"),
        owner_id=owner_id,
        template_key=payload.get("template_key"),
        template_version=payload.get("template_version"),
        phase=payload.get("phase", "Draft"),
        priority=payload.get("priority", "Medium"),
        start_date=_date(payload.get("start_date")),
        target_date=_date(payload.get("target_date")),
        no_deadline_reason=payload.get("no_deadline_reason"),
        timezone=payload.get("timezone", "UTC"),
        calendar_id=inherited_calendar_id or calendar_record_id,
        calendar_revision=calendar_revision,
        visibility=payload.get("visibility", "Team"),
        created_by=actor_id,
        updated_by=actor_id,
    )
    if project.target_date and project.start_date and project.target_date < project.start_date:
        raise PV1DomainError("VALIDATION_FAILED", "target_date must be on or after start_date.", details={"field": "target_date"})
    session.add(project)
    try:
        schedule.ProjectCalendar(timezone=project.timezone)
    except schedule.ScheduleError as error:
        raise PV1DomainError(error.code, str(error), details=error.details) from error
    session.add(models.PV1ProjectCalendar(
        id=calendar_record_id,
        tenant_id=tenant_id,
        project_id=project_id,
        timezone=project.timezone,
        working_weekdays=[0, 1, 2, 3, 4],
        exceptions=[],
        revision=calendar_revision,
        created_by=actor_id,
        updated_by=actor_id,
    ))
    session.add(models.PV1ProjectMember(id=_new_id(), tenant_id=tenant_id, project_id=project_id, user_id=owner_id, role="Owner", capabilities={"financial.view": False}, created_by=actor_id, updated_by=actor_id))
    await session.flush()
    event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="project.created", aggregate_type="project", aggregate_id=project_id, aggregate_revision=1, delta={"phase": project.phase})
    response = _success(command_id, revisions={"project_revision": 1, "graph_revision": 1}, changed_entities=[{"kind": "project", "id": project_id}], event_id=event_id)
    await _idempotency_finish(session, tenant_id=tenant_id, actor_id=actor_id, command_type="project.create", command_id=command_id, response=response, event_id=event_id)
    return response


def _normalize_creation_draft(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise PV1DomainError("VALIDATION_FAILED", "creation_draft must be an object.")
    allowed = {"draft_step", "acceptance_criteria", "metric", "milestones", "collaborators", "dependencies", "suggestions_accepted"}
    unknown = set(value) - allowed
    if unknown:
        raise PV1DomainError("VALIDATION_FAILED", "Unlisted creation draft fields are rejected.", details={"fields": sorted(unknown)})

    def text_list(field: str, limit: int) -> list[str]:
        raw = value.get(field) or []
        if not isinstance(raw, list) or len(raw) > limit:
            raise PV1DomainError("VALIDATION_FAILED", f"{field} must be a list with at most {limit} items.")
        normalized = []
        for item in raw:
            text = str(item or "").strip()
            if text:
                normalized.append(text[:500])
        return normalized

    milestones_raw = value.get("milestones") or []
    if not isinstance(milestones_raw, list) or len(milestones_raw) > 20:
        raise PV1DomainError("VALIDATION_FAILED", "milestones must be a list with at most 20 items.")
    milestones: list[dict[str, Any]] = []
    for item in milestones_raw:
        if not isinstance(item, dict) or set(item) - {"title", "owner_id", "point_date"}:
            raise PV1DomainError("VALIDATION_FAILED", "Each milestone may contain only title, owner_id, and point_date.")
        title = str(item.get("title") or "").strip()
        if title:
            milestones.append({"title": title[:120], "owner_id": str(item.get("owner_id") or "").strip() or None, "point_date": _serialize(_date(item.get("point_date")))})

    metric_raw = value.get("metric") or {}
    if not isinstance(metric_raw, dict):
        raise PV1DomainError("VALIDATION_FAILED", "metric must be an object.")
    metric_allowed = {"name", "kind", "unit", "direction", "measurement_method", "steward_id", "target_spec"}
    if set(metric_raw) - metric_allowed:
        raise PV1DomainError("VALIDATION_FAILED", "Unlisted metric draft fields are rejected.")
    metric = {
        "name": str(metric_raw.get("name") or "").strip()[:120],
        "kind": metric_raw.get("kind") or "Custom",
        "unit": str(metric_raw.get("unit") or "").strip()[:64],
        "direction": metric_raw.get("direction") or "Increase",
        "measurement_method": str(metric_raw.get("measurement_method") or "").strip(),
        "steward_id": str(metric_raw.get("steward_id") or "").strip(),
        "target_spec": metric_raw.get("target_spec") if isinstance(metric_raw.get("target_spec"), dict) else None,
    }
    if metric["kind"] not in {"Adoption", "Value", "Quality", "Reliability", "Decision", "Custom"}:
        raise PV1DomainError("VALIDATION_FAILED", "Metric kind is invalid.")
    if metric["direction"] not in {"Increase", "Decrease", "Within range", "Binary"}:
        raise PV1DomainError("VALIDATION_FAILED", "Metric direction is invalid.")
    return {
        "draft_step": max(0, min(3, int(value.get("draft_step") or 0))),
        "acceptance_criteria": text_list("acceptance_criteria", 20),
        "metric": metric,
        "milestones": milestones,
        "collaborators": text_list("collaborators", 50),
        "dependencies": text_list("dependencies", 50),
        "suggestions_accepted": bool(value.get("suggestions_accepted", False)),
    }


async def _materialize_creation_draft(session: AsyncSession, project: models.PV1Project, actor_id: str) -> tuple[list[dict[str, Any]], int]:
    creation = _normalize_creation_draft((project.metadata_json or {}).get("creation_draft_v1"))
    changed: list[dict[str, Any]] = []
    for description in creation.get("acceptance_criteria", []):
        criterion_id = _new_id()
        session.add(models.PV1TaskCriterion(id=criterion_id, tenant_id=project.tenant_id, project_id=project.id, task_id=None, description=description, mandatory=True, created_by=actor_id, updated_by=actor_id))
        changed.append({"kind": "criterion", "id": criterion_id})
    for index, milestone in enumerate(creation.get("milestones", []), start=1):
        task_id = _new_id()
        session.add(models.PV1Task(id=task_id, tenant_id=project.tenant_id, project_id=project.id, kind="Milestone", title=milestone["title"], owner_id=milestone.get("owner_id"), status="To Do", priority=project.priority, progress=0, point_date=_date(milestone.get("point_date")), planning_weight=1, mandatory=True, order_key=index * 1024, tags=["creation-template"] if creation.get("suggestions_accepted") else [], created_by=actor_id, updated_by=actor_id))
        changed.append({"kind": "task", "id": task_id})
    metric = creation.get("metric") or {}
    if metric.get("name") and metric.get("unit") and metric.get("measurement_method") and metric.get("steward_id"):
        metric_id = _new_id()
        session.add(models.PV1Metric(id=metric_id, tenant_id=project.tenant_id, project_id=project.id, name=metric["name"], kind=metric["kind"], unit=metric["unit"], direction=metric["direction"], target_spec=metric.get("target_spec"), steward_id=metric["steward_id"], measurement_method=metric["measurement_method"], required_for_success=True, created_by=actor_id, updated_by=actor_id))
        changed.append({"kind": "metric", "id": metric_id})
    graph_delta = 1 if any(item["kind"] == "task" for item in changed) else 0
    return changed, graph_delta


async def execute_command(session: AsyncSession, *, tenant_id: int, actor_id: str, request_role: str | None, project_id: str, command_id: str, command_type: str, expected: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    if command_type == "project.create":
        raise PV1DomainError("VALIDATION_FAILED", "project.create must use POST /api/v2/projects.")
    existing = await _idempotency_start(session, tenant_id=tenant_id, actor_id=actor_id, command_type=command_type, command_id=command_id, request_payload={"expected": expected, "payload": payload})
    if existing:
        return existing.response_json
    project = await get_pv1_project(session, tenant_id, project_id)
    if not project:
        if project_id.isdigit():
            raise PV1DomainError("MIGRATION_REQUIRED", "Legacy Project is readable through v2 but must be migrated before v2 writes.", http_status=status.HTTP_409_CONFLICT)
        raise PV1DomainError("NOT_FOUND", "Project not found.", http_status=status.HTTP_404_NOT_FOUND)

    role = await require_project_role(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, request_role=request_role, write=False)
    if role not in EDIT_ROLES:
        if command_type in {"task.update_fields", "task.transition"}:
            task_for_permission = await session.get(models.PV1Task, str(payload.get("task_id") or ""))
            if role != "Contributor" or not task_for_permission or task_for_permission.owner_id != actor_id:
                raise PV1DomainError("FORBIDDEN", "Contributors may update only their own tasks.", http_status=status.HTTP_403_FORBIDDEN)
        elif command_type in {"criterion.create", "criterion.review", "blocker.resolve", "risk.save", "decision.request", "decision.decide", "resource.save", "resource.link", "resource.unlink"}:
            pass
        else:
            raise PV1DomainError("FORBIDDEN", "You do not have permission to perform this command.", http_status=status.HTTP_403_FORBIDDEN)
    owner_commands = {"project.pause", "project.resume", "project.reactivate", "project.cancel", "project.archive", "project.restore", "project.transfer_owner"}
    if command_type in owner_commands and role not in {"Owner", "Tenant administrator"}:
        raise PV1DomainError("FORBIDDEN", "Owner capability is required for this lifecycle command.", http_status=status.HTTP_403_FORBIDDEN)
    project_expected = expected.get("project_revision")
    if command_type not in {"comment.add"}:
        if not isinstance(project_expected, int) or project_expected != project.revision:
            raise PV1DomainError("REVISION_CONFLICT", "This project changed. Review the latest version before saving.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"project_revision": project.revision, "graph_revision": project.graph_revision}})

    event_id: str | None = None
    changed: list[dict[str, Any]] = []
    if command_type == "project.update_details":
        allowed = {"name", "objective", "problem", "in_scope", "out_of_scope", "priority", "start_date", "target_date", "no_deadline_reason", "timezone"}
        unknown = set(payload) - allowed
        if unknown:
            raise PV1DomainError("VALIDATION_FAILED", "Unlisted project fields are rejected.", details={"fields": sorted(unknown)})
        changes = {key: (_date(value) if key in {"start_date", "target_date"} else value) for key, value in payload.items()}
        if "name" in changes and (not str(changes["name"]).strip() or len(str(changes["name"])) > 120):
            raise PV1DomainError("VALIDATION_FAILED", "name is required and must be at most 120 characters.")
        if changes.get("start_date") and changes.get("target_date") and changes["target_date"] < changes["start_date"]:
            raise PV1DomainError("VALIDATION_FAILED", "target_date must be on or after start_date.")
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.tenant_id == tenant_id, models.PV1Project.revision == project.revision).values(**changes, revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1:
            raise PV1DomainError("REVISION_CONFLICT", "Project revision changed during the write.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta=changes)
        changed.append({"kind": "project", "id": project_id})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=changed, event_id=event_id)
    elif command_type == "project.save_creation_draft":
        if project.phase != "Draft" or project.archived_at is not None:
            raise PV1DomainError("VALIDATION_FAILED", "Only an active Draft can save creation progress.")
        if set(payload) - {"details", "creation_draft"}:
            raise PV1DomainError("VALIDATION_FAILED", "Unlisted creation save fields are rejected.")
        details = payload.get("details") or {}
        if not isinstance(details, dict):
            raise PV1DomainError("VALIDATION_FAILED", "details must be an object.")
        allowed_details = {"name", "objective", "problem", "in_scope", "out_of_scope", "priority", "start_date", "target_date", "no_deadline_reason", "timezone", "architecture_assessment", "architecture_rationale", "template_key", "template_version"}
        unknown = set(details) - allowed_details
        if unknown:
            raise PV1DomainError("VALIDATION_FAILED", "Unlisted project fields are rejected.", details={"fields": sorted(unknown)})
        changes = {key: (_date(value) if key in {"start_date", "target_date"} else value) for key, value in details.items()}
        if "name" in changes and (not str(changes["name"]).strip() or len(str(changes["name"]).strip()) > 120):
            raise PV1DomainError("VALIDATION_FAILED", "name is required and must be at most 120 characters.")
        if "objective" in changes and changes["objective"] is not None and len(str(changes["objective"])) > 500:
            raise PV1DomainError("VALIDATION_FAILED", "objective must be at most 500 characters.")
        if changes.get("architecture_assessment") not in {None, "Yes", "No", "Not assessed"}:
            raise PV1DomainError("VALIDATION_FAILED", "architecture_assessment is invalid.")
        template_keys = {"automation", "product-feature", "infrastructure-platform", "reliability", "engineering-improvement", "experiment", "process-improvement"}
        if changes.get("template_key") is None and changes.get("template_version") is not None:
            raise PV1DomainError("VALIDATION_FAILED", "template_version requires template_key.")
        if changes.get("template_key") is not None and (changes.get("template_key") not in template_keys or changes.get("template_version") != "1.0.0"):
            raise PV1DomainError("VALIDATION_FAILED", "template_key and template_version must identify a supported versioned template.")
        effective_start = changes.get("start_date", project.start_date)
        effective_target = changes.get("target_date", project.target_date)
        if effective_start and effective_target and effective_target < effective_start:
            raise PV1DomainError("VALIDATION_FAILED", "target_date must be on or after start_date.")
        metadata = dict(project.metadata_json or {})
        metadata["creation_draft_v1"] = _normalize_creation_draft(payload.get("creation_draft"))
        changes["metadata_json"] = metadata
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.tenant_id == tenant_id, models.PV1Project.revision == project.revision).values(**changes, revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1:
            raise PV1DomainError("REVISION_CONFLICT", "Project revision changed during the draft save.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="project.creation_draft_saved", aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta={"draft_step": metadata["creation_draft_v1"].get("draft_step", 0)})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "project", "id": project_id}], event_id=event_id)
    elif command_type == "project.transition":
        to_phase = payload.get("to_phase")
        if to_phase not in PHASES:
            raise PV1DomainError("VALIDATION_FAILED", "Unknown delivery phase.", details={"field": "to_phase"})
        if project.run_state != "Active" and to_phase not in {project.phase}:
            raise PV1DomainError("VALIDATION_FAILED", "Resume a paused or cancelled project before changing its phase.")
        if to_phase == "Delivered" and project.phase not in {"Validating", "Delivered"}:
            raise PV1DomainError("VALIDATION_FAILED", "Delivery must be accepted from Validating.")
        gaps = await project_readiness_gaps(session, project, to_phase)
        if gaps:
            raise PV1DomainError("READINESS_GAPS", "Project is not ready for this transition.", details={"to_phase": to_phase, "gaps": gaps})
        if to_phase == "Proposed" and project.phase != "Draft":
            raise PV1DomainError("VALIDATION_FAILED", "Only a Draft can be created as Proposed.")
        materialized: list[dict[str, Any]] = []
        graph_delta = 0
        if to_phase == "Proposed":
            materialized, graph_delta = await _materialize_creation_draft(session, project, actor_id)
        outcome_phase = "Planned" if project.outcome_phase == "Not configured" and any(item["kind"] == "metric" for item in materialized) else project.outcome_phase
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(phase=to_phase, outcome_phase=outcome_phase, revision=models.PV1Project.revision + 1, graph_revision=models.PV1Project.graph_revision + graph_delta, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project revision changed during the transition.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="project.transitioned", aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta={"phase": to_phase, "outcome_phase": outcome_phase})
        changed.extend([{"kind": "project", "id": project_id}, *materialized])
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision + graph_delta}, changed_entities=changed, event_id=event_id)
    elif command_type == "project.discard_draft":
        if project.phase != "Draft" or project.archived_at is not None:
            raise PV1DomainError("VALIDATION_FAILED", "Only an active Draft can be discarded.")
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(archived_at=func.now(), revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1:
            raise PV1DomainError("REVISION_CONFLICT", "Project revision changed during discard.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="project.draft_discarded", aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta={"preserved": True})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "project", "id": project_id}], event_id=event_id)
    elif command_type in {"project.pause", "project.resume", "project.reactivate", "project.cancel", "project.archive", "project.restore"}:
        if command_type == "project.pause":
            reason = str(payload.get("reason") or "").strip()
            if not reason:
                raise PV1DomainError("VALIDATION_FAILED", "A pause reason is required.", details={"field_errors": [{"field": "reason", "message": "Enter why the project is paused."}]})
            run_state, values = "Paused", {"pause_reason": reason, "resume_review_date": _date(payload.get("resume_review_date"))}
        elif command_type in {"project.resume", "project.reactivate"}:
            run_state, values = "Active", {"pause_reason": None, "cancellation_reason": None if command_type == "project.reactivate" else project.cancellation_reason}
        elif command_type == "project.cancel":
            reason = str(payload.get("reason") or "").strip()
            if not reason:
                raise PV1DomainError("VALIDATION_FAILED", "A cancellation reason is required.", details={"field_errors": [{"field": "reason", "message": "Enter why the project is cancelled."}]})
            run_state, values = "Cancelled", {"cancellation_reason": reason}
        elif command_type == "project.restore":
            run_state, values = project.run_state, {"archived_at": None}
        else:
            if project.run_state != "Cancelled" and not (project.phase == "Delivered" and project.outcome_result == "Realized"):
                raise PV1DomainError("VALIDATION_FAILED", "Only cancelled or fully closed projects may be archived.")
            run_state, values = project.run_state, {"archived_at": func.now()}
        values.update({"run_state": run_state, "revision": project.revision + 1, "updated_by": actor_id, "updated_at": func.now()})
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(**values))
        if result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project lifecycle revision changed.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta={"run_state": run_state})
        changed.append({"kind": "project", "id": project_id})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=changed, event_id=event_id)
    elif command_type == "project.transfer_owner":
        new_owner_id = str(payload.get("new_owner_id") or "").strip()
        member_result = await session.execute(select(models.PV1ProjectMember).where(models.PV1ProjectMember.tenant_id == tenant_id, models.PV1ProjectMember.project_id == project_id, models.PV1ProjectMember.user_id == new_owner_id))
        new_member = member_result.scalar_one_or_none()
        if not new_member:
            raise PV1DomainError("VALIDATION_FAILED", "Owner must be an active eligible ProjectMember.")
        await session.execute(update(models.PV1ProjectMember).where(models.PV1ProjectMember.project_id == project_id, models.PV1ProjectMember.role == "Owner").values(role="Lead", updated_by=actor_id, updated_at=func.now()))
        new_member.role = "Owner"
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(owner_id=new_owner_id, revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project owner changed concurrently.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="project.owner_transferred", aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta={"owner_id": new_owner_id})
        changed.append({"kind": "project", "id": project_id})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=changed, event_id=event_id)
    elif command_type == "project.set_access":
        members = payload.get("members")
        if not isinstance(members, list) or sum(1 for member in members if member.get("role") == "Owner") != 1:
            raise PV1DomainError("VALIDATION_FAILED", "Exactly one accountable Owner is required.")
        normalized_members: dict[str, dict[str, Any]] = {}
        for member in members:
            user_id = str(member.get("user_id") or "").strip()
            role = member.get("role")
            if not user_id or role not in PROJECT_ROLES: raise PV1DomainError("VALIDATION_FAILED", "Invalid ProjectMember.")
            if user_id in normalized_members:
                raise PV1DomainError("VALIDATION_FAILED", "A user may appear only once in ProjectMember access.")
            normalized_members[user_id] = member

        existing_result = await session.execute(select(models.PV1ProjectMember).where(
            models.PV1ProjectMember.tenant_id == tenant_id,
            models.PV1ProjectMember.project_id == project_id,
        ))
        existing_members = {member.user_id: member for member in existing_result.scalars()}
        for user_id, existing_member in existing_members.items():
            if user_id not in normalized_members:
                await session.delete(existing_member)

        owner_id = next(user_id for user_id, member in normalized_members.items() if member.get("role") == "Owner")
        for user_id, member in normalized_members.items():
            role = member["role"]
            capabilities = member.get("capabilities") or {}
            existing_member = existing_members.get(user_id)
            if existing_member:
                existing_member.role = role
                existing_member.capabilities = capabilities
                existing_member.revision += 1
                existing_member.updated_by = actor_id
                existing_member.updated_at = _now()
            else:
                session.add(models.PV1ProjectMember(id=_new_id(), tenant_id=tenant_id, project_id=project_id, user_id=user_id, role=role, capabilities=capabilities, created_by=actor_id, updated_by=actor_id))
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(owner_id=owner_id, visibility=payload.get("visibility", project.visibility), revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project access changed concurrently.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="project.access_changed", aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta={"member_count": len(members)})
        changed.append({"kind": "project", "id": project_id})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=changed, event_id=event_id)
    elif command_type == "task.bulk":
        graph_expected = _require_expected(expected, "graph_revision")
        task_ids = [str(value) for value in (payload.get("task_ids") or [])]
        if not task_ids or len(task_ids) > 500 or len(task_ids) != len(set(task_ids)):
            raise PV1DomainError("VALIDATION_FAILED", "Bulk task operations require 1–500 unique task IDs.")
        task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id, models.PV1Task.id.in_(task_ids)))
        tasks_by_id = {task.id: task for task in task_result.scalars()}
        if len(tasks_by_id) != len(task_ids):
            raise PV1DomainError("NOT_FOUND", "Every selected task must belong to this project.", http_status=status.HTTP_404_NOT_FOUND)
        revisions = expected.get("task_revisions")
        if graph_expected != project.graph_revision or not isinstance(revisions, dict) or any(revisions.get(task_id) != tasks_by_id[task_id].revision for task_id in task_ids):
            raise PV1DomainError("REVISION_CONFLICT", "The selected task set changed. Review the latest version before applying bulk work.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"graph_revision": project.graph_revision, "task_revisions": {task_id: task.revision for task_id, task in tasks_by_id.items()}}})
        operation = payload.get("operation")
        value = payload.get("value")
        if operation not in {"owner", "priority", "status", "cancel", "reparent"}:
            raise PV1DomainError("VALIDATION_FAILED", "Unsupported bulk operation.")
        if operation == "priority" and value not in {"Critical", "High", "Medium", "Low"}:
            raise PV1DomainError("VALIDATION_FAILED", "Priority is invalid.")
        if operation == "status" and value not in focus.WORK_STATUSES:
            raise PV1DomainError("VALIDATION_FAILED", "Status is invalid.")
        if operation == "owner" and value is not None and not str(value).strip():
            raise PV1DomainError("VALIDATION_FAILED", "Owner cannot be blank.")
        if operation == "reparent":
            parent_id = str(value) if value else None
            if parent_id and (parent_id in task_ids or parent_id not in tasks_by_id and not await session.get(models.PV1Task, parent_id)):
                raise PV1DomainError("VALIDATION_FAILED", "Parent must be another task in this project.")
        before_values: dict[str, Any] = {}
        after_values: dict[str, Any] = {}
        before_revisions: dict[str, int] = {}
        after_revisions: dict[str, int] = {}
        for task_id in task_ids:
            task = tasks_by_id[task_id]
            if task.kind == "Summary" and operation in {"status", "cancel"}:
                raise PV1DomainError("VALIDATION_FAILED", "Summary status is derived from descendants.", details={"task_id": task_id})
            if operation == "status" and value == "Done":
                await _validate_done_requirements(session, task=task, actor_id=actor_id, role=role, payload=payload)
            before = {"title": task.title, "description": task.description, "owner_id": task.owner_id, "priority": task.priority, "progress": task.progress, "estimate_hours": _serialize(task.estimate_hours), "remaining_workdays": task.remaining_workdays, "planning_weight": task.planning_weight, "mandatory": task.mandatory, "tags": task.tags or [], "status": task.status, "actual_started_at": _serialize(task.actual_started_at), "finished_at": _serialize(task.finished_at), "parent_task_id": task.parent_task_id}
            after = dict(before)
            if operation == "owner": after["owner_id"] = str(value) if value is not None else None
            elif operation == "priority": after["priority"] = value
            elif operation == "reparent": after["parent_task_id"] = str(value) if value else None
            else:
                after["status"] = "Cancelled" if operation == "cancel" else value
                if after["status"] == "Done": after.update({"progress": 100, "finished_at": _now().isoformat()})
                if after["status"] == "In progress" and not task.actual_started_at: after["actual_started_at"] = _now().isoformat()
            before_values[task_id] = before
            after_values[task_id] = after
            before_revisions[task_id] = task.revision
            after_revisions[task_id] = task.revision + 1
        for task_id in task_ids:
            task = tasks_by_id[task_id]
            after = after_values[task_id]
            for field_name in ("owner_id", "priority", "parent_task_id", "status", "progress", "actual_started_at", "finished_at"):
                if field_name not in after:
                    continue
                value_to_set = after[field_name]
                if field_name in {"actual_started_at", "finished_at"} and isinstance(value_to_set, str):
                    value_to_set = datetime.fromisoformat(value_to_set)
                setattr(task, field_name, value_to_set)
            task.revision += 1
            task.updated_by = actor_id
            task.updated_at = _now()
        project_result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision, models.PV1Project.graph_revision == project.graph_revision).values(revision=models.PV1Project.revision + 1, graph_revision=models.PV1Project.graph_revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project graph changed during the bulk write.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="task.bulk", aggregate_type="task_set", aggregate_id=project_id, aggregate_revision=project.graph_revision + 1, delta={"operation": operation, "task_ids": task_ids})
        await _record_task_history(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, command_type=command_type, before_values=before_values, after_values=after_values, before_revisions=before_revisions, after_revisions=after_revisions)
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision + 1, "task_revisions": after_revisions}, changed_entities=[{"kind": "task", "id": task_id} for task_id in task_ids], event_id=event_id)
    elif command_type in {"task.undo", "task.redo"}:
        original_command_id = str(payload.get("original_command_id") or "")
        history_result = await session.execute(select(models.PV1TaskCommandHistory).where(models.PV1TaskCommandHistory.tenant_id == tenant_id, models.PV1TaskCommandHistory.project_id == project_id, models.PV1TaskCommandHistory.actor_id == actor_id, models.PV1TaskCommandHistory.original_command_id == original_command_id))
        history = history_result.scalar_one_or_none()
        required_state = "Active" if command_type == "task.undo" else "Undone"
        if not history or history.state != required_state:
            raise PV1DomainError("VALIDATION_FAILED", "That task action is not available for undo/redo in this session.")
        expected_revisions = history.after_revisions if command_type == "task.undo" else {task_id: revision + 1 for task_id, revision in history.after_revisions.items()}
        next_values = history.before_values if command_type == "task.undo" else history.after_values
        task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id, models.PV1Task.id.in_(list(expected_revisions))))
        tasks_by_id = {task.id: task for task in task_result.scalars()}
        if any(task_id not in tasks_by_id or tasks_by_id[task_id].revision != revision for task_id, revision in expected_revisions.items()):
            raise PV1DomainError("REVISION_CONFLICT", "This action cannot be undone because another edit changed a touched task.", http_status=status.HTTP_409_CONFLICT, details={"conflict_diff": True})
        for task_id, values in next_values.items():
            task = tasks_by_id[task_id]
            for field_name, field_value in values.items():
                if field_name not in {"title", "description", "owner_id", "priority", "progress", "estimate_hours", "remaining_workdays", "planning_weight", "mandatory", "tags", "status", "parent_task_id", "actual_started_at", "finished_at", "start_date", "end_date", "point_date", "milestone_anchor", "duration_workdays", "start_pinned", "finish_pinned", "not_before_date"}:
                    continue
                if field_name in {"actual_started_at", "finished_at"} and isinstance(field_value, str):
                    field_value = datetime.fromisoformat(field_value)
                if field_name in {"start_date", "end_date", "point_date", "not_before_date"}:
                    field_value = _date(field_value)
                setattr(task, field_name, field_value)
            task.revision += 1
            task.updated_by = actor_id
            task.updated_at = _now()
        project_result = await session.execute(update(models.PV1Project).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision, models.PV1Project.graph_revision == project.graph_revision).values(revision=models.PV1Project.revision + 1, graph_revision=models.PV1Project.graph_revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project graph changed during undo/redo.", http_status=status.HTTP_409_CONFLICT)
        history.state = "Undone" if command_type == "task.undo" else "Active"
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="task_set", aggregate_id=project_id, aggregate_revision=project.graph_revision + 1, delta={"original_command_id": original_command_id})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision + 1, "task_revisions": {task_id: task.revision for task_id, task in tasks_by_id.items()}}, changed_entities=[{"kind": "task", "id": task_id} for task_id in tasks_by_id], event_id=event_id)
    elif command_type == "task.create":
        graph_expected = _require_expected(expected, "graph_revision")
        if graph_expected != project.graph_revision: raise PV1DomainError("REVISION_CONFLICT", "The task graph changed. Refresh before adding work.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"graph_revision": project.graph_revision}})
        title = str(payload.get("title") or "").strip()
        if not title or len(title) > 120: raise PV1DomainError("VALIDATION_FAILED", "Task title is required and must be at most 120 characters.")
        allowed = {"title", "kind", "parent_task_id", "owner_id", "milestone_id", "description", "priority", "status", "progress", "start_date", "end_date", "point_date", "milestone_anchor", "duration_workdays", "start_pinned", "finish_pinned", "not_before_date", "estimate_hours", "remaining_workdays", "planning_weight", "mandatory", "order_key", "tags"}
        unknown = set(payload) - allowed
        if unknown:
            raise PV1DomainError("VALIDATION_FAILED", "Unlisted task fields are rejected.", details={"fields": sorted(unknown)})
        kind = payload.get("kind", "Task")
        if kind not in {"Task", "Summary", "Milestone"}:
            raise PV1DomainError("VALIDATION_FAILED", "Task kind must be Task, Summary, or Milestone.")
        task_status = payload.get("status", "To Do")
        if task_status not in focus.WORK_STATUSES:
            raise PV1DomainError("VALIDATION_FAILED", "Task status must be To do, In progress, Blocked, Review, Done, or Cancelled.")
        if task_status == "Done":
            raise PV1DomainError("VALIDATION_FAILED", "Create the task first, then complete its acceptance criteria before marking it Done.")
        task_id = _new_id()
        parent_id = payload.get("parent_task_id")
        if parent_id:
            parent = await session.get(models.PV1Task, parent_id)
            if not parent or parent.project_id != project_id: raise PV1DomainError("VALIDATION_FAILED", "Parent task must belong to the same project.")
            depth = 1
            ancestor = parent
            while ancestor.parent_task_id:
                depth += 1
                ancestor = await session.get(models.PV1Task, ancestor.parent_task_id)
                if depth > 8:
                    raise PV1DomainError("VALIDATION_FAILED", "Outline depth cannot exceed 8 levels.")
        start_date = _date(payload.get("start_date"))
        end_date = _date(payload.get("end_date"))
        point_date = _date(payload.get("point_date"))
        milestone_anchor = payload.get("milestone_anchor", "finish" if kind == "Milestone" else "start")
        if milestone_anchor not in {"start", "finish"}:
            raise PV1DomainError("VALIDATION_FAILED", "milestone_anchor must be start or finish.")
        if start_date and end_date and end_date < start_date:
            raise PV1DomainError("VALIDATION_FAILED", "Task end_date must be on or after start_date.")
        progress = int(payload.get("progress", 0))
        if progress < 0 or progress > 100: raise PV1DomainError("VALIDATION_FAILED", "progress must be an integer from 0 to 100.")
        if kind == "Milestone" and (start_date or end_date or payload.get("estimate_hours") or payload.get("remaining_workdays") or payload.get("duration_workdays") not in {None, 0}):
            raise PV1DomainError("VALIDATION_FAILED", "Milestones use a point date and cannot carry duration or effort.")
        if kind == "Summary" and (payload.get("status") or payload.get("progress") or start_date or end_date or point_date or payload.get("duration_workdays") is not None):
            raise PV1DomainError("VALIDATION_FAILED", "Summary rows derive status, progress, and dates from descendants.")
        if payload.get("milestone_id"):
            milestone = await session.get(models.PV1Task, str(payload["milestone_id"]))
            if not milestone or milestone.project_id != project_id or milestone.kind != "Milestone":
                raise PV1DomainError("VALIDATION_FAILED", "Milestone must belong to the same project and be a Milestone task.")
        owner_id = str(payload.get("owner_id") or actor_id)
        owner_member = await session.scalar(select(models.PV1ProjectMember).where(models.PV1ProjectMember.tenant_id == tenant_id, models.PV1ProjectMember.project_id == project_id, models.PV1ProjectMember.user_id == owner_id))
        if not owner_member and role != "Tenant administrator":
            raise PV1DomainError("VALIDATION_FAILED", "Task owner must be an authorized project member.")
        calendar_record = await session.scalar(select(models.PV1ProjectCalendar).where(models.PV1ProjectCalendar.tenant_id == tenant_id, models.PV1ProjectCalendar.project_id == project_id))
        project_calendar = _schedule_calendar_value(project, calendar_record)
        try:
            if start_date: start_date = project_calendar.normalize(start_date)
            if end_date: end_date = project_calendar.normalize(end_date)
            if point_date: point_date = project_calendar.normalize(point_date)
            duration_workdays = 0 if kind == "Milestone" else payload.get("duration_workdays")
            if kind == "Task" and start_date and end_date:
                calculated_duration = project_calendar.duration(start_date, end_date)
                if duration_workdays is not None and duration_workdays != calculated_duration:
                    raise schedule.ScheduleError("INVALID_DURATION", "duration_workdays does not match the inclusive working-date range.")
                duration_workdays = calculated_duration
            if duration_workdays is not None and (not isinstance(duration_workdays, int) or isinstance(duration_workdays, bool) or duration_workdays < (0 if kind == "Milestone" else 1)):
                raise schedule.ScheduleError("INVALID_DURATION", "duration_workdays must be a positive integer for tasks.")
            not_before_date = _date(payload.get("not_before_date"))
            if not_before_date: not_before_date = project_calendar.normalize(not_before_date)
        except schedule.ScheduleError as error:
            raise PV1DomainError(error.code, str(error), details=error.details) from error
        session.add(models.PV1Task(id=task_id, tenant_id=tenant_id, project_id=project_id, parent_task_id=parent_id, milestone_id=payload.get("milestone_id"), kind=kind, title=title, description=payload.get("description"), owner_id=owner_id, status=task_status, priority=payload.get("priority", "Medium"), progress=progress, start_date=start_date, end_date=end_date, point_date=point_date, milestone_anchor=milestone_anchor, duration_workdays=duration_workdays, start_pinned=bool(payload.get("start_pinned", False)), finish_pinned=bool(payload.get("finish_pinned", False)), not_before_date=not_before_date, estimate_hours=payload.get("estimate_hours"), remaining_workdays=payload.get("remaining_workdays"), planning_weight=int(payload.get("planning_weight", 1)), mandatory=bool(payload.get("mandatory", True)), order_key=payload.get("order_key", 1024), tags=payload.get("tags") or [], created_by=actor_id, updated_by=actor_id))
        project_result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.graph_revision == project.graph_revision, models.PV1Project.revision == project.revision).values(graph_revision=models.PV1Project.graph_revision + 1, revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project graph changed while creating the task.", http_status=status.HTTP_409_CONFLICT)
        project_revision = project.revision + 1
        graph_revision = project.graph_revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="task.created", aggregate_type="task", aggregate_id=task_id, aggregate_revision=1, delta={"title": title})
        changed.append({"kind": "task", "id": task_id})
        response = _success(command_id, revisions={"project_revision": project_revision, "graph_revision": graph_revision, "task_revision": 1}, changed_entities=changed, event_id=event_id)
    elif command_type in {"task.update_fields", "task.transition"}:
        task_id = str(payload.get("task_id") or "")
        task = await session.get(models.PV1Task, task_id)
        if not task or task.tenant_id != tenant_id or task.project_id != project_id: raise PV1DomainError("NOT_FOUND", "Task not found.", http_status=status.HTTP_404_NOT_FOUND)
        task_expected = expected.get("task_revision")
        graph_expected = expected.get("graph_revision")
        if not isinstance(task_expected, int) or task_expected != task.revision or not isinstance(graph_expected, int) or graph_expected != project.graph_revision:
            raise PV1DomainError("REVISION_CONFLICT", "This task or graph changed. Review the latest version before saving.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"task_revision": task.revision, "graph_revision": project.graph_revision}})
        before_values = {"title": task.title, "description": task.description, "owner_id": task.owner_id, "priority": task.priority, "progress": task.progress, "estimate_hours": _serialize(task.estimate_hours), "remaining_workdays": task.remaining_workdays, "planning_weight": task.planning_weight, "mandatory": task.mandatory, "tags": task.tags or [], "status": task.status, "actual_started_at": _serialize(task.actual_started_at), "finished_at": _serialize(task.finished_at)}
        if command_type == "task.transition":
            to_status = payload.get("to_status")
            if to_status not in focus.WORK_STATUSES:
                raise PV1DomainError("VALIDATION_FAILED", "Task status must be To do, In progress, Blocked, Review, Done, or Cancelled.")
            if task.kind == "Summary":
                raise PV1DomainError("VALIDATION_FAILED", "Summary status is derived from descendants.")
            if to_status == "Done":
                await _validate_done_requirements(session, task=task, actor_id=actor_id, role=role, payload=payload)
            if to_status == "Blocked":
                reason = str(payload.get("blocker_reason") or "").strip()
                resolver_id = str(payload.get("resolver_id") or "").strip()
                if payload.get("blocker_source", "Manual") not in {"Manual", "Issue"}:
                    raise PV1DomainError("VALIDATION_FAILED", "Blocker source must be Manual or Issue.")
                resolver_member = await session.scalar(select(models.PV1ProjectMember).where(models.PV1ProjectMember.tenant_id == tenant_id, models.PV1ProjectMember.project_id == project_id, models.PV1ProjectMember.user_id == resolver_id))
                if not resolver_member and role != "Tenant administrator":
                    raise PV1DomainError("VALIDATION_FAILED", "Blocker resolver must be an authorized project member.")
                if not reason or not resolver_id:
                    raise PV1DomainError("VALIDATION_FAILED", "Blocked requires a blocker reason and resolver.", details={"field_errors": [{"field": "blocker_reason", "message": "Explain what is blocked."}, {"field": "resolver_id", "message": "Choose a blocker resolver."}]})
                review_date = _date(payload.get("review_date")) or _next_working_day(_now().date())
                session.add(models.PV1TaskBlocker(id=_new_id(), tenant_id=tenant_id, project_id=project_id, task_id=task_id, source=payload.get("blocker_source", "Manual"), reason=reason, resolver_id=resolver_id, review_date=review_date, state="Open", created_by=actor_id, updated_by=actor_id))
            changes = {"status": to_status}
            if to_status == "Done":
                changes.update({"progress": 100, "finished_at": _now()})
            elif task.status == "Done":
                reason = str(payload.get("reopen_reason") or "").strip()
                if not reason:
                    raise PV1DomainError("VALIDATION_FAILED", "Reopening Done requires a reason.")
                changes.update({"progress": await _last_non_done_progress(session, tenant_id=tenant_id, project_id=project_id, task_id=task_id), "finished_at": None})
            if to_status == "In progress" and task.actual_started_at is None:
                changes["actual_started_at"] = _now()
        else:
            allowed = {"title", "description", "owner_id", "priority", "progress", "estimate_hours", "remaining_workdays", "planning_weight", "mandatory", "tags"}
            unknown = set(payload) - allowed - {"task_id"}
            if unknown: raise PV1DomainError("VALIDATION_FAILED", "Unlisted task fields are rejected.", details={"fields": sorted(unknown)})
            changes = {key: value for key, value in payload.items() if key in allowed}
            if "owner_id" in changes:
                owner_member = await session.scalar(select(models.PV1ProjectMember).where(models.PV1ProjectMember.tenant_id == tenant_id, models.PV1ProjectMember.project_id == project_id, models.PV1ProjectMember.user_id == str(changes["owner_id"])))
                if not owner_member and role != "Tenant administrator":
                    raise PV1DomainError("VALIDATION_FAILED", "Task owner must be an authorized project member.")
        if "progress" in changes and (not isinstance(changes["progress"], int) or not 0 <= changes["progress"] <= 100): raise PV1DomainError("VALIDATION_FAILED", "progress must be an integer from 0 to 100.")
        if "title" in changes and (not str(changes["title"]).strip() or len(str(changes["title"])) > 120): raise PV1DomainError("VALIDATION_FAILED", "Task title is required and must be at most 120 characters.")
        if "planning_weight" in changes and (not isinstance(changes["planning_weight"], int) or not 1 <= changes["planning_weight"] <= 100): raise PV1DomainError("VALIDATION_FAILED", "planning_weight must be an integer from 1 to 100.")
        event_delta = {key: _serialize(value) for key, value in changes.items()}
        event_delta["previous_progress"] = task.progress
        changes.update({"revision": task.revision + 1, "updated_by": actor_id, "updated_at": func.now()})
        result = await session.execute(update(models.PV1Task).execution_options(synchronize_session=False).where(models.PV1Task.id == task_id, models.PV1Task.revision == task.revision).values(**changes))
        if result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Task changed during the write.", http_status=status.HTTP_409_CONFLICT)
        project_result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision, models.PV1Project.graph_revision == project.graph_revision).values(revision=models.PV1Project.revision + 1, graph_revision=models.PV1Project.graph_revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project graph changed during the task write.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="task", aggregate_id=task_id, aggregate_revision=task.revision + 1, delta=event_delta)
        after_values = dict(before_values)
        after_values.update({key: _serialize(value) for key, value in changes.items() if key in before_values})
        await _record_task_history(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, command_type=command_type, before_values={task_id: before_values}, after_values={task_id: after_values}, before_revisions={task_id: task.revision}, after_revisions={task_id: task.revision + 1})
        if task.status == "Blocked" and changes.get("status") != "Blocked":
            await session.execute(update(models.PV1TaskBlocker).where(models.PV1TaskBlocker.tenant_id == tenant_id, models.PV1TaskBlocker.project_id == project_id, models.PV1TaskBlocker.task_id == task_id, models.PV1TaskBlocker.source != "Dependency", models.PV1TaskBlocker.state == "Open").values(state="Resolved", updated_by=actor_id, updated_at=func.now(), revision=models.PV1TaskBlocker.revision + 1))
        changed.append({"kind": "task", "id": task_id})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision + 1, "task_revision": task.revision + 1}, changed_entities=changed, event_id=event_id)
    elif command_type == "criterion.create":
        description = str(payload.get("description") or "").strip()
        if not description or len(description) > 2000:
            raise PV1DomainError("VALIDATION_FAILED", "Acceptance criterion description is required and must be at most 2000 characters.")
        parent_kind = payload.get("parent_kind", "Project")
        task_id = str(payload.get("parent_id") or "") if parent_kind == "Task" else None
        parent_task = await session.get(models.PV1Task, task_id) if task_id else None
        if parent_kind not in {"Project", "Task"} or (task_id and (not parent_task or parent_task.project_id != project_id or parent_task.tenant_id != tenant_id)):
            raise PV1DomainError("VALIDATION_FAILED", "Criterion parent must be this project or a task in this project.")
        criterion_id = _new_id()
        session.add(models.PV1TaskCriterion(id=criterion_id, tenant_id=tenant_id, project_id=project_id, task_id=task_id, description=description, mandatory=bool(payload.get("mandatory", True)), created_by=actor_id, updated_by=actor_id))
        project_result = await session.execute(update(models.PV1Project).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project changed while adding acceptance.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="criterion", aggregate_id=criterion_id, aggregate_revision=1, delta={"description": description})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "criterion", "id": criterion_id}], event_id=event_id)
    elif command_type == "criterion.review":
        criterion_id = str(payload.get("criterion_id") or "")
        criterion = await session.get(models.PV1TaskCriterion, criterion_id)
        if not criterion or criterion.tenant_id != tenant_id or criterion.project_id != project_id:
            raise PV1DomainError("NOT_FOUND", "Acceptance criterion not found.", http_status=status.HTTP_404_NOT_FOUND)
        to_state = payload.get("to_state")
        if to_state not in {"Open", "Passed", "Waived"}:
            raise PV1DomainError("VALIDATION_FAILED", "Criterion state is invalid.")
        evidence_ids = payload.get("evidence_ids") or []
        if to_state == "Passed" and not evidence_ids:
            raise PV1DomainError("VALIDATION_FAILED", "Passed acceptance requires evidence references.")
        waiver_reason = str(payload.get("waiver_reason") or "").strip()
        if to_state == "Waived" and (not waiver_reason or role not in {"Owner", "Lead", "Tenant administrator"}):
            raise PV1DomainError("FORBIDDEN" if role not in {"Owner", "Lead", "Tenant administrator"} else "VALIDATION_FAILED", "Waived acceptance requires an Owner/Lead rationale.", http_status=status.HTTP_403_FORBIDDEN if role not in {"Owner", "Lead", "Tenant administrator"} else 422)
        criterion.state = to_state
        criterion.evidence_refs = evidence_ids
        criterion.reviewer = actor_id
        criterion.waiver_reason = waiver_reason or None
        criterion.revision += 1
        criterion.updated_by = actor_id
        criterion.updated_at = _now()
        project_result = await session.execute(update(models.PV1Project).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project changed while reviewing acceptance.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="criterion", aggregate_id=criterion_id, aggregate_revision=criterion.revision, delta={"state": to_state})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "criterion", "id": criterion_id}], event_id=event_id)
    elif command_type == "blocker.resolve":
        blocker_id = str(payload.get("blocker_id") or "")
        blocker = await session.get(models.PV1TaskBlocker, blocker_id)
        if not blocker or blocker.tenant_id != tenant_id or blocker.project_id != project_id:
            raise PV1DomainError("NOT_FOUND", "Blocker not found.", http_status=status.HTTP_404_NOT_FOUND)
        if blocker.source == "Dependency":
            raise PV1DomainError("VALIDATION_FAILED", "Dependency blockers recompute from the dependency graph and cannot be manually falsified.")
        resolution = str(payload.get("resolution") or "").strip()
        if not resolution:
            raise PV1DomainError("VALIDATION_FAILED", "A blocker resolution is required.")
        blocker.state = "Resolved"
        blocker.updated_by = actor_id
        blocker.updated_at = _now()
        blocker.revision += 1
        project_result = await session.execute(update(models.PV1Project).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project changed while resolving the blocker.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="blocker", aggregate_id=blocker_id, aggregate_revision=blocker.revision, delta={"resolution": resolution})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "blocker", "id": blocker_id}], event_id=event_id)
    elif command_type == "schedule.apply":
        graph_expected = _require_expected(expected, "graph_revision")
        calendar_expected = _require_expected(expected, "calendar_revision")
        if graph_expected != project.graph_revision or calendar_expected != project.calendar_revision:
            raise PV1DomainError("REVISION_CONFLICT", "The schedule changed after preview.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"graph_revision": project.graph_revision, "calendar_revision": project.calendar_revision}})
        response = await _apply_project_schedule(session, tenant_id=tenant_id, project=project, actor_id=actor_id, command_id=command_id, payload=payload)
        event_id = response["event_id"]
    elif command_type in {"dependency.create", "dependency.update", "dependency.remove"}:
        graph_expected = _require_expected(expected, "graph_revision")
        if graph_expected != project.graph_revision:
            raise PV1DomainError("REVISION_CONFLICT", "The dependency graph changed.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"graph_revision": project.graph_revision}})
        dependency: models.PV1Dependency | None = None
        if command_type == "dependency.create":
            predecessor_id = str(payload.get("predecessor_id") or "")
            successor_id = str(payload.get("successor_id") or "")
            dependency_type = str(payload.get("dependency_type") or "FS")
            lag_days = payload.get("lag_days", 0)
            if predecessor_id == successor_id:
                raise PV1DomainError("INVALID_DEPENDENCY", "A task cannot depend on itself.")
            task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id, models.PV1Task.id.in_([predecessor_id, successor_id])))
            endpoints = {item.id: item for item in task_result.scalars()}
            if len(endpoints) != 2:
                raise PV1DomainError("MISSING_ENDPOINT", "Both dependency endpoints must be tasks in this project.")
            if any(item.kind == "Summary" for item in endpoints.values()):
                raise PV1DomainError("INVALID_DEPENDENCY", "Summary rows cannot be dependency endpoints.")
            duplicate = await session.scalar(select(models.PV1Dependency).where(
                models.PV1Dependency.tenant_id == tenant_id,
                models.PV1Dependency.project_id == project_id,
                models.PV1Dependency.predecessor_id == predecessor_id,
                models.PV1Dependency.successor_id == successor_id,
                models.PV1Dependency.dependency_type == dependency_type,
            ))
            if duplicate:
                raise PV1DomainError("DUPLICATE_DEPENDENCY", "That dependency type already exists between these tasks.", http_status=status.HTTP_409_CONFLICT, details={"dependency_id": duplicate.id})
            dependency_id = _new_id()
            dependency = models.PV1Dependency(id=dependency_id, tenant_id=tenant_id, project_id=project_id, predecessor_id=predecessor_id, successor_id=successor_id, dependency_type=dependency_type, lag_days=lag_days, active=True, created_by=actor_id, updated_by=actor_id)
        else:
            dependency_id = str(payload.get("dependency_id") or "")
            dependency = await session.get(models.PV1Dependency, dependency_id)
            if not dependency or dependency.tenant_id != tenant_id or dependency.project_id != project_id:
                raise PV1DomainError("NOT_FOUND", "Dependency not found.", http_status=status.HTTP_404_NOT_FOUND)
            dependency_expected = _require_expected(expected, "dependency_revision")
            if dependency_expected != dependency.revision:
                raise PV1DomainError("REVISION_CONFLICT", "The dependency changed.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"dependency_revision": dependency.revision}})
            predecessor_id = dependency.predecessor_id
            successor_id = dependency.successor_id
            dependency_type = str(payload.get("dependency_type") or dependency.dependency_type)
            lag_days = payload.get("lag_days", dependency.lag_days)
            if command_type == "dependency.update":
                duplicate = await session.scalar(select(models.PV1Dependency).where(
                    models.PV1Dependency.tenant_id == tenant_id,
                    models.PV1Dependency.project_id == project_id,
                    models.PV1Dependency.predecessor_id == predecessor_id,
                    models.PV1Dependency.successor_id == successor_id,
                    models.PV1Dependency.dependency_type == dependency_type,
                    models.PV1Dependency.id != dependency.id,
                ))
                if duplicate:
                    raise PV1DomainError("DUPLICATE_DEPENDENCY", "That dependency type already exists between these tasks.", http_status=status.HTTP_409_CONFLICT)
        try:
            candidate = schedule.ScheduleEdge(id=dependency_id, predecessor_id=predecessor_id, successor_id=successor_id, dependency_type=dependency_type, lag_days=lag_days, active=command_type != "dependency.remove")
        except schedule.ScheduleError as error:
            raise _schedule_error(error) from error
        graph_result = await session.execute(select(models.PV1Dependency).where(models.PV1Dependency.tenant_id == tenant_id, models.PV1Dependency.project_id == project_id, models.PV1Dependency.active.is_(True)))
        graph_edges = [_schedule_edge_value(item) for item in graph_result.scalars() if item.id != dependency_id]
        if candidate.active:
            graph_edges.append(candidate)
        task_ids_result = await session.execute(select(models.PV1Task.id).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id))
        path = schedule.cycle_path(list(task_ids_result.scalars()), graph_edges)
        if path:
            raise PV1DomainError("DEPENDENCY_CYCLE", "This dependency would create a cycle.", http_status=status.HTTP_409_CONFLICT, details={"cycle_path": path})
        if command_type == "dependency.create":
            session.add(dependency)
            dependency_revision = 1
        else:
            dependency.dependency_type = dependency_type
            dependency.lag_days = lag_days
            dependency.active = command_type != "dependency.remove"
            dependency.revision += 1
            dependency.updated_by = actor_id
            dependency.updated_at = _now()
            dependency_revision = dependency.revision
        project_result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision, models.PV1Project.graph_revision == project.graph_revision).values(revision=models.PV1Project.revision + 1, graph_revision=models.PV1Project.graph_revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1:
            raise PV1DomainError("REVISION_CONFLICT", "Project graph changed while saving the dependency.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="dependency", aggregate_id=dependency_id, aggregate_revision=dependency_revision, delta={"predecessor_id": predecessor_id, "successor_id": successor_id, "dependency_type": dependency_type, "lag_days": lag_days, "active": candidate.active})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision + 1, "dependency_revision": dependency_revision}, changed_entities=[{"kind": "dependency", "id": dependency_id}], event_id=event_id)
    elif command_type in {"external_dependency.create", "external_dependency.refresh", "external_dependency.confirm", "external_dependency.remove"}:
        graph_expected = _require_expected(expected, "graph_revision")
        if graph_expected != project.graph_revision:
            raise PV1DomainError("REVISION_CONFLICT", "The dependency graph changed.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"graph_revision": project.graph_revision}})
        calendar_record = await session.scalar(select(models.PV1ProjectCalendar).where(models.PV1ProjectCalendar.tenant_id == tenant_id, models.PV1ProjectCalendar.project_id == project_id))
        project_calendar = _schedule_calendar_value(project, calendar_record)
        if command_type == "external_dependency.create":
            local_task_id = str(payload.get("local_task_id") or "")
            local_task = await session.get(models.PV1Task, local_task_id)
            if not local_task or local_task.tenant_id != tenant_id or local_task.project_id != project_id:
                raise PV1DomainError("MISSING_ENDPOINT", "The local dependency endpoint is unavailable.")
            if local_task.kind == "Summary":
                raise PV1DomainError("INVALID_DEPENDENCY", "Summary rows cannot be dependency endpoints.")
            external_project_ref = str(payload.get("external_project_ref") or "").strip()
            external_task_ref = str(payload.get("external_task_ref") or "").strip()
            published_revision = payload.get("external_milestone_revision")
            if not external_project_ref or not external_task_ref or not isinstance(published_revision, int) or isinstance(published_revision, bool) or published_revision < 1:
                raise PV1DomainError("VALIDATION_FAILED", "External dependencies require opaque project/task references and a positive published milestone revision.")
            access_policy = str(payload.get("access_policy") or "Visible")
            if access_policy not in {"Visible", "Redacted", "Unavailable"}:
                raise PV1DomainError("VALIDATION_FAILED", "External dependency access policy is invalid.")
            dependency_type = str(payload.get("dependency_type") or "FS")
            lag_days = payload.get("lag_days", 0)
            external_anchor = str(payload.get("external_anchor") or "finish")
            if external_anchor not in {"start", "finish"}:
                raise PV1DomainError("VALIDATION_FAILED", "External milestone anchor must be start or finish.")
            try:
                schedule.ScheduleEdge(id="external-validation", predecessor_id="external", successor_id=local_task_id, dependency_type=dependency_type, lag_days=lag_days)
                external_date = _date(payload.get("external_date"))
                if external_date:
                    external_date = project_calendar.normalize(external_date)
            except schedule.ScheduleError as error:
                raise _schedule_error(error) from error
            confirmed = bool(payload.get("confirmed", False))
            if confirmed and (access_policy != "Visible" or external_date is None):
                raise PV1DomainError("VALIDATION_FAILED", "Only a visible external milestone date can be confirmed.")
            duplicate = await session.scalar(select(models.PV1ExternalDependency).where(
                models.PV1ExternalDependency.tenant_id == tenant_id,
                models.PV1ExternalDependency.project_id == project_id,
                models.PV1ExternalDependency.local_task_id == local_task_id,
                models.PV1ExternalDependency.external_project_ref == external_project_ref,
                models.PV1ExternalDependency.external_task_ref == external_task_ref,
                models.PV1ExternalDependency.dependency_type == dependency_type,
                models.PV1ExternalDependency.active.is_(True),
            ))
            if duplicate:
                raise PV1DomainError("DUPLICATE_DEPENDENCY", "That external dependency already exists.", http_status=status.HTTP_409_CONFLICT, details={"external_dependency_id": duplicate.id})
            external_dependency_id = _new_id()
            external_dependency = models.PV1ExternalDependency(
                id=external_dependency_id, tenant_id=tenant_id, project_id=project_id, local_task_id=local_task_id,
                external_project_ref=external_project_ref, external_task_ref=external_task_ref,
                external_milestone_revision=published_revision, external_date=external_date,
                observed_milestone_revision=published_revision, observed_date=external_date,
                external_anchor=external_anchor, access_policy=access_policy, dependency_type=dependency_type,
                lag_days=lag_days, confirmed=confirmed, active=True, created_by=actor_id, updated_by=actor_id,
            )
            session.add(external_dependency)
            external_revision = 1
        else:
            external_dependency_id = str(payload.get("external_dependency_id") or "")
            external_dependency = await session.get(models.PV1ExternalDependency, external_dependency_id)
            if not external_dependency or external_dependency.tenant_id != tenant_id or external_dependency.project_id != project_id:
                raise PV1DomainError("NOT_FOUND", "External dependency not found.", http_status=status.HTTP_404_NOT_FOUND)
            external_expected = _require_expected(expected, "external_dependency_revision")
            if external_expected != external_dependency.revision:
                raise PV1DomainError("REVISION_CONFLICT", "The external dependency changed.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"external_dependency_revision": external_dependency.revision}})
            if command_type == "external_dependency.refresh":
                observed_revision = payload.get("observed_milestone_revision")
                if not isinstance(observed_revision, int) or isinstance(observed_revision, bool) or observed_revision < 1:
                    raise PV1DomainError("VALIDATION_FAILED", "Observed milestone revision must be positive.")
                observed_date = _date(payload.get("observed_date"))
                try:
                    if observed_date:
                        observed_date = project_calendar.normalize(observed_date)
                except schedule.ScheduleError as error:
                    raise _schedule_error(error) from error
                external_dependency.observed_milestone_revision = observed_revision
                external_dependency.observed_date = observed_date
                if observed_revision != external_dependency.external_milestone_revision or observed_date != external_dependency.external_date:
                    external_dependency.confirmed = False
            elif command_type == "external_dependency.confirm":
                if external_dependency.access_policy != "Visible" or external_dependency.observed_date is None or external_dependency.observed_milestone_revision is None:
                    raise PV1DomainError("VALIDATION_FAILED", "A visible observed milestone revision and date are required before confirmation.")
                external_dependency.external_milestone_revision = external_dependency.observed_milestone_revision
                external_dependency.external_date = external_dependency.observed_date
                external_dependency.confirmed = True
            else:
                external_dependency.active = False
                external_dependency.confirmed = False
            external_dependency.revision += 1
            external_dependency.updated_by = actor_id
            external_dependency.updated_at = _now()
            external_revision = external_dependency.revision
        project_result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision, models.PV1Project.graph_revision == project.graph_revision).values(revision=models.PV1Project.revision + 1, graph_revision=models.PV1Project.graph_revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1:
            raise PV1DomainError("REVISION_CONFLICT", "Project graph changed while saving the external dependency.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="external_dependency", aggregate_id=external_dependency_id, aggregate_revision=external_revision, delta={"local_task_id": external_dependency.local_task_id, "confirmed": external_dependency.confirmed, "active": external_dependency.active, "pinned_revision": external_dependency.external_milestone_revision, "observed_revision": external_dependency.observed_milestone_revision})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision + 1, "external_dependency_revision": external_revision}, changed_entities=[{"kind": "external_dependency", "id": external_dependency_id}], event_id=event_id)
    elif command_type in {"baseline.capture", "baseline.set_default"}:
        if command_type == "baseline.capture":
            graph_expected = _require_expected(expected, "graph_revision")
            calendar_expected = _require_expected(expected, "calendar_revision")
            if graph_expected != project.graph_revision or calendar_expected != project.calendar_revision:
                raise PV1DomainError("REVISION_CONFLICT", "Schedule changed before baseline capture.", http_status=status.HTTP_409_CONFLICT)
            label = str(payload.get("label") or "").strip()
            rationale = str(payload.get("rationale") or "").strip() or None
            if not label or len(label) > 120:
                raise PV1DomainError("VALIDATION_FAILED", "Baseline label is required and must be at most 120 characters.")
            calendar_record, task_records, dependency_records, _, baselines = await _schedule_records(session, tenant_id=tenant_id, project_id=project_id)
            if calendar_record is None:
                raise PV1DomainError("SCHEDULE_UNAVAILABLE", "Project calendar is unavailable.", http_status=status.HTTP_409_CONFLICT)
            baseline_id = _new_id()
            is_default = not baselines
            snapshot = {
                "calendar": _schedule_calendar_value(project, calendar_record).to_dict(),
                "tasks": [task_dict(item) for item in task_records],
                "dependencies": [_dependency_dict(item) for item in dependency_records],
            }
            session.add(models.PV1ScheduleBaseline(id=baseline_id, tenant_id=tenant_id, project_id=project_id, owner_id=actor_id, label=label, rationale=rationale, calendar_revision=calendar_record.revision, graph_revision=project.graph_revision, snapshot=snapshot, is_default=is_default))
        else:
            baseline_id = str(payload.get("baseline_id") or "")
            baseline = await session.get(models.PV1ScheduleBaseline, baseline_id)
            if not baseline or baseline.tenant_id != tenant_id or baseline.project_id != project_id:
                raise PV1DomainError("NOT_FOUND", "Schedule baseline not found.", http_status=status.HTTP_404_NOT_FOUND)
            await session.execute(update(models.PV1ScheduleBaseline).where(models.PV1ScheduleBaseline.tenant_id == tenant_id, models.PV1ScheduleBaseline.project_id == project_id).values(is_default=False))
            baseline.is_default = True
            is_default = True
        project_result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(comparison_baseline_id=baseline_id, revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1:
            raise PV1DomainError("REVISION_CONFLICT", "Project changed while saving the baseline.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="baseline", aggregate_id=baseline_id, aggregate_revision=1, delta={"is_default": is_default})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision, "calendar_revision": project.calendar_revision}, changed_entities=[{"kind": "baseline", "id": baseline_id}], event_id=event_id)
    elif command_type in {"risk.save", "decision.request", "decision.decide"}:
        if command_type == "decision.request":
            title = str(payload.get("title") or "").strip(); record_type = "Decision"; state = "Requested"
            approver_ids = [str(item).strip() for item in (payload.get("approver_ids") or []) if str(item).strip()]
            if not title or not approver_ids: raise PV1DomainError("VALIDATION_FAILED", "A decision request requires a title and at least one named approver.")
            record_payload = {key: payload.get(key) for key in ("context", "options", "recommendation", "due_date", "impact_summary", "related_task_ids", "related_milestone_ids", "related_architecture_ids") if key in payload}
            record_payload["approver_ids"] = approver_ids
        elif command_type == "decision.decide":
            record_id = str(payload.get("decision_id") or "")
            record = await session.get(models.PV1GovernanceRecord, record_id)
            if not record or record.tenant_id != tenant_id or record.project_id != project_id or record.record_type != "Decision": raise PV1DomainError("NOT_FOUND", "Decision not found.", http_status=status.HTTP_404_NOT_FOUND)
            if record.state in {"Approved", "Rejected", "Superseded"}: raise PV1DomainError("VALIDATION_FAILED", "Approved decisions are immutable; create a superseding decision to amend one.")
            if actor_id not in (record.payload or {}).get("approver_ids", []) and actor_id != (record.payload or {}).get("approver_id"):
                raise PV1DomainError("FORBIDDEN", "Only a named approver may decide this request.", http_status=status.HTTP_403_FORBIDDEN)
            outcome = payload.get("outcome")
            if outcome not in {"Approved", "Rejected"}: raise PV1DomainError("VALIDATION_FAILED", "Decision outcome must be Approved or Rejected.")
            current_payload = record.payload or {}
            approvers = set(current_payload.get("approver_ids") or [current_payload.get("approver_id")]) - {None, ""}
            approvals = set(current_payload.get("approvals") or [])
            approvals.add(actor_id)
            record.state = outcome if outcome == "Rejected" or approvals >= approvers else "Requested"
            record.payload = {**current_payload, "approvals": sorted(approvals), "decision_rationale": str(payload.get("rationale") or ""), "decided_by": actor_id}
            record.revision += 1; record.updated_by = actor_id; record.updated_at = _now()
            record_payload = record.payload; title = record.title; record_type = "Decision"; state = record.state; record_id = record.id
        else:
            record_type = payload.get("kind") or "Risk"; title = str(payload.get("title") or "").strip(); state = payload.get("state", "Open")
            if record_type not in {"Risk", "Issue", "Assumption"} or not title: raise PV1DomainError("VALIDATION_FAILED", "Risk, Issue, and Assumption require a typed kind and title.")
            record_payload = dict(payload.get("fields") or {})
            if record_type == "Risk":
                probability, impact = int(record_payload.get("probability", 0)), int(record_payload.get("impact", 0))
                if probability not in range(1, 6) or impact not in range(1, 6): raise PV1DomainError("VALIDATION_FAILED", "Risk probability and impact must be integers from 1 to 5.")
                exposure = probability * impact; record_payload["exposure"] = exposure; record_payload["exposure_level"] = "Low" if exposure <= 4 else "Medium" if exposure <= 9 else "High" if exposure <= 15 else "Critical"
        if command_type != "decision.decide":
            record_id = str(payload.get("id") or _new_id())
            existing_record = await session.get(models.PV1GovernanceRecord, record_id)
            if existing_record:
                if existing_record.state in {"Approved", "Rejected", "Superseded"}: raise PV1DomainError("VALIDATION_FAILED", "This governance record is immutable; create a new version.")
                existing_record.title = title; existing_record.state = state; existing_record.payload = record_payload; existing_record.owner_id = payload.get("owner_id") or actor_id; existing_record.revision += 1; existing_record.updated_by = actor_id; existing_record.updated_at = _now()
            else:
                session.add(models.PV1GovernanceRecord(id=record_id, tenant_id=tenant_id, project_id=project_id, record_type=record_type, title=title, state=state, owner_id=payload.get("owner_id") or actor_id, payload=record_payload, created_by=actor_id, updated_by=actor_id))
        project_result = await session.execute(update(models.PV1Project).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project changed while saving the planning record.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type=record_type.lower(), aggregate_id=record_id, aggregate_revision=(record.revision if command_type == "decision.decide" else 1), delta={"state": state})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision}, changed_entities=[{"kind": record_type.lower(), "id": record_id}], event_id=event_id)
    elif command_type in {"resource.save", "resource.link", "resource.unlink"}:
        resource_id = str(payload.get("resource_id") or payload.get("id") or _new_id())
        resource = await session.get(models.PV1Resource, resource_id)
        if resource and resource.tenant_id != tenant_id:
            raise PV1DomainError("NOT_FOUND", "Resource not found.", http_status=status.HTTP_404_NOT_FOUND)
        if command_type == "resource.save":
            title = str(payload.get("title") or "").strip(); kind = payload.get("resource_kind", "General note")
            if not title or len(title) > 120 or kind not in {"Brief supplement", "Specification", "Runbook", "Test evidence", "Design decision", "General note"}:
                raise PV1DomainError("VALIDATION_FAILED", "Resource title and document type are required.")
            content = str(payload.get("content") or "")
            if "<script" in content.casefold(): raise PV1DomainError("VALIDATION_FAILED", "Unsafe resource content is rejected.")
            if resource:
                if resource.project_id != project_id or resource.revision != int(payload.get("revision", resource.revision)): raise PV1DomainError("REVISION_CONFLICT", "This resource changed. Review the latest version.", http_status=status.HTTP_409_CONFLICT)
                resource.title = title; resource.content = content; resource.resource_kind = kind; resource.pinned = bool(payload.get("pinned", resource.pinned)); resource.revision += 1; resource.updated_by = actor_id; resource.updated_at = _now()
            else:
                session.add(models.PV1Resource(id=resource_id, tenant_id=tenant_id, project_id=project_id, resource_kind=kind, title=title, content=content, upload_ref=payload.get("upload_ref"), scan_state="Available", sensitivity=payload.get("sensitivity", "Project"), pinned=bool(payload.get("pinned", False)), links=[], created_by=actor_id, updated_by=actor_id))
        else:
            if not resource or resource.project_id != project_id: raise PV1DomainError("NOT_FOUND", "Resource not found.", http_status=status.HTTP_404_NOT_FOUND)
            links = list(resource.links or [])
            parent_ref = {"parent_kind": payload.get("parent_kind"), "parent_id": str(payload.get("parent_id") or "")}
            if command_type == "resource.link" and parent_ref not in links: links.append(parent_ref)
            if command_type == "resource.unlink": links = [item for item in links if item != parent_ref]
            resource.links = links; resource.revision += 1; resource.updated_by = actor_id; resource.updated_at = _now()
        project_result = await session.execute(update(models.PV1Project).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project changed while saving the resource.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="resource", aggregate_id=resource_id, aggregate_revision=(resource.revision if resource else 1), delta={"resource_id": resource_id})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "resource", "id": resource_id}], event_id=event_id)
    elif command_type == "delivery.accept":
        list_fields = {"task_revision_ids", "criterion_revision_ids", "evidence_revision_ids", "residual_obligation_ids", "followups"}
        unknown = set(payload) - list_fields
        if unknown or any(not isinstance(payload.get(field, []), list) for field in list_fields):
            raise PV1DomainError("VALIDATION_FAILED", "Delivery acceptance requires bounded revision and evidence lists.", details={"fields": sorted(unknown)})
        if project.phase != "Validating":
            raise PV1DomainError("VALIDATION_FAILED", "Delivery can be accepted only from Validating.")
        acceptance_id = _new_id()
        session.add(models.PV1DeliveryAcceptance(
            id=acceptance_id,
            tenant_id=tenant_id,
            project_id=project_id,
            task_revision_ids=payload.get("task_revision_ids") or [],
            criterion_revision_ids=payload.get("criterion_revision_ids") or [],
            evidence_revision_ids=payload.get("evidence_revision_ids") or [],
            residual_obligation_ids=payload.get("residual_obligation_ids") or [],
            followups=payload.get("followups") or [],
            reviewer_id=actor_id,
            created_by=actor_id,
            updated_by=actor_id,
        ))
        await session.flush()
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(phase="Delivered", actual_delivery_at=_now(), revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1:
            raise PV1DomainError("REVISION_CONFLICT", "Delivery state changed concurrently.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="delivery.accepted", aggregate_type="delivery_acceptance", aggregate_id=acceptance_id, aggregate_revision=1, delta={"phase": "Delivered", "acceptance_id": acceptance_id})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "delivery_acceptance", "id": acceptance_id}, {"kind": "project", "id": project_id}], event_id=event_id)
    elif command_type == "delivery.reopen":
        reason = str(payload.get("reason") or "").strip()
        if not reason or len(reason) > 2000:
            raise PV1DomainError("VALIDATION_FAILED", "A delivery reopen reason is required and must be at most 2000 characters.")
        if project.phase != "Delivered":
            raise PV1DomainError("VALIDATION_FAILED", "Only Delivered projects can be reopened.")
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(phase="Validating", revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1:
            raise PV1DomainError("REVISION_CONFLICT", "Delivery state changed concurrently.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="delivery.reopened", aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta={"reason": reason})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "project", "id": project_id}], event_id=event_id)
    elif command_type == "metric.define":
        allowed = {"name", "kind", "description", "unit", "direction", "baseline", "target_spec", "target_date", "steward_id", "measurement_method", "population_definition", "cadence_days", "required_for_success", "required_consecutive_periods"}
        unknown = set(payload) - allowed
        if unknown:
            raise PV1DomainError("VALIDATION_FAILED", "Unlisted metric fields are rejected.", details={"fields": sorted(unknown)})
        required = {"name", "kind", "unit", "direction", "steward_id", "measurement_method", "target_spec"}
        missing = sorted(field for field in required if payload.get(field) in (None, ""))
        if missing:
            raise PV1DomainError("VALIDATION_FAILED", "Metric definition is missing required fields.", details={"fields": missing})
        if payload.get("kind") not in {"Adoption", "Value", "Quality", "Reliability", "Decision", "Custom"} or payload.get("direction") not in {"Increase", "Decrease", "Within range", "Binary"}:
            raise PV1DomainError("VALIDATION_FAILED", "Metric kind or direction is invalid.")
        if not isinstance(payload.get("target_spec"), dict):
            raise PV1DomainError("VALIDATION_FAILED", "target_spec must be an object.")
        metric_id = _new_id()
        metric = models.PV1Metric(id=metric_id, tenant_id=tenant_id, project_id=project_id, name=payload.get("name"), kind=payload.get("kind"), description=payload.get("description"), unit=payload.get("unit"), direction=payload.get("direction"), baseline=payload.get("baseline"), target_spec=payload.get("target_spec"), target_date=_date(payload.get("target_date")), steward_id=payload.get("steward_id") or actor_id, measurement_method=payload.get("measurement_method"), population_definition=payload.get("population_definition"), cadence_days=payload.get("cadence_days", 14), required_for_success=payload.get("required_for_success", False), required_consecutive_periods=payload.get("required_consecutive_periods", 1), created_by=actor_id, updated_by=actor_id)
        session.add(metric)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="metric.defined", aggregate_type="metric", aggregate_id=metric_id, aggregate_revision=1, delta={"definition_revision": 1})
        response = _success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision, "metric_revision": 1}, changed_entities=[{"kind": "metric", "id": metric_id}], event_id=event_id)
    elif command_type == "measurement.record":
        metric_id = str(payload.get("metric_id") or "")
        metric = await session.get(models.PV1Metric, metric_id)
        if not metric or metric.project_id != project_id or metric.tenant_id != tenant_id: raise PV1DomainError("NOT_FOUND", "Metric not found.", http_status=status.HTTP_404_NOT_FOUND)
        if payload.get("definition_revision") != metric.definition_revision: raise PV1DomainError("REVISION_CONFLICT", "Metric definition changed.", http_status=status.HTTP_409_CONFLICT)
        period_start, period_end = _date(payload.get("period_start")), _date(payload.get("period_end"))
        if not period_start or not period_end or period_end <= period_start: raise PV1DomainError("VALIDATION_FAILED", "Measurement period must be nonempty and end after start.")
        numerator, denominator = payload.get("numerator"), payload.get("denominator")
        if not payload.get("unit") or not payload.get("source"):
            raise PV1DomainError("VALIDATION_FAILED", "Measurement unit and source are required.")
        if numerator is None and payload.get("observed_numeric") is None and payload.get("observed_binary") is None:
            raise PV1DomainError("VALIDATION_FAILED", "A measurement value or numerator/denominator is required.")
        if numerator is not None and denominator is None:
            raise PV1DomainError("VALIDATION_FAILED", "A numerator requires a denominator.")
        if numerator is not None and denominator is not None and numerator > denominator: raise PV1DomainError("VALIDATION_FAILED", "Active eligible count cannot exceed eligible count.")
        if denominator == 0 and numerator is not None:
            raise PV1DomainError("VALIDATION_FAILED", "A zero-eligible period is not a numeric adoption result.")
        measurement_id = _new_id()
        session.add(models.PV1Measurement(id=measurement_id, tenant_id=tenant_id, project_id=project_id, metric_id=metric_id, definition_revision=metric.definition_revision, period_start=period_start, period_end=period_end, observed_numeric=payload.get("observed_numeric"), observed_binary=payload.get("observed_binary"), numerator=numerator, denominator=denominator, unit=payload.get("unit"), source=payload.get("source"), evidence=payload.get("evidence") or [], recorder_id=actor_id, quality=payload.get("quality", "Unverified"), created_by=actor_id, updated_by=actor_id))
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="measurement.recorded", aggregate_type="measurement", aggregate_id=measurement_id, aggregate_revision=1, delta={"metric_id": metric_id, "quality": payload.get("quality", "Unverified")})
        response = _success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision, "metric_revision": metric.definition_revision}, changed_entities=[{"kind": "measurement", "id": measurement_id}], event_id=event_id)
    elif command_type == "value.record":
        required = {"classification", "amount", "currency_or_unit", "period_start", "period_end", "attribution_key", "source"}
        missing = sorted(field for field in required if payload.get(field) in (None, ""))
        if missing:
            raise PV1DomainError("VALIDATION_FAILED", "Value entry is missing required fields.", details={"fields": missing})
        if payload.get("classification") not in {"Cash saving", "Capacity value", "Revenue", "Cost avoidance", "Cost"}:
            raise PV1DomainError("VALIDATION_FAILED", "Invalid value classification.")
        fraction = _decimal(payload.get("fraction", "1"), "fraction")
        if fraction < 0 or fraction > 1: raise PV1DomainError("VALIDATION_FAILED", "fraction must be between 0 and 1.")
        attribution_key = str(payload.get("attribution_key") or "")
        period_start, period_end = _date(payload.get("period_start")), _date(payload.get("period_end"))
        if not period_start or not period_end or period_end <= period_start:
            raise PV1DomainError("VALIDATION_FAILED", "Value period must be nonempty and end after start.")
        result = await session.execute(select(func.coalesce(func.sum(models.PV1ValueEntry.fraction), 0)).where(models.PV1ValueEntry.tenant_id == tenant_id, models.PV1ValueEntry.attribution_key == attribution_key))
        if Decimal(str(result.scalar_one())) + fraction > 1: raise PV1DomainError("VALIDATION_FAILED", "Approved attribution fractions cannot exceed 1.")
        value_id = _new_id()
        session.add(models.PV1ValueEntry(id=value_id, tenant_id=tenant_id, project_id=project_id, classification=payload.get("classification"), amount=_decimal(payload.get("amount"), "amount"), currency_or_unit=payload.get("currency_or_unit"), period_start=period_start, period_end=period_end, attribution_key=attribution_key, fraction=fraction, source=payload.get("source"), quality=payload.get("quality", "Unverified"), evidence=payload.get("evidence") or [], created_by=actor_id, updated_by=actor_id))
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="value.recorded", aggregate_type="value", aggregate_id=value_id, aggregate_revision=1, delta={"attribution_key": attribution_key, "fraction": str(fraction)})
        response = _success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "value", "id": value_id}], event_id=event_id)
    elif command_type == "outcomes.close":
        outcome_result = payload.get("result")
        if outcome_result not in OUTCOME_RESULTS or outcome_result == "Unassessed": raise PV1DomainError("VALIDATION_FAILED", "Invalid outcome result.")
        if project.phase != "Delivered": raise PV1DomainError("VALIDATION_FAILED", "Outcomes can close only after delivery is Delivered.")
        measurement_ids = [str(value) for value in (payload.get("measurement_ids") or [])]
        metric_ids = [str(value) for value in (payload.get("metric_revision_ids") or [])]
        if outcome_result == "Realized" and (not measurement_ids or not metric_ids):
            raise PV1DomainError("VALIDATION_FAILED", "Realized requires explicit metric and measurement evidence.")
        if outcome_result == "Realized" and not str(payload.get("rationale") or "").strip():
            raise PV1DomainError("VALIDATION_FAILED", "Realized requires a review rationale.")
        if measurement_ids:
            measurement_result = await session.execute(select(models.PV1Measurement).where(models.PV1Measurement.tenant_id == tenant_id, models.PV1Measurement.project_id == project_id, models.PV1Measurement.id.in_(measurement_ids)))
            measurements = list(measurement_result.scalars())
            if len(measurements) != len(set(measurement_ids)):
                raise PV1DomainError("VALIDATION_FAILED", "Every measurement evidence reference must belong to this project.")
            if outcome_result == "Realized" and any(item.quality != "Verified" or not item.evidence for item in measurements):
                raise PV1DomainError("VALIDATION_FAILED", "Realized requires verified measurement evidence.")
        if metric_ids:
            metric_result = await session.execute(select(models.PV1Metric).where(models.PV1Metric.tenant_id == tenant_id, models.PV1Metric.project_id == project_id, models.PV1Metric.id.in_(metric_ids)))
            if len(list(metric_result.scalars())) != len(set(metric_ids)):
                raise PV1DomainError("VALIDATION_FAILED", "Every metric evidence reference must belong to this project.")
        acceptance_id = _new_id()
        session.add(models.PV1OutcomeAcceptance(id=acceptance_id, tenant_id=tenant_id, project_id=project_id, result=outcome_result, metric_revision_ids=metric_ids, measurement_ids=measurement_ids, reviewer_id=actor_id, rationale=payload.get("rationale") or "", created_by=actor_id, updated_by=actor_id))
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(outcome_phase="Closed", outcome_result=outcome_result, revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Outcome state changed concurrently.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="outcomes.closed", aggregate_type="outcome_acceptance", aggregate_id=acceptance_id, aggregate_revision=1, delta={"result": outcome_result})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "outcome_acceptance", "id": acceptance_id}], event_id=event_id)
    else:
        raise PV1DomainError("VALIDATION_FAILED", f"Unsupported command type: {command_type}.", details={"type": command_type})

    await _idempotency_finish(session, tenant_id=tenant_id, actor_id=actor_id, command_type=command_type, command_id=command_id, response=response, event_id=event_id)
    return response


async def focus_projection(
    session: AsyncSession,
    *,
    tenant_id: int,
    actor_id: str,
    request_role: str | None,
    project_id: str | None = None,
    today: date | None = None,
) -> dict[str, Any]:
    if project_id is not None:
        project = await get_pv1_project(session, tenant_id, project_id)
        if not project:
            raise PV1DomainError("NOT_FOUND", "Project not found.", http_status=status.HTTP_404_NOT_FOUND)
        await require_project_role(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, request_role=request_role)
        projects = [project]
        project_ids = [project_id]
    else:
        if (request_role or "").upper() == "ADMIN":
            project_result = await session.execute(select(models.PV1Project).where(models.PV1Project.tenant_id == tenant_id, models.PV1Project.archived_at.is_(None)).order_by(models.PV1Project.display_key))
        else:
            member_result = await session.execute(select(models.PV1ProjectMember.project_id).where(models.PV1ProjectMember.tenant_id == tenant_id, models.PV1ProjectMember.user_id == actor_id))
            project_ids = list(member_result.scalars())
            project_result = await session.execute(select(models.PV1Project).where(models.PV1Project.tenant_id == tenant_id, models.PV1Project.id.in_(project_ids), models.PV1Project.archived_at.is_(None)).order_by(models.PV1Project.display_key)) if project_ids else None
        projects = list(project_result.scalars()) if project_result is not None else []
        project_ids = [project.id for project in projects]
    if not project_ids:
        return focus.build_focus(actor_id=actor_id, projects=[], tasks=[], today=today)
    task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id.in_(project_ids)).order_by(models.PV1Task.order_key, models.PV1Task.id))
    dependency_result = await session.execute(select(models.PV1Dependency).where(models.PV1Dependency.tenant_id == tenant_id, models.PV1Dependency.project_id.in_(project_ids), models.PV1Dependency.active.is_(True)))
    blocker_result = await session.execute(select(models.PV1TaskBlocker).where(models.PV1TaskBlocker.tenant_id == tenant_id, models.PV1TaskBlocker.project_id.in_(project_ids), models.PV1TaskBlocker.state == "Open"))
    governance_result = await session.execute(select(models.PV1GovernanceRecord).where(models.PV1GovernanceRecord.tenant_id == tenant_id, models.PV1GovernanceRecord.project_id.in_(project_ids)))
    metric_result = await session.execute(select(models.PV1Metric).where(models.PV1Metric.tenant_id == tenant_id, models.PV1Metric.project_id.in_(project_ids), models.PV1Metric.archived_at.is_(None)))
    pin_result = await session.execute(select(models.PV1FocusPin).where(models.PV1FocusPin.tenant_id == tenant_id, models.PV1FocusPin.user_id == actor_id, models.PV1FocusPin.project_id.in_(project_ids)))
    snooze_result = await session.execute(select(models.PV1FocusSnooze).where(models.PV1FocusSnooze.tenant_id == tenant_id, models.PV1FocusSnooze.user_id == actor_id, models.PV1FocusSnooze.project_id.in_(project_ids)))
    result = focus.build_focus(
        actor_id=actor_id, projects=projects, tasks=list(task_result.scalars()), dependencies=list(dependency_result.scalars()),
        blockers=list(blocker_result.scalars()), governance=list(governance_result.scalars()), metrics=list(metric_result.scalars()),
        pins=list(pin_result.scalars()), snoozes=list(snooze_result.scalars()), today=today, project_id=project_id,
    )
    result["source_revision"] = ":".join(f"{project.id}:{project.graph_revision}" for project in projects)
    return result


async def work_projection(session: AsyncSession, *, tenant_id: int, project_id: str, actor_id: str, request_role: str | None) -> dict[str, Any]:
    project = await get_pv1_project(session, tenant_id, project_id)
    if not project:
        raise PV1DomainError("NOT_FOUND", "Project not found.", http_status=status.HTTP_404_NOT_FOUND)
    await require_project_role(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, request_role=request_role)
    task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id).order_by(models.PV1Task.order_key, models.PV1Task.id))
    dependency_result = await session.execute(select(models.PV1Dependency).where(models.PV1Dependency.tenant_id == tenant_id, models.PV1Dependency.project_id == project_id, models.PV1Dependency.active.is_(True)))
    blocker_result = await session.execute(select(models.PV1TaskBlocker).where(models.PV1TaskBlocker.tenant_id == tenant_id, models.PV1TaskBlocker.project_id == project_id, models.PV1TaskBlocker.state == "Open"))
    criteria_result = await session.execute(select(models.PV1TaskCriterion).where(models.PV1TaskCriterion.tenant_id == tenant_id, models.PV1TaskCriterion.project_id == project_id).order_by(models.PV1TaskCriterion.created_at, models.PV1TaskCriterion.id))
    return {
        "project_id": project_id,
        "project_revision": project.revision,
        "graph_revision": project.graph_revision,
        "items": [task_dict(task) for task in task_result.scalars()],
        "dependencies": [{"id": item.id, "predecessor_id": item.predecessor_id, "successor_id": item.successor_id, "dependency_type": item.dependency_type, "lag_days": item.lag_days, "revision": item.revision} for item in dependency_result.scalars()],
        "blockers": [{"id": item.id, "task_id": item.task_id, "source": item.source, "reason": item.reason, "resolver_id": item.resolver_id, "review_date": _serialize(item.review_date), "state": item.state, "revision": item.revision} for item in blocker_result.scalars()],
        "criteria": [{"id": item.id, "task_id": item.task_id, "description": item.description, "mandatory": item.mandatory, "state": item.state, "evidence_refs": item.evidence_refs or [], "revision": item.revision} for item in criteria_result.scalars()],
        "as_of": _now().isoformat(),
    }


async def plan_projection(session: AsyncSession, *, tenant_id: int, project_id: str, actor_id: str, request_role: str | None) -> dict[str, Any]:
    await require_project_role(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, request_role=request_role)
    project = await get_pv1_project(session, tenant_id, project_id)
    if not project:
        raise PV1DomainError("NOT_FOUND", "Project not found.", http_status=status.HTTP_404_NOT_FOUND)
    governance_result = await session.execute(select(models.PV1GovernanceRecord).where(models.PV1GovernanceRecord.tenant_id == tenant_id, models.PV1GovernanceRecord.project_id == project_id).order_by(models.PV1GovernanceRecord.created_at, models.PV1GovernanceRecord.id))
    resource_result = await session.execute(select(models.PV1Resource).where(models.PV1Resource.tenant_id == tenant_id, models.PV1Resource.project_id == project_id).order_by(models.PV1Resource.pinned.desc(), models.PV1Resource.updated_at.desc(), models.PV1Resource.id))
    task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id).order_by(models.PV1Task.order_key, models.PV1Task.id))
    tasks = list(task_result.scalars())
    records = list(governance_result.scalars())
    resources = list(resource_result.scalars())
    guidance = []
    if not (project.problem or "").strip(): guidance.append({"code": "MISSING_PROBLEM", "message": "Add the problem statement to Brief.", "fix": "brief"})
    if not (project.in_scope or "").strip(): guidance.append({"code": "MISSING_IN_SCOPE", "message": "Define In scope.", "fix": "brief"})
    if not (project.out_of_scope or "").strip(): guidance.append({"code": "MISSING_OUT_SCOPE", "message": "Define Out of scope.", "fix": "brief"})
    if not any(task.kind == "Milestone" and task.status != "Cancelled" for task in tasks): guidance.append({"code": "MISSING_MILESTONE", "message": "Add a delivery milestone.", "fix": "milestones"})
    return {
        "project": project_dict(project),
        "sections": ["Brief", "Milestones", "Architecture", "Risks & decisions", "Resources"],
        "brief": {"problem": project.problem, "objective": project.objective, "in_scope": project.in_scope, "out_of_scope": project.out_of_scope, "delivery_acceptance": []},
        "milestones": [task_dict(task) for task in tasks if task.kind == "Milestone"],
        "work_breakdown": [task_dict(task) for task in tasks],
        "architecture": {"assessment": project.architecture_assessment, "rationale": project.architecture_rationale},
        "governance": [{"id": item.id, "type": item.record_type, "title": item.title, "state": item.state, "owner_id": item.owner_id, "fields": item.payload or {}, "revision": item.revision} for item in records],
        "resources": [{"id": item.id, "resource_kind": item.resource_kind, "title": item.title, "content": item.content, "scan_state": item.scan_state, "pinned": item.pinned, "links": item.links or [], "revision": item.revision} for item in resources],
        "guidance": guidance,
        "source_revisions": {"project_revision": project.revision, "graph_revision": project.graph_revision},
        "as_of": _now().isoformat(),
    }


async def focus_command(
    session: AsyncSession,
    *,
    tenant_id: int,
    actor_id: str,
    request_role: str | None,
    command_id: str,
    command_type: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    if command_type not in {"focus.pin", "focus.unpin", "focus.snooze", "focus.unsnooze"}:
        raise PV1DomainError("VALIDATION_FAILED", "Unsupported Focus preference command.")
    existing = await _idempotency_start(session, tenant_id=tenant_id, actor_id=actor_id, command_type=command_type, command_id=command_id, request_payload=payload)
    if existing:
        return existing.response_json
    project_id = str(payload.get("project_id") or "")
    entity_kind = str(payload.get("entity_kind") or "task")
    entity_id = str(payload.get("entity_id") or "")
    project = await get_pv1_project(session, tenant_id, project_id)
    if not project or not entity_id:
        raise PV1DomainError("NOT_FOUND", "Focus item not found.", http_status=status.HTTP_404_NOT_FOUND)
    await require_project_role(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, request_role=request_role)
    entity_exists = False
    if entity_kind == "task":
        entity_exists = await session.scalar(select(func.count()).select_from(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id, models.PV1Task.id == entity_id)) > 0
    elif entity_kind == "blocker":
        entity_exists = await session.scalar(select(func.count()).select_from(models.PV1TaskBlocker).where(models.PV1TaskBlocker.tenant_id == tenant_id, models.PV1TaskBlocker.project_id == project_id, models.PV1TaskBlocker.id == entity_id)) > 0
    elif entity_kind == "decision":
        entity_exists = await session.scalar(select(func.count()).select_from(models.PV1GovernanceRecord).where(models.PV1GovernanceRecord.tenant_id == tenant_id, models.PV1GovernanceRecord.project_id == project_id, models.PV1GovernanceRecord.id == entity_id, models.PV1GovernanceRecord.record_type == "Decision")) > 0
    elif entity_kind == "measurement":
        entity_exists = await session.scalar(select(func.count()).select_from(models.PV1Metric).where(models.PV1Metric.tenant_id == tenant_id, models.PV1Metric.project_id == project_id, models.PV1Metric.id == entity_id)) > 0
    if not entity_exists:
        raise PV1DomainError("NOT_FOUND", "Focus item not found.", http_status=status.HTTP_404_NOT_FOUND)
    if command_type == "focus.pin":
        count = await session.scalar(select(func.count()).select_from(models.PV1FocusPin).where(models.PV1FocusPin.tenant_id == tenant_id, models.PV1FocusPin.user_id == actor_id))
        existing_pin = await session.scalar(select(models.PV1FocusPin).where(models.PV1FocusPin.tenant_id == tenant_id, models.PV1FocusPin.user_id == actor_id, models.PV1FocusPin.entity_kind == entity_kind, models.PV1FocusPin.entity_id == entity_id))
        if not existing_pin and count >= 3:
            raise PV1DomainError("VALIDATION_FAILED", "You can pin up to three Focus items.")
        if not existing_pin:
            session.add(models.PV1FocusPin(id=_new_id(), tenant_id=tenant_id, user_id=actor_id, project_id=project_id, entity_kind=entity_kind, entity_id=entity_id, created_by=actor_id, updated_by=actor_id))
    elif command_type == "focus.unpin":
        await session.execute(delete(models.PV1FocusPin).where(models.PV1FocusPin.tenant_id == tenant_id, models.PV1FocusPin.user_id == actor_id, models.PV1FocusPin.entity_kind == entity_kind, models.PV1FocusPin.entity_id == entity_id))
    elif command_type == "focus.snooze":
        until_date = _date(payload.get("until_date"))
        if not until_date or until_date <= _now().date():
            raise PV1DomainError("VALIDATION_FAILED", "Snooze date must be a future ISO date.")
        snooze = await session.scalar(select(models.PV1FocusSnooze).where(models.PV1FocusSnooze.tenant_id == tenant_id, models.PV1FocusSnooze.user_id == actor_id, models.PV1FocusSnooze.entity_kind == entity_kind, models.PV1FocusSnooze.entity_id == entity_id))
        if snooze:
            snooze.until_date = until_date; snooze.revision += 1; snooze.updated_by = actor_id; snooze.updated_at = _now()
        else:
            session.add(models.PV1FocusSnooze(id=_new_id(), tenant_id=tenant_id, user_id=actor_id, project_id=project_id, entity_kind=entity_kind, entity_id=entity_id, until_date=until_date, created_by=actor_id, updated_by=actor_id))
    else:
        await session.execute(delete(models.PV1FocusSnooze).where(models.PV1FocusSnooze.tenant_id == tenant_id, models.PV1FocusSnooze.user_id == actor_id, models.PV1FocusSnooze.entity_kind == entity_kind, models.PV1FocusSnooze.entity_id == entity_id))
    event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="focus_preference", aggregate_id=f"{entity_kind}:{entity_id}", aggregate_revision=1, delta={"entity_kind": entity_kind, "entity_id": entity_id})
    response = _success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "focus_preference", "id": f"{entity_kind}:{entity_id}"}], event_id=event_id)
    await _idempotency_finish(session, tenant_id=tenant_id, actor_id=actor_id, command_type=command_type, command_id=command_id, response=response, event_id=event_id)
    return response


def parse_task_import(raw: dict[str, Any]) -> dict[str, Any]:
    text = raw.get("text")
    if text is not None:
        if not isinstance(text, str):
            raise PV1DomainError("VALIDATION_FAILED", "Import text must be a string.")
        delimiter = "\t" if raw.get("format") == "tsv" or ("\t" in text and "," not in text.splitlines()[0]) else ","
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        rows = [dict(row) for row in reader]
    else:
        rows = raw.get("rows")
        if not isinstance(rows, list):
            raise PV1DomainError("VALIDATION_FAILED", "Import requires CSV/TSV text or a rows array.")
    if len(rows) > 500:
        raise PV1DomainError("VALIDATION_FAILED", "Bulk/paste import is limited to 500 tasks.")
    normalized: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for index, raw_row in enumerate(rows, start=1):
        row = {str(key).strip().casefold().replace(" ", "_"): value for key, value in (raw_row.items() if isinstance(raw_row, dict) else [])}
        title = str(row.get("title") or row.get("name") or "").strip()
        item_errors: list[str] = []
        if not title or len(title) > 120: item_errors.append("title is required and must be at most 120 characters")
        status_value = str(row.get("status") or "To Do").strip()
        if status_value not in focus.WORK_STATUSES: item_errors.append("status is invalid")
        priority = str(row.get("priority") or "Medium").strip()
        if priority not in {"Critical", "High", "Medium", "Low"}: item_errors.append("priority is invalid")
        start_date = _date(row.get("start") or row.get("start_date")) if row.get("start") or row.get("start_date") else None
        end_date = _date(row.get("finish") or row.get("end_date")) if row.get("finish") or row.get("end_date") else None
        if start_date and end_date and end_date < start_date: item_errors.append("Finish must be on or after start")
        try: progress = int(row.get("progress") or 0)
        except (TypeError, ValueError): progress = -1
        if progress < 0 or progress > 100: item_errors.append("progress must be an integer from 0 to 100")
        row_key = str(row.get("key") or row.get("id") or index).strip()
        if row_key in seen_keys: item_errors.append("duplicate identifier")
        seen_keys.add(row_key)
        normalized.append({"key": row_key, "title": title, "owner_id": str(row.get("owner") or row.get("owner_id") or "").strip() or None, "status": status_value, "priority": priority, "start_date": start_date, "end_date": end_date, "parent_key": str(row.get("parent_key") or row.get("parent") or "").strip() or None, "progress": progress, "kind": str(row.get("kind") or "Task").strip(), "estimate_hours": row.get("estimate_hours") or None, "remaining_workdays": row.get("remaining_workdays") or None, "mandatory": str(row.get("mandatory") or "true").casefold() not in {"false", "0", "no"}})
        if item_errors: errors.append({"row": index, "errors": item_errors})
    keys = {item["key"] for item in normalized}
    for index, item in enumerate(normalized, start=1):
        if item["parent_key"] and item["parent_key"] not in keys:
            errors.append({"row": index, "errors": ["unknown parent key"]})
    return {"rows": normalized, "errors": errors, "valid": not errors, "count": len(normalized)}


async def import_tasks(session: AsyncSession, *, tenant_id: int, project_id: str, actor_id: str, command_id: str, expected: dict[str, Any], raw: dict[str, Any]) -> dict[str, Any]:
    existing = await _idempotency_start(session, tenant_id=tenant_id, actor_id=actor_id, command_type="task.import", command_id=command_id, request_payload={"expected": expected, "raw": raw})
    if existing: return existing.response_json
    project = await get_pv1_project(session, tenant_id, project_id)
    if not project: raise PV1DomainError("NOT_FOUND", "Project not found.", http_status=status.HTTP_404_NOT_FOUND)
    graph_expected = _require_expected(expected, "graph_revision")
    if graph_expected != project.graph_revision: raise PV1DomainError("REVISION_CONFLICT", "The task graph changed. Refresh before importing.", http_status=status.HTTP_409_CONFLICT)
    parsed = parse_task_import(raw)
    if not parsed["valid"]: raise PV1DomainError("VALIDATION_FAILED", "Import contains invalid rows; nothing was created.", details={"row_errors": parsed["errors"]})
    member_result = await session.execute(select(models.PV1ProjectMember.user_id).where(models.PV1ProjectMember.tenant_id == tenant_id, models.PV1ProjectMember.project_id == project_id))
    members = set(member_result.scalars())
    for row in parsed["rows"]:
        if row["owner_id"] and row["owner_id"] not in members: raise PV1DomainError("VALIDATION_FAILED", "Owner is ambiguous or is not an authorized project member.", details={"field": "owner_id", "value": row["owner_id"]})
        if row["status"] == "Done": raise PV1DomainError("VALIDATION_FAILED", "Imported Done tasks require acceptance evidence; import them as Review or To Do first.")
    key_to_id: dict[str, str] = {}
    pending = list(parsed["rows"])
    created: list[dict[str, Any]] = []
    order = 1
    while pending:
        progress = False
        for row in list(pending):
            if row["parent_key"] and row["parent_key"] not in key_to_id: continue
            task_id = _new_id(); key_to_id[row["key"]] = task_id
            session.add(models.PV1Task(id=task_id, tenant_id=tenant_id, project_id=project_id, parent_task_id=key_to_id.get(row["parent_key"]), kind=row["kind"], title=row["title"], owner_id=row["owner_id"] or actor_id, status=row["status"], priority=row["priority"], progress=row["progress"], start_date=row["start_date"], end_date=row["end_date"], estimate_hours=row["estimate_hours"], remaining_workdays=row["remaining_workdays"], planning_weight=1, mandatory=row["mandatory"], order_key=order * 1024, created_by=actor_id, updated_by=actor_id))
            created.append({"kind": "task", "id": task_id}); order += 1; pending.remove(row); progress = True
        if not progress: raise PV1DomainError("VALIDATION_FAILED", "Parent hierarchy contains a cycle.")
    await session.execute(update(models.PV1Project).where(models.PV1Project.id == project_id, models.PV1Project.graph_revision == project.graph_revision, models.PV1Project.revision == project.revision).values(graph_revision=models.PV1Project.graph_revision + len(created), revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
    event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="task.import", aggregate_type="task_set", aggregate_id=project_id, aggregate_revision=project.graph_revision + len(created), delta={"count": len(created)})
    response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision + len(created)}, changed_entities=created, event_id=event_id)
    await _idempotency_finish(session, tenant_id=tenant_id, actor_id=actor_id, command_type="task.import", command_id=command_id, response=response, event_id=event_id)
    return response
