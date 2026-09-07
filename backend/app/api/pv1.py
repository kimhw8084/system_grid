from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import models as legacy_models
from ..pv1 import domain, models, schemas


router = APIRouter(tags=["PV1 v2"])


def _tenant_id(request: Request) -> int:
    value = getattr(request.state, "tenant_id", None)
    if not isinstance(value, int):
        raise domain.PV1DomainError("AUTH_REQUIRED", "Tenant context is missing.", http_status=status.HTTP_401_UNAUTHORIZED)
    return value


def _actor(request: Request) -> str:
    from .utils import get_current_user_id
    return get_current_user_id(request)


def _error(request: Request, error: domain.PV1DomainError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "pv1-request")
    return JSONResponse(
        status_code=error.http_status,
        content={
            "code": error.code,
            "message": error.message,
            "request_id": request_id,
            "retryable": error.retryable,
            "field_errors": error.details.get("field_errors", []),
            "current_revisions": error.details.get("current_revisions"),
            "details": error.details,
        },
        headers={"X-Request-ID": request_id},
    )


def _parse_command_id(value: str | None) -> str:
    if not value:
        raise domain.PV1DomainError("VALIDATION_FAILED", "Idempotency-Key is required for writes.", details={"field": "Idempotency-Key"})
    try:
        return str(UUID(value))
    except ValueError as exc:
        raise domain.PV1DomainError("VALIDATION_FAILED", "Idempotency-Key must be a UUID.", details={"field": "Idempotency-Key"}) from exc


async def _require_capability(session: AsyncSession, request: Request, project_id: str, capability: str) -> None:
    actor = _actor(request)
    role = await domain.get_member_role(session, _tenant_id(request), project_id, actor, getattr(request.state, "sysgrid_access_role", None))
    if role == "Tenant administrator":
        return
    result = await session.execute(select(models.PV1ProjectMember).where(models.PV1ProjectMember.tenant_id == _tenant_id(request), models.PV1ProjectMember.project_id == project_id, models.PV1ProjectMember.user_id == actor))
    member = result.scalar_one_or_none()
    if not member or not (member.capabilities or {}).get(capability, False):
        raise domain.PV1DomainError("FORBIDDEN", f"Capability required: {capability}.", http_status=status.HTTP_403_FORBIDDEN)


def _measurement_dict(item: models.PV1Measurement) -> dict[str, Any]:
    return {
        "id": item.id,
        "project_id": item.project_id,
        "metric_id": item.metric_id,
        "definition_revision": item.definition_revision,
        "period_start": item.period_start.isoformat(),
        "period_end": item.period_end.isoformat(),
        "observed_numeric": domain._serialize(item.observed_numeric),
        "observed_binary": item.observed_binary,
        "numerator": item.numerator,
        "denominator": item.denominator,
        "unit": item.unit,
        "source": item.source,
        "quality": item.quality,
        "recorder_id": item.recorder_id,
        "recorded_at": domain._serialize(item.recorded_at),
        "supersedes_id": item.supersedes_id,
        "revision": item.revision,
    }


def _metric_dict(item: models.PV1Metric) -> dict[str, Any]:
    return {
        "id": item.id,
        "project_id": item.project_id,
        "name": item.name,
        "kind": item.kind,
        "description": item.description,
        "unit": item.unit,
        "direction": item.direction,
        "baseline": domain._serialize(item.baseline),
        "target_spec": item.target_spec,
        "target_date": domain._serialize(item.target_date),
        "steward_id": item.steward_id,
        "measurement_method": item.measurement_method,
        "population_definition": item.population_definition,
        "cadence_days": item.cadence_days,
        "required_for_success": item.required_for_success,
        "required_consecutive_periods": item.required_consecutive_periods,
        "definition_revision": item.definition_revision,
        "revision": item.revision,
    }


def _portfolio_bucket(item: dict[str, Any]) -> str:
    if item.get("run_state") == "Paused": return "Paused"
    if item.get("run_state") == "Cancelled": return "Cancelled"
    if item.get("phase") == "Delivered": return "Delivered"
    if item.get("phase") in {"Executing", "Validating"}: return "Active"
    return "Planned"


