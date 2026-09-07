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
            "saved_views": {"supported": False, "contract_version": None},
            "schedule_preview": {"supported": False, "contract_version": None},
            "architecture_read": {"supported": False, "contract_version": None},
            "architecture_edit": {"supported": False, "contract_version": None},
        },
    }


@router.get("/projects/my-day")
async def get_my_day(request: Request, db: AsyncSession = Depends(get_db), limit: int = Query(default=50, ge=1, le=200)):
    actor = _actor(request)
    tenant_id = _tenant_id(request)
    member_result = await db.execute(select(models.PV1ProjectMember.project_id).where(models.PV1ProjectMember.tenant_id == tenant_id, models.PV1ProjectMember.user_id == actor))
    project_ids = list(member_result.scalars())
    if not project_ids:
        return {"items": [], "next_cursor": None, "as_of": domain._now().isoformat(), "source_revision": "pv1-projects:0"}
    result = await db.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == tenant_id, models.PV1Task.project_id.in_(project_ids), models.PV1Task.owner_id == actor, models.PV1Task.status != "Done").limit(limit))
    return {"items": [domain.task_dict(task) for task in result.scalars()], "next_cursor": None, "as_of": domain._now().isoformat(), "source_revision": "pv1-tasks"}


@router.get("/projects")
async def list_projects(request: Request, db: AsyncSession = Depends(get_db), limit: int = Query(default=50, ge=1, le=200), cursor: str | None = None):
    tenant_id = _tenant_id(request)
    offset = int(cursor or 0) if (cursor or "0").isdigit() else 0
    items: list[dict[str, Any]] = []
    pv1_result = await db.execute(select(models.PV1Project).where(models.PV1Project.tenant_id == tenant_id, models.PV1Project.archived_at.is_(None)).order_by(models.PV1Project.display_key))
    pv1_projects = list(pv1_result.scalars())
    items.extend(domain.project_dict(project) for project in pv1_projects)
    known_legacy_ids = {project.legacy_project_id for project in pv1_projects if project.legacy_project_id is not None}
    legacy_result = await db.execute(select(legacy_models.Project).where(legacy_models.Project.is_deleted == False).order_by(legacy_models.Project.order_index, legacy_models.Project.created_at.desc()))
    items.extend(domain.legacy_project_dict(project, tenant_id) for project in legacy_result.scalars() if project.id not in known_legacy_ids)
    page = items[offset:offset + limit]
    return {"items": page, "next_cursor": str(offset + limit) if offset + limit < len(items) else None, "as_of": domain._now().isoformat(), "source_revision": f"pv1-project-list:{len(pv1_projects)}"}


@router.post("/projects")
async def create_project(request: Request, data: schemas.ProjectCreate, db: AsyncSession = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    try:
        command_id = _parse_command_id(idempotency_key)
        result = await domain.create_project(db, tenant_id=_tenant_id(request), actor_id=_actor(request), request_role=getattr(request.state, "sysgrid_access_role", None), command_id=command_id, payload=data.model_dump(mode="json"))
        await db.commit()
        project = await domain.get_pv1_project(db, _tenant_id(request), result["changed_entities"][0]["id"])
        return {**result, "project": domain.project_dict(project)}
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
        return domain.project_dict(project)
    if not project_id.isdigit():
        return _error(request, domain.PV1DomainError("NOT_FOUND", "Project not found.", http_status=404))
    legacy = await db.get(legacy_models.Project, int(project_id))
    if not legacy or legacy.is_deleted:
        return _error(request, domain.PV1DomainError("NOT_FOUND", "Project not found.", http_status=404))
    return domain.legacy_project_dict(legacy, tenant_id)


@router.get("/projects/{project_id}/summary")
async def get_project_summary(project_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    project_response = await get_project(project_id, request, db)
    if isinstance(project_response, JSONResponse): return project_response
    return {"project": project_response, "as_of": domain._now().isoformat(), "source_revisions": {"project_revision": project_response.get("revision", 1), "graph_revision": project_response.get("graph_revision", 1)}, "coverage": {"source": "pv1-domain" if project_response.get("legacy_project_id") is None else "legacy-adapter"}}


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

