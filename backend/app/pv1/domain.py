import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi import status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import models as legacy_models
from . import models


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
        "outcome_phase": project.outcome_phase,
        "outcome_result": project.outcome_result,
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
        "estimate_hours": _serialize(task.estimate_hours),
        "remaining_workdays": task.remaining_workdays,
        "planning_weight": task.planning_weight,
        "mandatory": task.mandatory,
        "order_key": _serialize(task.order_key),
        "actual_started_at": _serialize(task.actual_started_at),
        "finished_at": _serialize(task.finished_at),
        "tags": task.tags or [],
        "revision": task.revision,
    }


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
        "outcome_phase": "Not configured",
        "outcome_result": "Unassessed",
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


async def create_project(session: AsyncSession, *, tenant_id: int, actor_id: str, request_role: str | None, command_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    existing = await _idempotency_start(session, tenant_id=tenant_id, actor_id=actor_id, command_type="project.create", command_id=command_id, request_payload=payload)
    if existing:
        return existing.response_json
    name = str(payload.get("name", "")).strip()
    if not name or len(name) > 120:
        raise PV1DomainError("VALIDATION_FAILED", "name is required and must be at most 120 characters.")
    owner_id = str(payload.get("owner_id") or actor_id)
    project_id = _new_id()
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
        calendar_id=payload.get("calendar_id"),
        calendar_revision=payload.get("calendar_revision"),
        visibility=payload.get("visibility", "Team"),
        created_by=actor_id,
        updated_by=actor_id,
    )
    if project.target_date and project.start_date and project.target_date < project.start_date:
        raise PV1DomainError("VALIDATION_FAILED", "target_date must be on or after start_date.", details={"field": "target_date"})
    session.add(project)
    session.add(models.PV1ProjectMember(id=_new_id(), tenant_id=tenant_id, project_id=project_id, user_id=owner_id, role="Owner", capabilities={"financial.view": False}, created_by=actor_id, updated_by=actor_id))
    await session.flush()
    event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="project.created", aggregate_type="project", aggregate_id=project_id, aggregate_revision=1, delta={"phase": project.phase})
    response = _success(command_id, revisions={"project_revision": 1, "graph_revision": 1}, changed_entities=[{"kind": "project", "id": project_id}], event_id=event_id)
    await _idempotency_finish(session, tenant_id=tenant_id, actor_id=actor_id, command_type="project.create", command_id=command_id, response=response, event_id=event_id)
    return response


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
        else:
            raise PV1DomainError("FORBIDDEN", "You do not have permission to perform this command.", http_status=status.HTTP_403_FORBIDDEN)
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
    elif command_type == "project.transition":
        to_phase = payload.get("to_phase")
        if to_phase not in PHASES:
            raise PV1DomainError("VALIDATION_FAILED", "Unknown delivery phase.", details={"field": "to_phase"})
        if project.run_state != "Active" and to_phase not in {project.phase}:
            raise PV1DomainError("VALIDATION_FAILED", "Resume a paused or cancelled project before changing its phase.")
        if to_phase == "Delivered" and project.phase not in {"Validating", "Delivered"}:
            raise PV1DomainError("VALIDATION_FAILED", "Delivery must be accepted from Validating.")
        result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision).values(phase=to_phase, revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
        if result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project revision changed during the transition.", http_status=status.HTTP_409_CONFLICT)
        revision = project.revision + 1
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type="project.transitioned", aggregate_type="project", aggregate_id=project_id, aggregate_revision=revision, delta={"phase": to_phase})
        changed.append({"kind": "project", "id": project_id})
        response = _success(command_id, revisions={"project_revision": revision, "graph_revision": project.graph_revision}, changed_entities=changed, event_id=event_id)
    elif command_type in {"project.pause", "project.resume", "project.reactivate", "project.cancel", "project.archive", "project.restore"}:
        if command_type == "project.pause":
            run_state, values = "Paused", {"pause_reason": payload.get("reason"), "resume_review_date": _date(payload.get("resume_review_date"))}
        elif command_type in {"project.resume", "project.reactivate"}:
            run_state, values = "Active", {"pause_reason": None, "cancellation_reason": None if command_type == "project.reactivate" else project.cancellation_reason}
        elif command_type == "project.cancel":
            run_state, values = "Cancelled", {"cancellation_reason": payload.get("reason")}
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
    elif command_type == "task.create":
        graph_expected = _require_expected(expected, "graph_revision")
        if graph_expected != project.graph_revision: raise PV1DomainError("REVISION_CONFLICT", "The task graph changed. Refresh before adding work.", http_status=status.HTTP_409_CONFLICT, details={"current_revisions": {"graph_revision": project.graph_revision}})
        title = str(payload.get("title") or "").strip()
        if not title or len(title) > 120: raise PV1DomainError("VALIDATION_FAILED", "Task title is required and must be at most 120 characters.")
        task_id = _new_id()
        parent_id = payload.get("parent_task_id")
        if parent_id:
            parent = await session.get(models.PV1Task, parent_id)
            if not parent or parent.project_id != project_id: raise PV1DomainError("VALIDATION_FAILED", "Parent task must belong to the same project.")
        session.add(models.PV1Task(id=task_id, tenant_id=tenant_id, project_id=project_id, parent_task_id=parent_id, kind=payload.get("kind", "Task"), title=title, description=payload.get("description"), owner_id=payload.get("owner_id"), status=payload.get("status", "To Do"), priority=payload.get("priority", "Medium"), progress=int(payload.get("progress", 0)), planning_weight=int(payload.get("planning_weight", 1)), mandatory=bool(payload.get("mandatory", True)), order_key=payload.get("order_key", 1024), tags=payload.get("tags") or [], created_by=actor_id, updated_by=actor_id))
        await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.graph_revision == project.graph_revision).values(graph_revision=models.PV1Project.graph_revision + 1, revision=models.PV1Project.revision + 1, updated_by=actor_id, updated_at=func.now()))
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
        if command_type == "task.transition":
            changes = {"status": payload.get("to_status")}
        else:
            allowed = {"title", "description", "owner_id", "priority", "progress", "estimate_hours", "remaining_workdays", "planning_weight", "mandatory", "tags"}
            unknown = set(payload) - allowed - {"task_id"}
            if unknown: raise PV1DomainError("VALIDATION_FAILED", "Unlisted task fields are rejected.", details={"fields": sorted(unknown)})
            changes = {key: value for key, value in payload.items() if key in allowed}
        if "progress" in changes and (not isinstance(changes["progress"], int) or not 0 <= changes["progress"] <= 100): raise PV1DomainError("VALIDATION_FAILED", "progress must be an integer from 0 to 100.")
        event_delta = dict(changes)
        changes.update({"revision": task.revision + 1, "updated_by": actor_id, "updated_at": func.now()})
        result = await session.execute(update(models.PV1Task).execution_options(synchronize_session=False).where(models.PV1Task.id == task_id, models.PV1Task.revision == task.revision).values(**changes))
        if result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Task changed during the write.", http_status=status.HTTP_409_CONFLICT)
        project_result = await session.execute(update(models.PV1Project).execution_options(synchronize_session=False).where(models.PV1Project.id == project_id, models.PV1Project.revision == project.revision, models.PV1Project.graph_revision == project.graph_revision).values(revision=models.PV1Project.revision + 1, graph_revision=models.PV1Project.graph_revision + 1, updated_by=actor_id, updated_at=func.now()))
        if project_result.rowcount != 1: raise PV1DomainError("REVISION_CONFLICT", "Project graph changed during the task write.", http_status=status.HTTP_409_CONFLICT)
        event_id, _ = await append_event(session, tenant_id=tenant_id, project_id=project_id, actor_id=actor_id, command_id=command_id, event_type=command_type, aggregate_type="task", aggregate_id=task_id, aggregate_revision=task.revision + 1, delta=event_delta)
        changed.append({"kind": "task", "id": task_id})
        response = _success(command_id, revisions={"project_revision": project.revision + 1, "graph_revision": project.graph_revision + 1, "task_revision": task.revision + 1}, changed_entities=changed, event_id=event_id)
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