def _portfolio_summary(items: list[dict[str, Any]]) -> dict[str, int]:
    top_level = [item for item in items if not item.get("parent_project_id")]
    result = {key: 0 for key in ["Planned", "Active", "Delivered", "Paused", "Cancelled"]}
    for item in top_level:
        result[_portfolio_bucket(item)] += 1
    result["Needs attention"] = sum(1 for item in top_level if item.get("story", {}).get("attention_count", 0) > 0)
    result["Measuring"] = sum(1 for item in top_level if item.get("outcome_phase") == "Measuring")
    result["Realized"] = sum(1 for item in top_level if item.get("outcome_result") == "Realized")
    result["Closed below target"] = sum(1 for item in top_level if item.get("outcome_phase") == "Closed" and item.get("outcome_result") in {"Partial", "Not realized"})
    return result


async def _legacy_story(db: AsyncSession, project: legacy_models.Project) -> dict[str, Any]:
    task_result = await db.execute(select(legacy_models.ProjectTask).where(legacy_models.ProjectTask.project_id == project.id).order_by(legacy_models.ProjectTask.id))
    tasks = list(task_result.scalars())
    active_tasks = [task for task in tasks if task.status not in {"Done", "Completed", "Cancelled"}]
    blocked = [task for task in active_tasks if task.status == "Blocked"]
    today = date.today()
    overdue = [task for task in active_tasks if task.end_date and task.end_date.date() < today]
    if blocked:
        health = {"level": "Off track", "reason": blocked[0].name}
    elif overdue or (project.end_date and project.status not in {"Completed", "Cancelled"} and project.end_date.date() < today):
        health = {"level": "At risk", "reason": "A legacy delivery commitment is overdue."}
    elif not tasks:
        health = {"level": "Unknown", "reason": "Legacy delivery work is not available."}
    else:
        health = {"level": "On track", "reason": "No blocker or missed commitment is recorded."}
    percent = round(sum(max(0, min(100, task.progress or 0)) for task in tasks) / len(tasks)) if tasks else None
    attention = [{"id": f"legacy-task:{task.id}", "kind": "Blocker" if task.status == "Blocked" else "Missed commitment", "reason": task.name, "accountable": task.owner or project.owner or "Unassigned", "due_date": task.end_date.date().isoformat() if task.end_date else None, "action": "Open work", "entity_id": str(task.id)} for task in [*blocked, *[item for item in overdue if item not in blocked]]]
    metadata = project.metadata_json or {}
    updates = (metadata.get("project_updates_v1") or {}).get("updates") or []
    latest_update = updates[-1] if updates else None
    resources = [item for item in (metadata.get("links") or []) if isinstance(item, dict)][:4]
    return {
        "health": health,
        "delivery": {"percent": percent, "label": f"{percent}%" if percent is not None else "Not planned", "method": "Legacy task average." if tasks else "No executable work is recorded."},
        "next_milestone": None,
        "milestones": [],
        "attention": attention,
        "attention_count": len(attention),
        "acceptance_criteria": [{"id": f"legacy-acceptance:{index}", "description": text, "state": "Open", "mandatory": True} for index, text in enumerate(project.expected_outcomes or [])],
        "primary_metric": None,
        "latest_update": latest_update,
        "governance": [],
        "architecture": {"assessment": "Not assessed", "rationale": None},
        "resources": resources,
        "freshness": {"updated_at": domain._serialize(project.updated_at), "source": "Legacy adapter"},
        "coverage": {"resources": "legacy-adapter", "architecture": "unavailable", "updates": "legacy-adapter"},
    }


