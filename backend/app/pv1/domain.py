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
        start_date = _date(payload.get("start_date"))
        end_date = _date(payload.get("end_date"))
        point_date = _date(payload.get("point_date"))
        if start_date and end_date and end_date < start_date:
            raise PV1DomainError("VALIDATION_FAILED", "Task end_date must be on or after start_date.")
        session.add(models.PV1Task(id=task_id, tenant_id=tenant_id, project_id=project_id, parent_task_id=parent_id, kind=payload.get("kind", "Task"), title=title, description=payload.get("description"), owner_id=payload.get("owner_id"), status=payload.get("status", "To Do"), priority=payload.get("priority", "Medium"), progress=int(payload.get("progress", 0)), start_date=start_date, end_date=end_date, point_date=point_date, planning_weight=int(payload.get("planning_weight", 1)), mandatory=bool(payload.get("mandatory", True)), order_key=payload.get("order_key", 1024), tags=payload.get("tags") or [], created_by=actor_id, updated_by=actor_id))
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