async def _project_response(db: AsyncSession, project: models.PV1Project, request: Request) -> dict[str, Any]:
    response = domain.project_dict(project)
    response["story"] = await domain.project_story_projection(db, project)
    response["capabilities"] = await domain.project_capabilities_for_actor(db, tenant_id=project.tenant_id, project_id=project.id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
    if project.archived_at is not None:
        can_restore = response["capabilities"].get("restore", False)
        response["capabilities"] = {key: False for key in response["capabilities"]}
        response["capabilities"].update({"view": True, "export": True, "restore": can_restore})
    return response


@router.get("/capabilities")
async def get_capabilities(request: Request, db: AsyncSession = Depends(get_db)):
    return {
        "schema_version": "pv1-api-v2-foundation.1",
        "contract_version": "2",
        "policy_context": {"tenant_id": _tenant_id(request), "user_id": _actor(request), "access_role": getattr(request.state, "sysgrid_access_role", "VIEWER")},
        "capabilities": {
            "projects": {"supported": True, "contract_version": "2.0"},
            "project_commands": {"supported": True, "contract_version": "2.0"},
            "revisions": {"supported": True, "contract_version": "1.0"},
            "idempotency": {"supported": True, "contract_version": "1.0"},
            "outcomes": {"supported": True, "contract_version": "1.0"},
            "metrics": {"supported": True, "contract_version": "1.0"},
            "focus": {"supported": True, "contract_version": "1.0"},
            "work_plan": {"supported": True, "contract_version": "1.0"},
            "task_bulk": {"supported": True, "contract_version": "1.0"},
            "task_import": {"supported": True, "contract_version": "1.0"},
            "saved_views": {"supported": False, "contract_version": None},
            "schedule_preview": {"supported": True, "contract_version": "1.0"},
            "schedule_apply": {"supported": True, "contract_version": "1.0"},
            "schedule_baselines": {"supported": True, "contract_version": "1.0"},
            "architecture_read": {"supported": True, "contract_version": "1.0"},
            "architecture_edit": {"supported": True, "contract_version": "1.0"},
            "architecture_change_sets": {"supported": True, "contract_version": "1.0"},
            "architecture_assessment": {"supported": True, "contract_version": "1.0"},
        },
    }


@router.get("/focus")
async def get_focus(request: Request, db: AsyncSession = Depends(get_db), project_id: str | None = Query(default=None), as_of: date | None = Query(default=None)):
    try:
        return await domain.focus_projection(db, tenant_id=_tenant_id(request), actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None), project_id=project_id, today=as_of)
    except domain.PV1DomainError as error:
        return _error(request, error)


@router.post("/focus/commands")
async def focus_preference_command(request: Request, envelope: schemas.CommandEnvelope, db: AsyncSession = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    try:
        command_id = _parse_command_id(idempotency_key)
        if command_id != str(envelope.command_id):
            raise domain.PV1DomainError("VALIDATION_FAILED", "command_id must equal Idempotency-Key.", details={"field": "command_id"})
        result = await domain.focus_command(db, tenant_id=_tenant_id(request), actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None), command_id=command_id, command_type=envelope.type, payload=envelope.payload)
        await db.commit()
        return result
    except domain.PV1DomainError as error:
        await db.rollback()
        return _error(request, error)


@router.get("/projects/my-day")
async def get_my_day(request: Request, db: AsyncSession = Depends(get_db), limit: int = Query(default=50, ge=1, le=200)):
    projection = await domain.focus_projection(db, tenant_id=_tenant_id(request), actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
    projection["items"] = projection["items"][:limit]
    projection["all_priorities"] = projection["all_priorities"][: max(limit, 5)]
    return projection


@router.get("/projects")
async def list_projects(request: Request, db: AsyncSession = Depends(get_db), limit: int = Query(default=50, ge=1, le=200), cursor: str | None = None, team_id: int | None = Query(default=None, ge=1)):
    tenant_id = _tenant_id(request)
    actor_id = _actor(request)
    request_role = getattr(request.state, "sysgrid_access_role", None)
    offset = int(cursor or 0) if (cursor or "0").isdigit() else 0
    items: list[dict[str, Any]] = []
    project_statement = select(models.PV1Project).where(models.PV1Project.tenant_id == tenant_id, models.PV1Project.archived_at.is_(None))
    if team_id is not None:
        project_statement = project_statement.where(models.PV1Project.team_id == team_id)
    if (request_role or "").upper() != "ADMIN":
        member_result = await db.execute(select(models.PV1ProjectMember.project_id).where(models.PV1ProjectMember.tenant_id == tenant_id, models.PV1ProjectMember.user_id == actor_id))
        allowed_project_ids = list(member_result.scalars())
        project_statement = project_statement.where(models.PV1Project.id.in_(allowed_project_ids))
    pv1_result = await db.execute(project_statement.order_by(models.PV1Project.display_key))
    pv1_projects = list(pv1_result.scalars())
    for project in pv1_projects:
        items.append(await _project_response(db, project, request))
    known_legacy_ids = {project.legacy_project_id for project in pv1_projects if project.legacy_project_id is not None}
    if (request_role or "").upper() == "ADMIN":
        legacy_statement = select(legacy_models.Project).where(legacy_models.Project.is_deleted == False)
        if team_id is not None:
            legacy_statement = legacy_statement.where(False)
        legacy_result = await db.execute(legacy_statement.order_by(legacy_models.Project.order_index, legacy_models.Project.created_at.desc()))
        for project in legacy_result.scalars():
            if project.id in known_legacy_ids:
                continue
            item = domain.legacy_project_dict(project, tenant_id)
            item["story"] = await _legacy_story(db, project)
            item["capabilities"] = domain.project_capabilities("Tenant administrator", legacy=True)
            items.append(item)
    child_counts: dict[str, int] = {}
    for item in items:
        if item.get("parent_project_id"):
            parent_id = str(item["parent_project_id"])
            child_counts[parent_id] = child_counts.get(parent_id, 0) + 1
    for item in items:
        item["child_count"] = child_counts.get(str(item["id"]), 0)
    page = items[offset:offset + limit]
    return {"items": page, "summary": _portfolio_summary(items), "next_cursor": str(offset + limit) if offset + limit < len(items) else None, "as_of": domain._now().isoformat(), "source_revision": f"pv1-project-list:{len(pv1_projects)}", "coverage": {"projects": "complete", "rollups": "complete", "resources": "partial"}}


@router.post("/projects")
async def create_project(request: Request, data: schemas.ProjectCreate, db: AsyncSession = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    try:
        command_id = _parse_command_id(idempotency_key)
        actor_id = _actor(request)
        request_role = getattr(request.state, "sysgrid_access_role", None)
        team = None
        if data.team_id is not None:
            team = await db.get(legacy_models.Team, data.team_id)
            if not team or team.is_archived:
                raise domain.PV1DomainError("VALIDATION_FAILED", "Select an active team you are allowed to use.", details={"field_errors": [{"field": "team_id", "message": "Team is unavailable."}]})
            if (request_role or "").upper() != "ADMIN":
                operator_result = await db.execute(select(legacy_models.Operator).where((legacy_models.Operator.username == actor_id) | (legacy_models.Operator.external_id == actor_id)))
                operator = operator_result.scalars().first()
                allowed_team_names = {str(value) for value in (operator.teams or [])} if operator else set()
                if not operator or (operator.team_id != team.id and team.name not in allowed_team_names):
                    raise domain.PV1DomainError("FORBIDDEN", "You cannot create projects for this team.", http_status=status.HTTP_403_FORBIDDEN)
        payload = data.model_dump(mode="json")
        if team is not None:
            team_defaults = team.metadata_json or {}
            team_timezone = str(team_defaults.get("timezone") or "UTC").strip()
            calendar_id = team_defaults.get("calendar_id")
            calendar_revision = team_defaults.get("calendar_revision")
            payload["timezone"] = team_timezone if len(team_timezone) <= 64 else "UTC"
            payload["calendar_id"] = str(calendar_id).strip()[:120] if calendar_id else None
            payload["calendar_revision"] = calendar_revision if isinstance(calendar_revision, int) and not isinstance(calendar_revision, bool) and calendar_revision >= 1 else None
        result = await domain.create_project(db, tenant_id=_tenant_id(request), actor_id=actor_id, request_role=request_role, command_id=command_id, payload=payload)
        await db.commit()
        project = await domain.get_pv1_project(db, _tenant_id(request), result["changed_entities"][0]["id"])
        return {**result, "project": await _project_response(db, project, request)}
    except domain.PV1DomainError as error:
        await db.rollback()
        return _error(request, error)


@router.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    tenant_id = _tenant_id(request)
    project = await domain.get_pv1_project(db, tenant_id, project_id)
    if project:
        try:
            await domain.require_project_role(db, tenant_id=tenant_id, project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
        except domain.PV1DomainError as error:
            return _error(request, error)
        return await _project_response(db, project, request)
    if not project_id.isdigit():
        return _error(request, domain.PV1DomainError("NOT_FOUND", "Project not found.", http_status=404))
    legacy = await db.get(legacy_models.Project, int(project_id))
    if not legacy or legacy.is_deleted:
        return _error(request, domain.PV1DomainError("NOT_FOUND", "Project not found.", http_status=404))
    if (getattr(request.state, "sysgrid_access_role", "") or "").upper() != "ADMIN":
        return _error(request, domain.PV1DomainError("NOT_FOUND", "Project not found.", http_status=404))
    response = domain.legacy_project_dict(legacy, tenant_id)
    response["story"] = await _legacy_story(db, legacy)
    response["capabilities"] = domain.project_capabilities("Tenant administrator", legacy=True)
    return response


@router.get("/projects/{project_id}/summary")
async def get_project_summary(project_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    project_response = await get_project(project_id, request, db)
    if isinstance(project_response, JSONResponse): return project_response
    return {"project": project_response, "story": project_response.get("story", {}), "capabilities": project_response.get("capabilities", {}), "as_of": domain._now().isoformat(), "source_revisions": {"project_revision": project_response.get("revision", 1), "graph_revision": project_response.get("graph_revision", 1)}, "coverage": {"source": "pv1-domain" if project_response.get("legacy_project_id") is None else "legacy-adapter", **(project_response.get("story", {}).get("coverage") or {})}}


@router.get("/projects/{project_id}/readiness")
async def get_project_readiness(project_id: str, request: Request, db: AsyncSession = Depends(get_db), to_phase: str = Query(default="Ready")):
    project = await domain.get_pv1_project(db, _tenant_id(request), project_id)
    if not project:
        return _error(request, domain.PV1DomainError("NOT_FOUND", "Project not found.", http_status=404))
    try:
        await domain.require_project_role(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
        gaps = await domain.project_readiness_gaps(db, project, to_phase)
        return {"project_id": project_id, "from_phase": project.phase, "to_phase": to_phase, "ready": not gaps, "gaps": gaps, "as_of": domain._now().isoformat(), "project_revision": project.revision}
    except domain.PV1DomainError as error:
        return _error(request, error)


@router.get("/projects/{project_id}/tasks")
async def list_tasks(project_id: str, request: Request, db: AsyncSession = Depends(get_db), limit: int = Query(default=50, ge=1, le=200), cursor: str | None = None):
    tenant_id = _tenant_id(request)
    project = await domain.get_pv1_project(db, tenant_id, project_id)
    if project:
        try: await domain.require_project_role(db, tenant_id=tenant_id, project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
        except domain.PV1DomainError as error: return _error(request, error)
        offset = int(cursor or 0) if (cursor or "0").isdigit() else 0
        result = await db.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id == project_id).order_by(models.PV1Task.order_key, models.PV1Task.id).offset(offset).limit(limit + 1))
        tasks = list(result.scalars())
        return {"items": [domain.task_dict(task) for task in tasks[:limit]], "next_cursor": str(offset + limit) if len(tasks) > limit else None, "as_of": domain._now().isoformat(), "source_revision": f"graph:{project.graph_revision}"}
    if project_id.isdigit():
        legacy_result = await db.execute(select(legacy_models.ProjectTask).where(legacy_models.ProjectTask.project_id == int(project_id)).order_by(legacy_models.ProjectTask.id))
        return {"items": [domain.legacy_task_dict(task, project_id) for task in legacy_result.scalars()], "next_cursor": None, "as_of": domain._now().isoformat(), "source_revision": "legacy-adapter"}
    return _error(request, domain.PV1DomainError("NOT_FOUND", "Project not found.", http_status=404))


@router.get("/projects/{project_id}/work")
async def get_work_projection(project_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        return await domain.work_projection(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
    except domain.PV1DomainError as error:
        return _error(request, error)


@router.get("/projects/{project_id}/plan")
async def get_plan_projection(project_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        return await domain.plan_projection(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
    except domain.PV1DomainError as error:
        return _error(request, error)


@router.get("/projects/{project_id}/schedule")
async def get_project_schedule(project_id: str, request: Request, db: AsyncSession = Depends(get_db), as_of: date | None = Query(default=None)):
    try:
        return await domain.schedule_projection(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None), as_of=as_of)
    except domain.PV1DomainError as error:
        return _error(request, error)


@router.post("/projects/{project_id}/schedule/preview")
async def preview_project_schedule(project_id: str, request: Request, body: schemas.SchedulePreviewRequest, db: AsyncSession = Depends(get_db)):
    """Pure schedule calculation: this endpoint intentionally never commits."""
    try:
        return await domain.preview_project_schedule(
            db,
            tenant_id=_tenant_id(request),
            project_id=project_id,
            actor_id=_actor(request),
            request_role=getattr(request.state, "sysgrid_access_role", None),
            operation=body.operation,
            selection_ids=body.selection_ids,
            parameters=body.parameters,
            graph_revision=body.graph_revision,
            calendar_revision=body.calendar_revision,
        )
    except domain.PV1DomainError as error:
        await db.rollback()
        return _error(request, error)


@router.post("/projects/{project_id}/tasks/import/preview")
async def preview_task_import(project_id: str, request: Request, raw: dict[str, Any], db: AsyncSession = Depends(get_db)):
    try:
        await domain.require_project_role(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
        return domain.parse_task_import(raw)
    except domain.PV1DomainError as error:
        return _error(request, error)


@router.post("/projects/{project_id}/tasks/import")
async def import_tasks(project_id: str, request: Request, raw: dict[str, Any], db: AsyncSession = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    try:
        command_id = _parse_command_id(idempotency_key)
        await domain.require_project_role(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None), write=True)
        result = await domain.import_tasks(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), command_id=command_id, expected=raw.get("expected") or {}, raw=raw)
        await db.commit()
        return result
    except domain.PV1DomainError as error:
        await db.rollback()
        return _error(request, error)


@router.get("/projects/{project_id}/events")
async def list_events(project_id: str, request: Request, db: AsyncSession = Depends(get_db), limit: int = Query(default=50, ge=1, le=200)):
    try:
        await domain.require_project_role(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
    except domain.PV1DomainError as error: return _error(request, error)
    result = await db.execute(select(models.PV1Event).where(models.PV1Event.tenant_id == _tenant_id(request), models.PV1Event.project_id == project_id).order_by(models.PV1Event.sequence.desc()).limit(limit))
    return {"items": [{"event_id": event.event_id, "project_id": event.project_id, "aggregate_type": event.aggregate_type, "aggregate_id": event.aggregate_id, "aggregate_revision": event.aggregate_revision, "sequence": event.sequence, "actor_id": event.actor_id, "timestamp": domain._serialize(event.timestamp), "event_type": event.event_type, "command_id": event.command_id, "delta": event.delta or {}} for event in result.scalars()], "next_cursor": None, "as_of": domain._now().isoformat(), "source_revision": "events"}


@router.get("/projects/{project_id}/metrics")
async def list_metrics(project_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try: await domain.require_project_role(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
    except domain.PV1DomainError as error: return _error(request, error)
    result = await db.execute(select(models.PV1Metric).where(models.PV1Metric.tenant_id == _tenant_id(request), models.PV1Metric.project_id == project_id, models.PV1Metric.archived_at.is_(None)).order_by(models.PV1Metric.name))
    return {"items": [_metric_dict(item) for item in result.scalars()], "next_cursor": None, "as_of": domain._now().isoformat(), "source_revision": "metrics"}


@router.get("/projects/{project_id}/measurements")
async def list_measurements(project_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try: await domain.require_project_role(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
    except domain.PV1DomainError as error: return _error(request, error)
    result = await db.execute(select(models.PV1Measurement).where(models.PV1Measurement.tenant_id == _tenant_id(request), models.PV1Measurement.project_id == project_id).order_by(models.PV1Measurement.period_end.desc(), models.PV1Measurement.recorded_at.desc()))
    return {"items": [_measurement_dict(item) for item in result.scalars()], "next_cursor": None, "as_of": domain._now().isoformat(), "source_revision": "measurements"}


@router.get("/projects/{project_id}/values")
async def list_values(project_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        await domain.require_project_role(db, tenant_id=_tenant_id(request), project_id=project_id, actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None))
        await _require_capability(db, request, project_id, "financial.view")
    except domain.PV1DomainError as error: return _error(request, error)
    result = await db.execute(select(models.PV1ValueEntry).where(models.PV1ValueEntry.tenant_id == _tenant_id(request), models.PV1ValueEntry.project_id == project_id).order_by(models.PV1ValueEntry.period_end.desc()))
    return {"items": [{"id": item.id, "classification": item.classification, "amount": domain._serialize(item.amount), "currency_or_unit": item.currency_or_unit, "period_start": domain._serialize(item.period_start), "period_end": domain._serialize(item.period_end), "attribution_key": item.attribution_key, "fraction": domain._serialize(item.fraction), "quality": item.quality, "source": item.source} for item in result.scalars()], "next_cursor": None, "as_of": domain._now().isoformat(), "source_revision": "values"}


@router.post("/projects/{project_id}/commands")
async def project_command(project_id: str, request: Request, envelope: schemas.CommandEnvelope, db: AsyncSession = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    try:
        command_id = _parse_command_id(idempotency_key)
        if command_id != str(envelope.command_id):
            raise domain.PV1DomainError("VALIDATION_FAILED", "command_id must equal Idempotency-Key.", details={"field": "command_id"})
        if envelope.type == "value.record": await _require_capability(db, request, project_id, "financial.edit")
        result = await domain.execute_command(db, tenant_id=_tenant_id(request), actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None), project_id=project_id, command_id=command_id, command_type=envelope.type, expected=envelope.expected, payload=envelope.payload)
        await db.commit()
        return result
    except domain.PV1DomainError as error:
        await db.rollback()
        return _error(request, error)
