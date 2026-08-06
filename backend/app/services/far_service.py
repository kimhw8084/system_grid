from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Sequence
from uuid import uuid4

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, insert, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..api.utils import build_audit_log, get_current_user_id, normalize_json_object
from ..models import models
from ..schemas import schemas

FAR_SCHEMA_VERSION = 1
FAR_STATUSES = (
    "Analyzing",
    "Cause Identified",
    "Resolution Identified",
    "Mitigated",
    "Eliminated",
)
LEGACY_STATUS_MAP = {
    "open": "Analyzing",
    "analysis": "Analyzing",
    "analyzing": "Analyzing",
    "cause identified": "Cause Identified",
    "root cause identified": "Cause Identified",
    "resolution identified": "Resolution Identified",
    "resolved": "Resolution Identified",
    "mitigated": "Mitigated",
    "prevented": "Eliminated",
    "eliminated": "Eliminated",
    "closed": "Eliminated",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def json_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, dict):
        return {str(key): json_value(value[key]) for key in sorted(value, key=lambda item: str(item))}
    if isinstance(value, (list, tuple, set)):
        return [json_value(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def canonical_hash(value: Any) -> str:
    payload = json.dumps(json_value(value), sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def tenant_identity(request: Request) -> str:
    tenant_id = getattr(request.state, "tenant_id", None)
    if tenant_id is None:
        raise HTTPException(status_code=500, detail="Tenant identity was not resolved for the FAR request.")
    return str(tenant_id)


def actor_identity(request: Request) -> str:
    return get_current_user_id(request)


def access_role(request: Request) -> str:
    return str(getattr(request.state, "sysgrid_access_role", "VIEWER") or "VIEWER").upper()


def require_role(request: Request, allowed: set[str]) -> str:
    role = access_role(request)
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FAR_ROLE_FORBIDDEN", "required": sorted(allowed), "actual": role},
        )
    return role


def calculate_rpn(severity: int, occurrence: int, detection: int) -> int:
    for label, value in (("severity", severity), ("occurrence", occurrence), ("detection", detection)):
        if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 10:
            raise HTTPException(status_code=422, detail={"code": "FAR_SCORE_OUT_OF_RANGE", "field": label})
    return severity * occurrence * detection


def risk_band(rpn: int) -> str:
    if rpn >= 300:
        return "Critical"
    if rpn >= 200:
        return "High"
    if rpn >= 100:
        return "Moderate"
    return "Low"


async def repair_mode_rpn_integrity(db: AsyncSession) -> int:
    """Repair stale stored derived scores before FAR records leave the service boundary."""
    canonical_rpn = (
        models.FarFailureMode.severity
        * models.FarFailureMode.occurrence
        * models.FarFailureMode.detection
    )
    result = await db.execute(
        update(models.FarFailureMode)
        .where(
            or_(
                models.FarFailureMode.rpn.is_(None),
                models.FarFailureMode.rpn != canonical_rpn,
            )
        )
        .values(rpn=canonical_rpn)
    )
    repaired = int(result.rowcount or 0)
    if repaired:
        await db.commit()
    return repaired


def canonical_status(value: str) -> str:
    normalized = " ".join(str(value or "").split()).strip()
    if normalized in FAR_STATUSES:
        return normalized
    mapped = LEGACY_STATUS_MAP.get(normalized.lower())
    if mapped:
        return mapped
    raise HTTPException(status_code=422, detail={"code": "FAR_UNKNOWN_STATUS", "value": normalized})


def maturity_level(mode: models.FarFailureMode) -> int:
    active_mitigations = [item for item in mode.mitigations if not getattr(item, "is_retired", False)]
    active_prevention = [item for item in mode.prevention_actions if not getattr(item, "is_retired", False)]
    has_monitoring = any((item.mitigation_type or "").lower() == "monitoring" for item in active_mitigations)
    has_workaround = any((item.mitigation_type or "").lower() == "workaround" for item in active_mitigations)
    has_resolution = any(
        any(not getattr(resolution, "is_retired", False) for resolution in cause.resolutions)
        for cause in mode.causes
        if not getattr(cause, "is_retired", False)
    )
    verified_prevention = any((item.status or "").lower() in {"verified", "completed"} for item in active_prevention)
    if mode.status == "Eliminated" and verified_prevention:
        return 8
    if has_monitoring and has_resolution and has_workaround:
        return 7
    if has_monitoring and has_resolution:
        return 6
    if has_resolution and has_workaround:
        return 5
    if has_resolution:
        return 4
    if has_monitoring and has_workaround:
        return 3
    if has_workaround:
        return 2
    if has_monitoring:
        return 1
    return 0


def mode_loader_options() -> tuple[Any, ...]:
    return (
        selectinload(models.FarFailureMode.causes)
        .selectinload(models.FarFailureCause.resolutions)
        .selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.mitigations),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.prevention_actions),
        selectinload(models.FarFailureMode.mitigations).selectinload(models.FarMitigation.monitoring_item),
        selectinload(models.FarFailureMode.affected_assets),
        selectinload(models.FarFailureMode.prevention_actions),
        selectinload(models.FarFailureMode.linked_rcas),
    )


def mode_query(*, include_retired: bool = False):
    stmt = select(models.FarFailureMode).options(*mode_loader_options())
    if not include_retired:
        stmt = stmt.where(models.FarFailureMode.is_retired == False, models.FarFailureMode.is_deleted == False)
    return stmt


async def get_mode(db: AsyncSession, mode_id: int, *, include_retired: bool = False) -> models.FarFailureMode:
    result = await db.execute(mode_query(include_retired=include_retired).where(models.FarFailureMode.id == mode_id))
    mode = result.unique().scalar_one_or_none()
    if mode is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_MODE_NOT_FOUND", "id": mode_id})
    return mode


def cause_query():
    return select(models.FarFailureCause).options(
        selectinload(models.FarFailureCause.failure_modes),
        selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureCause.mitigations),
        selectinload(models.FarFailureCause.prevention_actions),
    )


async def get_cause(db: AsyncSession, cause_id: int, *, include_retired: bool = False) -> models.FarFailureCause:
    stmt = cause_query().where(models.FarFailureCause.id == cause_id)
    if not include_retired:
        stmt = stmt.where(models.FarFailureCause.is_retired == False)
    result = await db.execute(stmt)
    cause = result.unique().scalar_one_or_none()
    if cause is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_CAUSE_NOT_FOUND", "id": cause_id})
    return cause


def serialize_resolution(item: models.FarResolution) -> dict[str, Any]:
    return {
        "id": item.id,
        "knowledge_id": item.knowledge_id,
        "preventive_follow_up": item.preventive_follow_up,
        "responsible_team": item.responsible_team,
        "guidance_notes": item.guidance_notes,
        "knowledge_bkm": (
            {
                "id": item.knowledge_bkm.id,
                "category": item.knowledge_bkm.category,
                "title": item.knowledge_bkm.title,
                "status": item.knowledge_bkm.status,
            }
            if item.knowledge_bkm else None
        ),
        "version": item.version,
        "is_retired": item.is_retired,
        "retired_at": item.retired_at,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def serialize_mitigation(item: models.FarMitigation) -> dict[str, Any]:
    return {
        "id": item.id,
        "mitigation_type": item.mitigation_type,
        "mitigation_steps": item.mitigation_steps,
        "responsible_team": item.responsible_team,
        "status": item.status,
        "cause_id": item.cause_id,
        "monitoring_item_id": item.monitoring_item_id,
        "version": item.version,
        "is_retired": item.is_retired,
        "retired_at": item.retired_at,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def serialize_prevention(item: models.FarPrevention) -> dict[str, Any]:
    return {
        "id": item.id,
        "failure_mode_id": item.failure_mode_id,
        "cause_id": item.cause_id,
        "project_id": item.project_id,
        "prevention_action": item.prevention_action,
        "status": item.status,
        "target_date": item.target_date,
        "responsible_team": item.responsible_team,
        "version": item.version,
        "is_retired": item.is_retired,
        "retired_at": item.retired_at,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def serialize_cause(item: models.FarFailureCause, *, include_retired_nested: bool = False) -> dict[str, Any]:
    resolutions = item.resolutions if include_retired_nested else [x for x in item.resolutions if not x.is_retired]
    mitigations = item.mitigations if include_retired_nested else [x for x in item.mitigations if not x.is_retired]
    prevention = item.prevention_actions if include_retired_nested else [x for x in item.prevention_actions if not x.is_retired]
    return {
        "id": item.id,
        "cause_text": item.cause_text,
        "occurrence_level": item.occurrence_level,
        "responsible_team": item.responsible_team,
        "version": item.version,
        "is_retired": item.is_retired,
        "retired_at": item.retired_at,
        "resolutions": [serialize_resolution(x) for x in resolutions],
        "mitigations": [serialize_mitigation(x) for x in mitigations],
        "prevention_actions": [serialize_prevention(x) for x in prevention],
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def serialize_mode(mode: models.FarFailureMode, *, include_retired_nested: bool = False) -> dict[str, Any]:
    causes = mode.causes if include_retired_nested else [x for x in mode.causes if not x.is_retired]
    mitigations = mode.mitigations if include_retired_nested else [x for x in mode.mitigations if not x.is_retired]
    prevention = mode.prevention_actions if include_retired_nested else [x for x in mode.prevention_actions if not x.is_retired]
    canonical_rpn = calculate_rpn(mode.severity, mode.occurrence, mode.detection)
    return {
        "id": mode.id,
        "system_name": mode.system_name,
        "failure_type": mode.failure_type,
        "title": mode.title,
        "effect": mode.effect,
        "severity": mode.severity,
        "occurrence": mode.occurrence,
        "detection": mode.detection,
        "rpn": canonical_rpn,
        "risk_band": risk_band(canonical_rpn),
        "maturity_level": maturity_level(mode),
        "status": canonical_status(mode.status),
        "owner_user_id": mode.owner_user_id,
        "owner_team": mode.owner_team,
        "due_at": mode.due_at,
        "has_incident_history": mode.has_incident_history,
        "version": mode.version,
        "is_retired": mode.is_retired,
        "retired_at": mode.retired_at,
        "retired_reason": mode.retired_reason,
        "metadata_json": normalize_json_object(mode.metadata_json or {}),
        "affected_assets": [
            {
                "id": item.id,
                "name": item.name,
                "system": item.system,
                "type": item.type,
                "status": item.status,
                "primary_ip": item.primary_ip,
            }
            for item in mode.affected_assets
        ],
        "causes": [serialize_cause(x, include_retired_nested=include_retired_nested) for x in causes],
        "mitigations": [serialize_mitigation(x) for x in mitigations],
        "prevention_actions": [serialize_prevention(x) for x in prevention],
        "linked_rcas": [
            {
                "id": item.id,
                "title": item.title,
                "severity": item.severity,
                "status": item.status,
                "incident_type": item.incident_type,
            }
            for item in mode.linked_rcas
        ],
        "created_at": mode.created_at,
        "updated_at": mode.updated_at,
        "created_by_user_id": mode.created_by_user_id,
    }


def mode_snapshot(mode: models.FarFailureMode) -> tuple[dict[str, Any], dict[str, Any]]:
    serialized = serialize_mode(mode, include_retired_nested=True)
    relationships = {
        "affected_asset_ids": sorted(item.id for item in mode.affected_assets),
        "cause_ids": sorted(item.id for item in mode.causes),
        "mitigation_ids": sorted(item.id for item in mode.mitigations),
        "prevention_ids": sorted(item.id for item in mode.prevention_actions),
        "linked_rca_ids": sorted(item.id for item in mode.linked_rcas),
        "relationship_versions": {
            "causes": {str(item.id): item.version for item in mode.causes},
            "mitigations": {str(item.id): item.version for item in mode.mitigations},
            "prevention": {str(item.id): item.version for item in mode.prevention_actions},
        },
    }
    for key in ("affected_assets", "causes", "mitigations", "prevention_actions", "linked_rcas"):
        serialized.pop(key, None)
    return json_value(serialized), json_value(relationships)


async def write_mode_history(
    db: AsyncSession,
    mode: models.FarFailureMode,
    request: Request,
    summary: str,
) -> None:
    snapshot, relationships = mode_snapshot(mode)
    digest = canonical_hash({"snapshot": snapshot, "relationships": relationships})
    actor = actor_identity(request)
    db.add(models.FarHistory(
        far_mode_id=mode.id,
        version=mode.version,
        snapshot={**snapshot, **relationships},
        change_summary=summary,
    ))
    db.add(models.FarEntityHistory(
        entity_type="failure_mode",
        entity_id=mode.id,
        version=mode.version,
        schema_version=FAR_SCHEMA_VERSION,
        snapshot=snapshot,
        relationship_snapshot=relationships,
        actor_user_id=actor,
        snapshot_hash=digest,
        change_summary=summary,
        created_by_user_id=actor,
    ))


async def write_entity_history(
    db: AsyncSession,
    request: Request,
    *,
    entity_type: str,
    entity_id: int,
    version: int,
    snapshot: dict[str, Any],
    relationships: dict[str, Any],
    summary: str,
) -> None:
    normalized_snapshot = json_value(snapshot)
    normalized_relationships = json_value(relationships)
    digest = canonical_hash({"snapshot": normalized_snapshot, "relationships": normalized_relationships})
    db.add(models.FarEntityHistory(
        entity_type=entity_type,
        entity_id=entity_id,
        version=version,
        schema_version=FAR_SCHEMA_VERSION,
        snapshot=normalized_snapshot,
        relationship_snapshot=normalized_relationships,
        actor_user_id=actor_identity(request),
        snapshot_hash=digest,
        change_summary=summary,
        created_by_user_id=actor_identity(request),
    ))


async def write_audit(
    db: AsyncSession,
    request: Request,
    *,
    action: str,
    target_table: str,
    target_id: int | str,
    description: str,
    changes: dict[str, Any],
) -> None:
    db.add(build_audit_log(
        request=request,
        action=action,
        target_table=target_table,
        target_id=str(target_id),
        description=description,
        changes={
            "tenant_id": tenant_identity(request),
            "request_id": getattr(request.state, "request_id", None),
            **changes,
        },
    ))


async def exact_entities(
    db: AsyncSession,
    model: Any,
    ids: Sequence[int],
    *,
    active_field: str | None = None,
    label: str,
) -> list[Any]:
    unique = list(dict.fromkeys(int(item) for item in ids))
    if len(unique) != len(ids):
        raise HTTPException(status_code=422, detail={"code": "FAR_DUPLICATE_RELATIONSHIP_ID", "relation": label})
    if not unique:
        return []
    stmt = select(model).where(model.id.in_(unique))
    if active_field and hasattr(model, active_field):
        stmt = stmt.where(getattr(model, active_field) == False)
    result = await db.execute(stmt)
    entities = result.scalars().all()
    found = {item.id for item in entities}
    missing = sorted(set(unique) - found)
    if missing:
        raise HTTPException(status_code=422, detail={"code": "FAR_RELATIONSHIP_SET_MISMATCH", "relation": label, "missing_ids": missing})
    by_id = {item.id: item for item in entities}
    return [by_id[item] for item in unique]


async def existing_receipt(db: AsyncSession, request: Request, idempotency_key: str) -> models.FarOperationReceipt | None:
    result = await db.execute(
        select(models.FarOperationReceipt).where(
            models.FarOperationReceipt.actor_user_id == actor_identity(request),
            models.FarOperationReceipt.idempotency_key == idempotency_key,
        )
    )
    return result.scalar_one_or_none()


async def save_executed_receipt(
    db: AsyncSession,
    request: Request,
    *,
    operation: str,
    idempotency_key: str,
    payload: Any,
    result: dict[str, Any],
    correlation_id: str,
) -> models.FarOperationReceipt:
    raw_token = secrets.token_urlsafe(32)
    receipt = models.FarOperationReceipt(
        actor_user_id=actor_identity(request),
        tenant_identity=tenant_identity(request),
        operation_type=operation,
        idempotency_key=idempotency_key,
        token_hash=token_hash(raw_token),
        payload_hash=canonical_hash(payload),
        preview_hash=canonical_hash(result),
        target_versions=result.get("versions", {}),
        expires_at=utcnow() + timedelta(days=7),
        state="executed",
        result_json=json_value(result),
        audit_correlation_id=correlation_id,
        executed_at=utcnow(),
        created_by_user_id=actor_identity(request),
    )
    db.add(receipt)
    return receipt


async def list_modes(db: AsyncSession, *, system: str | None = None, include_retired: bool = False) -> list[dict[str, Any]]:
    await repair_mode_rpn_integrity(db)
    canonical_rpn = (
        models.FarFailureMode.severity
        * models.FarFailureMode.occurrence
        * models.FarFailureMode.detection
    )
    stmt = mode_query(include_retired=include_retired).order_by(canonical_rpn.desc(), models.FarFailureMode.id.asc())
    if system:
        stmt = stmt.where(models.FarFailureMode.system_name == system)
    result = await db.execute(stmt)
    return [serialize_mode(item, include_retired_nested=include_retired) for item in result.unique().scalars().all()]


async def create_mode(db: AsyncSession, request: Request, data: schemas.FarFailureModeCreate) -> dict[str, Any]:
    require_role(request, {"EDITOR", "ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.mode.create" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        result = dict(prior.result_json or {})
        result["idempotent_replay"] = True
        return result["record"]

    actor = actor_identity(request)
    assets = await exact_entities(db, models.Device, data.affected_asset_ids, active_field="is_deleted", label="affected_asset_ids")
    causes = await exact_entities(db, models.FarFailureCause, data.cause_ids, active_field="is_retired", label="cause_ids")
    rcas = await exact_entities(db, models.RcaRecord, data.linked_rca_ids, label="linked_rca_ids")
    mode = models.FarFailureMode(
        system_name=data.system_name.strip(),
        failure_type=data.failure_type.strip(),
        title=data.title.strip(),
        effect=data.effect,
        severity=data.severity,
        occurrence=data.occurrence,
        detection=data.detection,
        rpn=calculate_rpn(data.severity, data.occurrence, data.detection),
        status=canonical_status(data.status),
        owner_user_id=data.owner_user_id,
        owner_team=data.owner_team,
        due_at=data.due_at,
        version=1,
        is_deleted=False,
        is_retired=False,
        metadata_json=normalize_json_object(data.metadata_json),
        affected_assets=assets,
        causes=causes,
        linked_rcas=rcas,
        created_by_user_id=actor,
    )
    db.add(mode)
    try:
        await db.flush()
        loaded = await get_mode(db, mode.id, include_retired=True)
        await write_mode_history(db, loaded, request, "Initial creation")
        correlation = str(uuid4())
        record = serialize_mode(loaded)
        await write_audit(db, request, action="far.mode.create", target_table="far_failure_modes", target_id=mode.id, description="Created FAR failure mode", changes={"after": record, "correlation_id": correlation})
        await save_executed_receipt(db, request, operation="far.mode.create", idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result={"record": record, "versions": {str(mode.id): mode.version}}, correlation_id=correlation)
        await db.commit()
        return serialize_mode(await get_mode(db, mode.id, include_retired=True))
    except Exception:
        await db.rollback()
        raise


async def update_mode(db: AsyncSession, request: Request, mode_id: int, data: schemas.FarFailureModeUpdate) -> dict[str, Any]:
    require_role(request, {"EDITOR", "ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.mode.update" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        return (prior.result_json or {})["record"]

    mode = await get_mode(db, mode_id, include_retired=True)
    if mode.is_retired:
        raise HTTPException(status_code=409, detail={"code": "FAR_MODE_RETIRED", "id": mode_id})
    if mode.version != data.expected_version:
        raise HTTPException(status_code=409, detail={"code": "FAR_VERSION_CONFLICT", "expected": data.expected_version, "actual": mode.version})
    before = serialize_mode(mode, include_retired_nested=True)
    values = data.model_dump(exclude_unset=True, exclude={"expected_version", "change_summary", "idempotency_key", "affected_asset_ids", "cause_ids", "linked_rca_ids"})
    for key, value in values.items():
        if key == "status" and value is not None:
            value = canonical_status(value)
        if key == "metadata_json" and value is not None:
            value = normalize_json_object(value)
        setattr(mode, key, value)
    if data.affected_asset_ids is not None:
        mode.affected_assets = await exact_entities(db, models.Device, data.affected_asset_ids, active_field="is_deleted", label="affected_asset_ids")
    if data.cause_ids is not None:
        mode.causes = await exact_entities(db, models.FarFailureCause, data.cause_ids, active_field="is_retired", label="cause_ids")
    if data.linked_rca_ids is not None:
        mode.linked_rcas = await exact_entities(db, models.RcaRecord, data.linked_rca_ids, label="linked_rca_ids")
    mode.rpn = calculate_rpn(mode.severity, mode.occurrence, mode.detection)
    mode.version += 1
    try:
        await db.flush()
        loaded = await get_mode(db, mode.id, include_retired=True)
        await write_mode_history(db, loaded, request, data.change_summary)
        after = serialize_mode(loaded, include_retired_nested=True)
        correlation = str(uuid4())
        await write_audit(db, request, action="far.mode.update", target_table="far_failure_modes", target_id=mode.id, description=data.change_summary, changes={"before": before, "after": after, "correlation_id": correlation})
        await save_executed_receipt(db, request, operation="far.mode.update", idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result={"record": after, "versions": {str(mode.id): mode.version}}, correlation_id=correlation)
        await db.commit()
        return serialize_mode(await get_mode(db, mode.id, include_retired=True))
    except Exception:
        await db.rollback()
        raise


async def preview_retirement(db: AsyncSession, request: Request, data: schemas.FarRetirementPreviewRequest) -> dict[str, Any]:
    require_role(request, {"ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.mode.retire" or prior.state not in {"previewed", "executed"}:
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        if prior.state == "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_OPERATION_ALREADY_EXECUTED", "result": prior.result_json})
        result = dict(prior.result_json or {})
        result["preview_token"] = ""
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_TOKEN_ALREADY_ISSUED", "preview_hash": prior.preview_hash})

    result = await db.execute(mode_query(include_retired=True).where(models.FarFailureMode.id.in_(data.ids)))
    modes = {item.id: item for item in result.unique().scalars().all()}
    missing = [item for item in data.ids if item not in modes]
    blockers: list[dict[str, Any]] = []
    changed: list[int] = []
    unchanged: list[int] = []
    actual_versions: dict[int, int] = {}
    for item in data.ids:
        mode = modes.get(item)
        if mode is None:
            continue
        actual_versions[item] = mode.version
        if mode.version != data.expected_versions[item]:
            blockers.append({"id": item, "code": "FAR_VERSION_CONFLICT", "expected": data.expected_versions[item], "actual": mode.version})
        elif mode.is_retired:
            unchanged.append(item)
        else:
            changed.append(item)
    can_execute = not missing and not blockers and bool(changed)
    preview_basis = {
        "operation": "far.mode.retire",
        "ids": data.ids,
        "expected_versions": data.expected_versions,
        "actual_versions": actual_versions,
        "reason": data.reason,
        "changed_ids": changed,
        "unchanged_ids": unchanged,
        "missing_ids": missing,
        "blockers": blockers,
        "tenant": tenant_identity(request),
        "actor": actor_identity(request),
    }
    preview_digest = canonical_hash(preview_basis)
    raw_token = secrets.token_urlsafe(40)
    expires = utcnow() + timedelta(minutes=10)
    receipt = models.FarOperationReceipt(
        actor_user_id=actor_identity(request),
        tenant_identity=tenant_identity(request),
        operation_type="far.mode.retire",
        idempotency_key=data.idempotency_key,
        token_hash=token_hash(raw_token),
        payload_hash=canonical_hash(data.model_dump(mode="json")),
        preview_hash=preview_digest,
        target_versions={str(key): value for key, value in actual_versions.items()},
        expires_at=expires,
        state="previewed",
        result_json=json_value({**preview_basis, "can_execute": can_execute}),
        audit_correlation_id=str(uuid4()),
        created_by_user_id=actor_identity(request),
    )
    db.add(receipt)
    await db.commit()
    return {
        "operation": "retire",
        "selected_count": len(data.ids),
        "matched_count": len(modes),
        "changed_count": len(changed),
        "unchanged_count": len(unchanged),
        "blocked_count": len(blockers),
        "missing_count": len(missing),
        "changed_ids": changed,
        "unchanged_ids": unchanged,
        "missing_ids": missing,
        "blockers": blockers,
        "can_execute": can_execute,
        "preview_token": raw_token,
        "preview_hash": preview_digest,
        "expires_at": expires,
        "target_versions": actual_versions,
    }


async def execute_retirement(db: AsyncSession, request: Request, data: schemas.FarOperationExecuteRequest) -> dict[str, Any]:
    require_role(request, {"ADMIN"})
    result = await db.execute(select(models.FarOperationReceipt).where(
        models.FarOperationReceipt.token_hash == token_hash(data.preview_token),
        models.FarOperationReceipt.actor_user_id == actor_identity(request),
        models.FarOperationReceipt.tenant_identity == tenant_identity(request),
        models.FarOperationReceipt.operation_type == "far.mode.retire",
    ))
    receipt = result.scalar_one_or_none()
    if receipt is None:
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_TOKEN_INVALID"})
    if receipt.idempotency_key != data.idempotency_key:
        raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_MISMATCH"})
    if receipt.preview_hash != data.preview_hash:
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_HASH_MISMATCH"})
    if receipt.state == "executed":
        replay = dict(receipt.result_json or {})
        replay["idempotent_replay"] = True
        return replay
    if receipt.state != "previewed" or receipt.expires_at.replace(tzinfo=timezone.utc) <= utcnow():
        receipt.state = "expired"
        await db.commit()
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_EXPIRED"})

    preview = dict(receipt.result_json or {})
    if not preview.get("can_execute"):
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_BLOCKED", "preview": preview})
    changed_ids = [int(item) for item in preview.get("changed_ids", [])]
    expected_versions = {int(key): int(value) for key, value in receipt.target_versions.items()}
    modes_result = await db.execute(mode_query(include_retired=True).where(models.FarFailureMode.id.in_(changed_ids)))
    modes = {item.id: item for item in modes_result.unique().scalars().all()}
    if set(modes) != set(changed_ids):
        raise HTTPException(status_code=409, detail={"code": "FAR_TARGET_SET_CHANGED"})
    conflicts = [
        {"id": item, "expected": expected_versions[item], "actual": modes[item].version}
        for item in changed_ids
        if modes[item].version != expected_versions[item] or modes[item].is_retired
    ]
    if conflicts:
        raise HTTPException(status_code=409, detail={"code": "FAR_TARGET_VERSION_CHANGED", "conflicts": conflicts})

    reason = str(preview.get("reason") or "Retired through confirmed preview")
    versions: dict[int, int] = {}
    try:
        for mode in modes.values():
            before = serialize_mode(mode, include_retired_nested=True)
            mode.is_retired = True
            mode.is_deleted = True
            mode.retired_at = utcnow()
            mode.retired_by_user_id = actor_identity(request)
            mode.retired_reason = reason
            mode.version += 1
            versions[mode.id] = mode.version
            await db.flush()
            loaded = await get_mode(db, mode.id, include_retired=True)
            await write_mode_history(db, loaded, request, f"Retired: {reason}")
            await write_audit(db, request, action="far.mode.retire", target_table="far_failure_modes", target_id=mode.id, description=reason, changes={"before": before, "after": serialize_mode(loaded, include_retired_nested=True), "correlation_id": receipt.audit_correlation_id})
        mutation = {
            "status": "success",
            "operation": "retire",
            "changed_count": len(changed_ids),
            "unchanged_count": 0,
            "changed_ids": changed_ids,
            "versions": versions,
            "audit_correlation_id": receipt.audit_correlation_id,
            "idempotent_replay": False,
        }
        receipt.state = "executed"
        receipt.executed_at = utcnow()
        receipt.result_json = json_value(mutation)
        await db.commit()
        return mutation
    except Exception:
        await db.rollback()
        raise


async def restore_mode(db: AsyncSession, request: Request, mode_id: int, data: schemas.FarRestoreRequest) -> dict[str, Any]:
    require_role(request, {"ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.mode.restore" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        replay = dict(prior.result_json or {})
        replay["idempotent_replay"] = True
        return replay
    mode = await get_mode(db, mode_id, include_retired=True)
    if mode.version != data.expected_version:
        raise HTTPException(status_code=409, detail={"code": "FAR_VERSION_CONFLICT", "expected": data.expected_version, "actual": mode.version})
    if not mode.is_retired:
        return {"status": "unchanged", "operation": "restore", "changed_count": 0, "unchanged_count": 1, "changed_ids": [], "versions": {mode.id: mode.version}, "audit_correlation_id": str(uuid4()), "idempotent_replay": False}
    if not mode.system_name or not mode.title:
        raise HTTPException(status_code=422, detail={"code": "FAR_RESTORE_REQUIRED_FIELDS_INVALID"})
    correlation = str(uuid4())
    before = serialize_mode(mode, include_retired_nested=True)
    mode.is_retired = False
    mode.is_deleted = False
    mode.retired_at = None
    mode.retired_by_user_id = None
    mode.retired_reason = None
    mode.version += 1
    try:
        await db.flush()
        loaded = await get_mode(db, mode.id, include_retired=True)
        await write_mode_history(db, loaded, request, f"Restored: {data.reason}")
        await write_audit(db, request, action="far.mode.restore", target_table="far_failure_modes", target_id=mode.id, description=data.reason, changes={"before": before, "after": serialize_mode(loaded, include_retired_nested=True), "correlation_id": correlation})
        mutation = {"status": "success", "operation": "restore", "changed_count": 1, "unchanged_count": 0, "changed_ids": [mode.id], "versions": {mode.id: mode.version}, "audit_correlation_id": correlation, "idempotent_replay": False}
        await save_executed_receipt(db, request, operation="far.mode.restore", idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result=mutation, correlation_id=correlation)
        await db.commit()
        return mutation
    except Exception:
        await db.rollback()
        raise


async def mode_history(db: AsyncSession, mode_id: int) -> list[models.FarEntityHistory]:
    result = await db.execute(select(models.FarEntityHistory).where(
        models.FarEntityHistory.entity_type == "failure_mode",
        models.FarEntityHistory.entity_id == mode_id,
    ).order_by(models.FarEntityHistory.version.desc()))
    return list(result.scalars().all())


async def restore_history(db: AsyncSession, request: Request, mode_id: int, data: schemas.FarHistoryRestoreRequest) -> dict[str, Any]:
    require_role(request, {"ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.mode.history_restore" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        replay = dict(prior.result_json or {})
        replay["idempotent_replay"] = True
        return replay
    mode = await get_mode(db, mode_id, include_retired=True)
    if mode.version != data.expected_version:
        raise HTTPException(status_code=409, detail={"code": "FAR_VERSION_CONFLICT", "expected": data.expected_version, "actual": mode.version})
    history_result = await db.execute(select(models.FarEntityHistory).where(
        models.FarEntityHistory.entity_type == "failure_mode",
        models.FarEntityHistory.entity_id == mode_id,
        models.FarEntityHistory.version == data.history_version,
    ))
    history = history_result.scalar_one_or_none()
    if history is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_HISTORY_VERSION_NOT_FOUND"})
    snapshot = history.snapshot or {}
    relationships = history.relationship_snapshot or {}
    before = serialize_mode(mode, include_retired_nested=True)
    for key in ("system_name", "failure_type", "title", "effect", "severity", "occurrence", "detection", "status", "owner_user_id", "owner_team", "due_at", "metadata_json"):
        if key in snapshot:
            value = snapshot[key]
            if key == "due_at" and value:
                value = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            setattr(mode, key, value)
    mode.rpn = calculate_rpn(mode.severity, mode.occurrence, mode.detection)
    # History restoration never implicitly changes retirement state.
    mode.affected_assets = await exact_entities(db, models.Device, relationships.get("affected_asset_ids", []), active_field="is_deleted", label="affected_asset_ids")
    mode.causes = await exact_entities(db, models.FarFailureCause, relationships.get("cause_ids", []), label="cause_ids")
    mode.mitigations = await exact_entities(db, models.FarMitigation, relationships.get("mitigation_ids", []), label="mitigation_ids")
    restored_prevention = await exact_entities(db, models.FarPrevention, relationships.get("prevention_ids", []), label="prevention_ids")
    invalid_prevention = [item.id for item in restored_prevention if item.failure_mode_id != mode.id]
    if invalid_prevention:
        raise HTTPException(status_code=422, detail={"code": "FAR_HISTORY_RELATIONSHIP_OWNERSHIP_MISMATCH", "prevention_ids": invalid_prevention})
    mode.prevention_actions = restored_prevention
    mode.linked_rcas = await exact_entities(db, models.RcaRecord, relationships.get("linked_rca_ids", []), label="linked_rca_ids")
    mode.version += 1
    correlation = str(uuid4())
    try:
        await db.flush()
        loaded = await get_mode(db, mode.id, include_retired=True)
        await write_mode_history(db, loaded, request, f"Restored history v{data.history_version}: {data.reason}")
        await write_audit(db, request, action="far.mode.history_restore", target_table="far_failure_modes", target_id=mode.id, description=data.reason, changes={"before": before, "after": serialize_mode(loaded, include_retired_nested=True), "source_history_version": data.history_version, "correlation_id": correlation})
        mutation = {"status": "success", "operation": "history_restore", "changed_count": 1, "unchanged_count": 0, "changed_ids": [mode.id], "versions": {mode.id: mode.version}, "audit_correlation_id": correlation, "idempotent_replay": False}
        await save_executed_receipt(db, request, operation="far.mode.history_restore", idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result=mutation, correlation_id=correlation)
        await db.commit()
        return mutation
    except Exception:
        await db.rollback()
        raise


async def create_cause(db: AsyncSession, request: Request, data: schemas.FarCauseCreate) -> dict[str, Any]:
    require_role(request, {"EDITOR", "ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.cause.create" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        return dict((prior.result_json or {}).get("record") or {})
    modes = await exact_entities(db, models.FarFailureMode, data.mode_ids, active_field="is_retired", label="mode_ids")
    cause = models.FarFailureCause(
        cause_text=data.cause_text.strip(),
        occurrence_level=data.occurrence_level,
        responsible_team=data.responsible_team,
        version=1,
        is_retired=False,
        failure_modes=modes,
        resolutions=[],
        mitigations=[],
        prevention_actions=[],
        created_by_user_id=actor_identity(request),
    )
    db.add(cause)
    correlation = str(uuid4())
    try:
        await db.flush()
        for mode in modes:
            mode.version += 1
        await db.flush()
        record = serialize_cause(cause)
        await write_entity_history(db, request, entity_type="cause", entity_id=cause.id, version=cause.version, snapshot=record, relationships={"mode_ids": data.mode_ids}, summary="Created reusable FAR cause")
        for mode in modes:
            loaded_mode = await get_mode(db, mode.id, include_retired=True)
            await write_mode_history(db, loaded_mode, request, f"Cause {cause.id} linked")
        await write_audit(db, request, action="far.cause.create", target_table="far_failure_causes", target_id=cause.id, description="Created reusable FAR cause", changes={"after": record, "mode_ids": data.mode_ids, "correlation_id": correlation})
        await save_executed_receipt(db, request, operation="far.cause.create", idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result={"record": record, "versions": {str(cause.id): cause.version}}, correlation_id=correlation)
        await db.commit()
        return record
    except Exception:
        await db.rollback()
        raise


async def update_cause(
    db: AsyncSession,
    request: Request,
    cause_id: int,
    data: schemas.FarCauseUpdate,
) -> dict[str, Any]:
    require_role(request, {"EDITOR", "ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.cause.update" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        return dict((prior.result_json or {}).get("record") or {})

    cause = await get_cause(db, cause_id, include_retired=True)
    if cause.version != data.expected_version:
        raise HTTPException(status_code=409, detail={"code": "FAR_VERSION_CONFLICT", "expected": data.expected_version, "actual": cause.version})
    if cause.is_retired:
        raise HTTPException(status_code=409, detail={"code": "FAR_CAUSE_RETIRED"})

    before = serialize_cause(cause, include_retired_nested=True)
    prior_modes = {mode.id: mode for mode in cause.failure_modes}
    if data.mode_ids is not None:
        replacement_modes = await exact_entities(db, models.FarFailureMode, data.mode_ids, active_field="is_retired", label="mode_ids")
        cause.failure_modes = replacement_modes
    if data.cause_text is not None:
        cause.cause_text = data.cause_text.strip()
    if data.occurrence_level is not None:
        cause.occurrence_level = data.occurrence_level
    if data.responsible_team is not None:
        cause.responsible_team = data.responsible_team
    cause.version += 1

    current_modes = {mode.id: mode for mode in cause.failure_modes}
    affected_modes = {**prior_modes, **current_modes}
    for mode in affected_modes.values():
        mode.version += 1

    correlation = str(uuid4())
    try:
        await db.flush()
        after = serialize_cause(cause, include_retired_nested=True)
        relationships = {
            "mode_ids": sorted(current_modes),
            "resolution_ids": sorted(item.id for item in cause.resolutions),
            "mitigation_ids": sorted(item.id for item in cause.mitigations),
            "prevention_ids": sorted(item.id for item in cause.prevention_actions),
        }
        await write_entity_history(
            db,
            request,
            entity_type="cause",
            entity_id=cause.id,
            version=cause.version,
            snapshot=after,
            relationships=relationships,
            summary=data.change_summary,
        )
        for mode in affected_modes.values():
            loaded_mode = await get_mode(db, mode.id, include_retired=True)
            await write_mode_history(db, loaded_mode, request, f"Cause {cause.id} updated: {data.change_summary}")
        await write_audit(
            db,
            request,
            action="far.cause.update",
            target_table="far_failure_causes",
            target_id=cause.id,
            description=data.change_summary,
            changes={"before": before, "after": after, "mode_ids": sorted(current_modes), "correlation_id": correlation},
        )
        await save_executed_receipt(
            db,
            request,
            operation="far.cause.update",
            idempotency_key=data.idempotency_key,
            payload=data.model_dump(mode="json"),
            result={"record": after, "versions": {str(cause.id): cause.version, **{str(mode.id): mode.version for mode in affected_modes.values()}}},
            correlation_id=correlation,
        )
        await db.commit()
        return after
    except Exception:
        await db.rollback()
        raise


async def create_mitigation(db: AsyncSession, request: Request, data: schemas.FarMitigationCreate) -> dict[str, Any]:
    require_role(request, {"EDITOR", "ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.mitigation.create" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        return dict((prior.result_json or {}).get("record") or {})
    modes = await exact_entities(db, models.FarFailureMode, data.mode_ids, active_field="is_retired", label="mode_ids")
    if data.cause_id is not None:
        causes = await exact_entities(db, models.FarFailureCause, [data.cause_id], active_field="is_retired", label="cause_id")
        cause = causes[0]
        await db.refresh(cause, attribute_names=["failure_modes"])
        linked_mode_ids = {item.id for item in cause.failure_modes}
        if data.mode_ids and not set(data.mode_ids).issubset(linked_mode_ids):
            raise HTTPException(status_code=422, detail={"code": "FAR_CAUSE_MODE_LINK_INCONSISTENT"})
    if data.monitoring_item_id is not None:
        await exact_entities(db, models.MonitoringItem, [data.monitoring_item_id], active_field="is_deleted", label="monitoring_item_id")
    item = models.FarMitigation(mitigation_type=data.mitigation_type.strip(), mitigation_steps=data.mitigation_steps, responsible_team=data.responsible_team, status=data.status, cause_id=data.cause_id, monitoring_item_id=data.monitoring_item_id, version=1, is_retired=False, created_by_user_id=actor_identity(request))
    db.add(item)
    correlation = str(uuid4())
    try:
        await db.flush()
        for mode in modes:
            await db.refresh(mode, attribute_names=["mitigations"])
            mode.mitigations.append(item)
            mode.version += 1
        await db.flush()
        record = serialize_mitigation(item)
        await write_entity_history(db, request, entity_type="mitigation", entity_id=item.id, version=item.version, snapshot=record, relationships={"mode_ids": data.mode_ids, "cause_id": data.cause_id, "monitoring_item_id": data.monitoring_item_id}, summary="Created FAR mitigation")
        for mode in modes:
            loaded_mode = await get_mode(db, mode.id, include_retired=True)
            await write_mode_history(db, loaded_mode, request, f"Mitigation {item.id} linked")
        await write_audit(db, request, action="far.mitigation.create", target_table="far_mitigations", target_id=item.id, description="Created FAR mitigation", changes={"after": record, "mode_ids": data.mode_ids, "correlation_id": correlation})
        await save_executed_receipt(db, request, operation="far.mitigation.create", idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result={"record": record, "versions": {str(item.id): item.version}}, correlation_id=correlation)
        await db.commit()
        return record
    except Exception:
        await db.rollback()
        raise


async def create_prevention(db: AsyncSession, request: Request, data: schemas.FarPreventionCreate) -> dict[str, Any]:
    require_role(request, {"EDITOR", "ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.prevention.create" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        return dict((prior.result_json or {}).get("record") or {})
    mode = await get_mode(db, data.failure_mode_id)
    if data.cause_id is not None:
        causes = await exact_entities(db, models.FarFailureCause, [data.cause_id], active_field="is_retired", label="cause_id")
        if causes[0] not in mode.causes:
            raise HTTPException(status_code=422, detail={"code": "FAR_CAUSE_MODE_LINK_INCONSISTENT"})
    item = models.FarPrevention(failure_mode_id=mode.id, cause_id=data.cause_id, prevention_action=data.prevention_action.strip(), status=data.status, target_date=data.target_date, responsible_team=data.responsible_team, version=1, is_retired=False, created_by_user_id=actor_identity(request))
    db.add(item)
    correlation = str(uuid4())
    try:
        await db.flush()
        mode.version += 1
        await db.flush()
        record = serialize_prevention(item)
        await write_entity_history(db, request, entity_type="prevention", entity_id=item.id, version=item.version, snapshot=record, relationships={"mode_id": mode.id, "cause_id": data.cause_id}, summary="Created FAR prevention action")
        loaded_mode = await get_mode(db, mode.id, include_retired=True)
        await write_mode_history(db, loaded_mode, request, f"Prevention action {item.id} linked")
        await write_audit(db, request, action="far.prevention.create", target_table="far_prevention", target_id=item.id, description="Created FAR prevention action", changes={"after": record, "mode_id": mode.id, "correlation_id": correlation})
        await save_executed_receipt(db, request, operation="far.prevention.create", idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result={"record": record, "versions": {str(item.id): item.version}}, correlation_id=correlation)
        await db.commit()
        return record
    except Exception:
        await db.rollback()
        raise


async def create_prevention_project(
    db: AsyncSession,
    request: Request,
    data: schemas.FarPreventionProjectCreate,
) -> dict[str, Any]:
    """Create the original prevention project and its FAR evidence in one tenant transaction."""
    require_role(request, {"EDITOR", "ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.prevention_project.create" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        return dict(prior.result_json or {})

    mode = await get_mode(db, data.failure_mode_id)
    cause = None
    if data.cause_id is not None:
        causes = await exact_entities(db, models.FarFailureCause, [data.cause_id], active_field="is_retired", label="cause_id")
        cause = causes[0]
        await db.refresh(cause, attribute_names=["failure_modes", "resolutions", "mitigations", "prevention_actions"])
        if cause not in mode.causes:
            raise HTTPException(status_code=422, detail={"code": "FAR_CAUSE_MODE_LINK_INCONSISTENT"})

    project_payload = data.project.model_dump()
    tasks_payload = project_payload.pop("tasks", []) or []
    project_metadata = dict(project_payload.get("metadata_json") or {})
    project_metadata.update({
        "linked_failure_mode_id": mode.id,
        "linked_cause_id": data.cause_id,
        "far_schema_version": FAR_SCHEMA_VERSION,
    })
    project_payload["metadata_json"] = project_metadata
    project = models.Project(**project_payload, created_by_user_id=actor_identity(request))
    db.add(project)
    correlation = str(uuid4())
    try:
        await db.flush()
        for task_payload in tasks_payload:
            task_data = task_payload.model_dump() if hasattr(task_payload, "model_dump") else dict(task_payload)
            task_data.pop("id", None)
            task_data.pop("project_id", None)
            db.add(models.ProjectTask(**task_data, project_id=project.id, created_by_user_id=actor_identity(request)))

        prevention = models.FarPrevention(
            failure_mode_id=mode.id,
            cause_id=data.cause_id,
            project_id=project.id,
            prevention_action=data.prevention_action.strip(),
            status="Open",
            target_date=data.target_date or project.end_date,
            responsible_team=data.responsible_team or project.owner,
            version=1,
            is_retired=False,
            created_by_user_id=actor_identity(request),
        )
        db.add(prevention)
        mode.version += 1
        if cause is not None:
            cause.version += 1
        await db.flush()

        record = serialize_prevention(prevention)
        await write_entity_history(
            db,
            request,
            entity_type="prevention",
            entity_id=prevention.id,
            version=prevention.version,
            snapshot=record,
            relationships={"mode_id": mode.id, "cause_id": data.cause_id, "project_id": project.id},
            summary="Created prevention project and FAR prevention evidence",
        )
        if cause is not None:
            await write_entity_history(
                db,
                request,
                entity_type="cause",
                entity_id=cause.id,
                version=cause.version,
                snapshot=serialize_cause(cause, include_retired_nested=True),
                relationships={
                    "mode_ids": sorted(item.id for item in cause.failure_modes),
                    "resolution_ids": sorted(item.id for item in cause.resolutions),
                    "mitigation_ids": sorted(item.id for item in cause.mitigations),
                    "prevention_ids": sorted(item.id for item in cause.prevention_actions),
                },
                summary=f"Prevention project {project.id} linked",
            )
        loaded_mode = await get_mode(db, mode.id, include_retired=True)
        await write_mode_history(db, loaded_mode, request, f"Prevention project {project.id} linked")
        await write_audit(
            db,
            request,
            action="far.prevention_project.create",
            target_table="far_prevention",
            target_id=prevention.id,
            description="Created prevention project and FAR prevention evidence",
            changes={"project_id": project.id, "prevention": record, "mode_id": mode.id, "cause_id": data.cause_id, "correlation_id": correlation},
        )
        result = {
            "status": "success",
            "project_id": project.id,
            "prevention": record,
            "versions": {str(mode.id): mode.version, str(prevention.id): prevention.version, **({str(cause.id): cause.version} if cause else {})},
            "audit_correlation_id": correlation,
            "idempotent_replay": False,
        }
        await save_executed_receipt(
            db,
            request,
            operation="far.prevention_project.create",
            idempotency_key=data.idempotency_key,
            payload=data.model_dump(mode="json"),
            result=result,
            correlation_id=correlation,
        )
        await db.commit()
        return result
    except Exception:
        await db.rollback()
        raise


async def create_resolution(db: AsyncSession, request: Request, data: schemas.FarResolutionCreate) -> dict[str, Any]:
    require_role(request, {"EDITOR", "ADMIN"})
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.resolution.create" or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        return dict((prior.result_json or {}).get("record") or {})
    causes = await exact_entities(db, models.FarFailureCause, data.cause_ids, active_field="is_retired", label="cause_ids")
    knowledge = None
    if data.knowledge_id is not None:
        knowledge = (await exact_entities(db, models.KnowledgeEntry, [data.knowledge_id], active_field="is_deleted", label="knowledge_id"))[0]
    item = models.FarResolution(knowledge_id=data.knowledge_id, preventive_follow_up=data.preventive_follow_up, responsible_team=data.responsible_team, guidance_notes=data.guidance_notes, version=1, is_retired=False, created_by_user_id=actor_identity(request))
    if knowledge is not None:
        item.knowledge_bkm = knowledge
    db.add(item)
    correlation = str(uuid4())
    try:
        await db.flush()
        affected_modes: dict[int, models.FarFailureMode] = {}
        for cause in causes:
            await db.refresh(cause, attribute_names=["resolutions", "failure_modes"])
            cause.resolutions.append(item)
            cause.version += 1
            for mode in cause.failure_modes:
                affected_modes[mode.id] = mode
        for mode in affected_modes.values():
            mode.version += 1
        await db.flush()
        record = serialize_resolution(item)
        await write_entity_history(db, request, entity_type="resolution", entity_id=item.id, version=item.version, snapshot=record, relationships={"cause_ids": data.cause_ids, "knowledge_id": data.knowledge_id}, summary="Created shared FAR resolution")
        for cause in causes:
            await write_entity_history(db, request, entity_type="cause", entity_id=cause.id, version=cause.version, snapshot=serialize_cause(cause), relationships={"mode_ids": [mode.id for mode in cause.failure_modes], "resolution_ids": [resolution.id for resolution in cause.resolutions]}, summary=f"Resolution {item.id} linked")
        for mode in affected_modes.values():
            loaded_mode = await get_mode(db, mode.id, include_retired=True)
            await write_mode_history(db, loaded_mode, request, f"Resolution {item.id} linked")
        await write_audit(db, request, action="far.resolution.create", target_table="far_resolutions", target_id=item.id, description="Created shared FAR resolution", changes={"after": record, "cause_ids": data.cause_ids, "correlation_id": correlation})
        await save_executed_receipt(db, request, operation="far.resolution.create", idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result={"record": record, "versions": {str(item.id): item.version}}, correlation_id=correlation)
        await db.commit()
        return record
    except Exception:
        await db.rollback()
        raise


NESTED_MODEL_MAP: dict[str, Any] = {
    "cause": models.FarFailureCause,
    "mitigation": models.FarMitigation,
    "prevention": models.FarPrevention,
    "resolution": models.FarResolution,
}


def nested_serializer(entity_type: str, item: Any) -> dict[str, Any]:
    if entity_type == "cause":
        return serialize_cause(item, include_retired_nested=True)
    if entity_type == "mitigation":
        return serialize_mitigation(item)
    if entity_type == "prevention":
        return serialize_prevention(item)
    if entity_type == "resolution":
        return serialize_resolution(item)
    raise HTTPException(status_code=422, detail={"code": "FAR_NESTED_TYPE_INVALID", "entity_type": entity_type})


async def get_nested_entity(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    *,
    include_retired: bool = True,
) -> Any:
    if entity_type not in NESTED_MODEL_MAP:
        raise HTTPException(status_code=422, detail={"code": "FAR_NESTED_TYPE_INVALID", "entity_type": entity_type})
    if entity_type == "cause":
        return await get_cause(db, entity_id, include_retired=include_retired)
    if entity_type == "resolution":
        stmt = select(models.FarResolution).options(selectinload(models.FarResolution.knowledge_bkm)).where(models.FarResolution.id == entity_id)
        if not include_retired:
            stmt = stmt.where(models.FarResolution.is_retired == False)
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
    else:
        model = NESTED_MODEL_MAP[entity_type]
        stmt = select(model).where(model.id == entity_id)
        if not include_retired:
            stmt = stmt.where(model.is_retired == False)
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_NESTED_NOT_FOUND", "entity_type": entity_type, "id": entity_id})
    return item


async def nested_relationship_snapshot(db: AsyncSession, entity_type: str, item: Any) -> dict[str, Any]:
    if entity_type == "cause":
        cause = await get_cause(db, item.id, include_retired=True)
        return {
            "mode_ids": sorted(mode.id for mode in cause.failure_modes),
            "resolution_ids": sorted(value.id for value in cause.resolutions),
            "mitigation_ids": sorted(value.id for value in cause.mitigations),
            "prevention_ids": sorted(value.id for value in cause.prevention_actions),
        }
    if entity_type == "resolution":
        result = await db.execute(
            select(models.far_cause_resolutions.c.cause_id).where(
                models.far_cause_resolutions.c.resolution_id == item.id
            )
        )
        return {"cause_ids": sorted(int(row[0]) for row in result.all()), "knowledge_id": item.knowledge_id}
    if entity_type == "mitigation":
        result = await db.execute(
            select(models.far_mode_mitigations.c.mode_id).where(
                models.far_mode_mitigations.c.mitigation_id == item.id
            )
        )
        return {
            "mode_ids": sorted(int(row[0]) for row in result.all()),
            "cause_id": item.cause_id,
            "monitoring_item_id": item.monitoring_item_id,
        }
    return {
        "mode_id": item.failure_mode_id,
        "cause_id": item.cause_id,
        "project_id": item.project_id,
    }


async def nested_entity_history(db: AsyncSession, entity_type: str, entity_id: int) -> list[models.FarEntityHistory]:
    await get_nested_entity(db, entity_type, entity_id, include_retired=True)
    result = await db.execute(
        select(models.FarEntityHistory)
        .where(
            models.FarEntityHistory.entity_type == entity_type,
            models.FarEntityHistory.entity_id == entity_id,
        )
        .order_by(models.FarEntityHistory.version.desc())
    )
    return list(result.scalars().all())


async def _nested_link_is_active(
    db: AsyncSession,
    entity_type: str,
    item: Any,
    mode_id: int,
) -> bool:
    mode = await get_mode(db, mode_id, include_retired=True)
    if entity_type == "cause":
        return any(value.id == item.id for value in mode.causes)
    if entity_type == "resolution":
        return any(
            any(resolution.id == item.id for resolution in cause.resolutions)
            for cause in mode.causes
        )
    raise HTTPException(
        status_code=422,
        detail={"code": "FAR_NESTED_UNLINK_UNSUPPORTED", "entity_type": entity_type},
    )


async def preview_nested_retirement(
    db: AsyncSession,
    request: Request,
    *,
    entity_type: str,
    entity_id: int,
    data: schemas.FarNestedRetireRequest,
) -> dict[str, Any]:
    require_role(request, {"ADMIN"})
    if data.mode_id is not None and entity_type not in {"cause", "resolution"}:
        raise HTTPException(
            status_code=422,
            detail={"code": "FAR_NESTED_MODE_UNLINK_UNSUPPORTED", "entity_type": entity_type},
        )
    operation = "unlink" if data.mode_id is not None else "retire"
    expected_operation = f"far.{entity_type}.{operation}"
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != expected_operation or prior.state not in {"previewed", "executed"}:
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        if prior.state == "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_OPERATION_ALREADY_EXECUTED", "result": prior.result_json})
        raise HTTPException(
            status_code=409,
            detail={"code": "FAR_PREVIEW_TOKEN_ALREADY_ISSUED", "preview_hash": prior.preview_hash},
        )

    item = await get_nested_entity(db, entity_type, entity_id, include_retired=True)
    blockers: list[dict[str, Any]] = []
    if item.version != data.expected_version:
        blockers.append({
            "id": entity_id,
            "code": "FAR_VERSION_CONFLICT",
            "expected": data.expected_version,
            "actual": item.version,
        })
    if operation == "unlink":
        changed = await _nested_link_is_active(db, entity_type, item, int(data.mode_id))
    else:
        changed = not bool(item.is_retired)
    changed_ids = [entity_id] if changed and not blockers else []
    unchanged_ids = [] if changed else [entity_id]
    can_execute = bool(changed_ids) and not blockers
    preview_basis = {
        "operation": expected_operation,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "mode_id": data.mode_id,
        "expected_version": data.expected_version,
        "actual_version": item.version,
        "reason": data.reason,
        "changed_ids": changed_ids,
        "unchanged_ids": unchanged_ids,
        "missing_ids": [],
        "blockers": blockers,
        "can_execute": can_execute,
        "tenant": tenant_identity(request),
        "actor": actor_identity(request),
    }
    preview_digest = canonical_hash(preview_basis)
    raw_token = secrets.token_urlsafe(40)
    expires = utcnow() + timedelta(minutes=10)
    receipt = models.FarOperationReceipt(
        actor_user_id=actor_identity(request),
        tenant_identity=tenant_identity(request),
        operation_type=expected_operation,
        idempotency_key=data.idempotency_key,
        token_hash=token_hash(raw_token),
        payload_hash=canonical_hash(data.model_dump(mode="json")),
        preview_hash=preview_digest,
        target_versions={str(entity_id): item.version},
        expires_at=expires,
        state="previewed",
        result_json=json_value(preview_basis),
        audit_correlation_id=str(uuid4()),
        created_by_user_id=actor_identity(request),
    )
    db.add(receipt)
    await db.commit()
    return {
        "operation": operation,
        "selected_count": 1,
        "matched_count": 1,
        "changed_count": len(changed_ids),
        "unchanged_count": len(unchanged_ids),
        "blocked_count": len(blockers),
        "missing_count": 0,
        "changed_ids": changed_ids,
        "unchanged_ids": unchanged_ids,
        "missing_ids": [],
        "blockers": blockers,
        "can_execute": can_execute,
        "preview_token": raw_token,
        "preview_hash": preview_digest,
        "expires_at": expires,
        "target_versions": {entity_id: item.version},
    }


async def _collect_nested_parents(
    db: AsyncSession,
    entity_type: str,
    item: Any,
) -> tuple[dict[int, models.FarFailureMode], dict[int, models.FarFailureCause]]:
    affected_modes: dict[int, models.FarFailureMode] = {}
    affected_causes: dict[int, models.FarFailureCause] = {}
    if entity_type == "cause":
        cause = await get_cause(db, item.id, include_retired=True)
        for mode in cause.failure_modes:
            affected_modes[mode.id] = mode
    elif entity_type == "resolution":
        result = await db.execute(
            select(models.far_cause_resolutions.c.cause_id).where(
                models.far_cause_resolutions.c.resolution_id == item.id
            )
        )
        for cause_id in sorted(int(row[0]) for row in result.all()):
            cause = await get_cause(db, cause_id, include_retired=True)
            affected_causes[cause.id] = cause
            for mode in cause.failure_modes:
                affected_modes[mode.id] = mode
    elif entity_type == "mitigation":
        result = await db.execute(
            select(models.far_mode_mitigations.c.mode_id).where(
                models.far_mode_mitigations.c.mitigation_id == item.id
            )
        )
        for mode_id in sorted(int(row[0]) for row in result.all()):
            affected_modes[mode_id] = await get_mode(db, mode_id, include_retired=True)
        if item.cause_id is not None:
            cause = await get_cause(db, item.cause_id, include_retired=True)
            affected_causes[cause.id] = cause
    else:
        affected_modes[item.failure_mode_id] = await get_mode(db, item.failure_mode_id, include_retired=True)
        if item.cause_id is not None:
            cause = await get_cause(db, item.cause_id, include_retired=True)
            affected_causes[cause.id] = cause
    return affected_modes, affected_causes


async def _write_nested_and_parent_history(
    db: AsyncSession,
    request: Request,
    *,
    entity_type: str,
    item: Any,
    affected_modes: dict[int, models.FarFailureMode],
    affected_causes: dict[int, models.FarFailureCause],
    summary: str,
) -> None:
    # Columns with server-side/on-update values are expired by the flush above.
    # Refresh and reload the entity through the authoritative loader before
    # synchronous serialization so history capture never triggers async IO.
    await db.refresh(item)
    loaded_item = await get_nested_entity(db, entity_type, item.id, include_retired=True)
    relationships = await nested_relationship_snapshot(db, entity_type, loaded_item)
    await write_entity_history(
        db,
        request,
        entity_type=entity_type,
        entity_id=loaded_item.id,
        version=loaded_item.version,
        snapshot=nested_serializer(entity_type, loaded_item),
        relationships=relationships,
        summary=summary,
    )
    for cause in affected_causes.values():
        loaded_cause = await get_cause(db, cause.id, include_retired=True)
        await write_entity_history(
            db,
            request,
            entity_type="cause",
            entity_id=loaded_cause.id,
            version=loaded_cause.version,
            snapshot=serialize_cause(loaded_cause, include_retired_nested=True),
            relationships=await nested_relationship_snapshot(db, "cause", loaded_cause),
            summary=summary,
        )
    for mode in affected_modes.values():
        loaded_mode = await get_mode(db, mode.id, include_retired=True)
        await write_mode_history(db, loaded_mode, request, summary)


async def _apply_nested_lifecycle(
    db: AsyncSession,
    request: Request,
    *,
    receipt: models.FarOperationReceipt,
    entity_type: str,
    entity_id: int,
    expected_version: int,
    reason: str,
    mode_id: int | None,
    operation: str,
) -> dict[str, Any]:
    item = await get_nested_entity(db, entity_type, entity_id, include_retired=True)
    if item.version != expected_version:
        raise HTTPException(
            status_code=409,
            detail={"code": "FAR_TARGET_VERSION_CHANGED", "expected": expected_version, "actual": item.version},
        )
    model = NESTED_MODEL_MAP[entity_type]
    affected_modes: dict[int, models.FarFailureMode] = {}
    affected_causes: dict[int, models.FarFailureCause] = {}

    if operation == "unlink":
        if mode_id is None or entity_type not in {"cause", "resolution"}:
            raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_OPERATION_INVALID"})
        mode = await get_mode(db, mode_id, include_retired=True)
        if entity_type == "cause":
            cause = await get_cause(db, entity_id, include_retired=True)
            if not any(value.id == entity_id for value in mode.causes):
                raise HTTPException(status_code=409, detail={"code": "FAR_TARGET_RELATIONSHIP_CHANGED"})
            mode.causes.remove(cause)
            cause.version += 1
            item = cause
        else:
            resolution = item
            linked_causes: list[models.FarFailureCause] = []
            for cause in mode.causes:
                loaded_cause = await get_cause(db, cause.id, include_retired=True)
                if any(value.id == entity_id for value in loaded_cause.resolutions):
                    linked_causes.append(loaded_cause)
            if not linked_causes:
                raise HTTPException(status_code=409, detail={"code": "FAR_TARGET_RELATIONSHIP_CHANGED"})
            for cause in linked_causes:
                cause.resolutions.remove(resolution)
                cause.version += 1
                affected_causes[cause.id] = cause
            resolution.version += 1
            item = resolution
        mode.version += 1
        affected_modes[mode.id] = mode
    elif operation == "retire":
        if item.is_retired:
            raise HTTPException(status_code=409, detail={"code": "FAR_TARGET_LIFECYCLE_CHANGED"})
        affected_modes, affected_causes = await _collect_nested_parents(db, entity_type, item)
        for mode in affected_modes.values():
            mode.version += 1
        for cause in affected_causes.values():
            cause.version += 1
        item.is_retired = True
        item.retired_at = utcnow()
        item.retired_by_user_id = actor_identity(request)
        item.retired_reason = reason
        item.version += 1
    else:
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_OPERATION_INVALID"})

    try:
        await db.flush()
        summary = f"{operation.title()}: {reason}"
        await _write_nested_and_parent_history(
            db,
            request,
            entity_type=entity_type,
            item=item,
            affected_modes=affected_modes,
            affected_causes=affected_causes,
            summary=summary,
        )
        await write_audit(
            db,
            request,
            action=f"far.{entity_type}.{operation}",
            target_table=model.__tablename__,
            target_id=item.id,
            description=reason,
            changes={
                "mode_id": mode_id,
                "version": item.version,
                "affected_mode_ids": sorted(affected_modes),
                "affected_cause_ids": sorted(affected_causes),
                "correlation_id": receipt.audit_correlation_id,
            },
        )
        mutation = {
            "status": "success",
            "operation": operation,
            "changed_count": 1,
            "unchanged_count": 0,
            "changed_ids": [item.id],
            "versions": {item.id: item.version},
            "audit_correlation_id": receipt.audit_correlation_id,
            "idempotent_replay": False,
        }
        receipt.state = "executed"
        receipt.executed_at = utcnow()
        receipt.result_json = json_value(mutation)
        await db.commit()
        return mutation
    except Exception:
        await db.rollback()
        raise


async def execute_nested_retirement(
    db: AsyncSession,
    request: Request,
    data: schemas.FarOperationExecuteRequest,
) -> dict[str, Any]:
    require_role(request, {"ADMIN"})
    result = await db.execute(
        select(models.FarOperationReceipt).where(
            models.FarOperationReceipt.token_hash == token_hash(data.preview_token),
            models.FarOperationReceipt.actor_user_id == actor_identity(request),
            models.FarOperationReceipt.tenant_identity == tenant_identity(request),
        )
    )
    receipt = result.scalar_one_or_none()
    allowed = {
        f"far.{entity_type}.{operation}"
        for entity_type in NESTED_MODEL_MAP
        for operation in ("retire", "unlink")
    }
    if receipt is None or receipt.operation_type not in allowed:
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_TOKEN_INVALID"})
    if receipt.idempotency_key != data.idempotency_key:
        raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_MISMATCH"})
    if receipt.preview_hash != data.preview_hash:
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_HASH_MISMATCH"})
    if receipt.state == "executed":
        replay = dict(receipt.result_json or {})
        replay["idempotent_replay"] = True
        return replay
    expires_at = receipt.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if receipt.state != "previewed" or expires_at <= utcnow():
        receipt.state = "expired"
        await db.commit()
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_EXPIRED"})
    preview = dict(receipt.result_json or {})
    if not preview.get("can_execute"):
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_BLOCKED", "preview": preview})
    entity_type = str(preview.get("entity_type") or "")
    entity_id = int(preview.get("entity_id"))
    expected_version = int(preview.get("actual_version"))
    mode_id = int(preview["mode_id"]) if preview.get("mode_id") is not None else None
    operation = receipt.operation_type.rsplit(".", 1)[-1]
    return await _apply_nested_lifecycle(
        db,
        request,
        receipt=receipt,
        entity_type=entity_type,
        entity_id=entity_id,
        expected_version=expected_version,
        reason=str(preview.get("reason") or "Confirmed FAR lifecycle change"),
        mode_id=mode_id,
        operation=operation,
    )


async def restore_nested_entity(
    db: AsyncSession,
    request: Request,
    *,
    entity_type: str,
    entity_id: int,
    data: schemas.FarRestoreRequest,
) -> dict[str, Any]:
    require_role(request, {"ADMIN"})
    operation = f"far.{entity_type}.restore"
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != operation or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        replay = dict(prior.result_json or {})
        replay["idempotent_replay"] = True
        return replay
    item = await get_nested_entity(db, entity_type, entity_id, include_retired=True)
    if item.version != data.expected_version:
        raise HTTPException(status_code=409, detail={"code": "FAR_VERSION_CONFLICT", "expected": data.expected_version, "actual": item.version})
    correlation = str(uuid4())
    if not item.is_retired:
        mutation = {
            "status": "unchanged",
            "operation": "restore",
            "changed_count": 0,
            "unchanged_count": 1,
            "changed_ids": [],
            "versions": {item.id: item.version},
            "audit_correlation_id": correlation,
            "idempotent_replay": False,
        }
        await save_executed_receipt(db, request, operation=operation, idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result=mutation, correlation_id=correlation)
        await db.commit()
        return mutation
    affected_modes, affected_causes = await _collect_nested_parents(db, entity_type, item)
    for mode in affected_modes.values():
        mode.version += 1
    for cause in affected_causes.values():
        cause.version += 1
    item.is_retired = False
    item.retired_at = None
    item.retired_by_user_id = None
    item.retired_reason = None
    item.version += 1
    try:
        await db.flush()
        await _write_nested_and_parent_history(
            db,
            request,
            entity_type=entity_type,
            item=item,
            affected_modes=affected_modes,
            affected_causes=affected_causes,
            summary=f"Restored: {data.reason}",
        )
        await write_audit(
            db,
            request,
            action=operation,
            target_table=NESTED_MODEL_MAP[entity_type].__tablename__,
            target_id=item.id,
            description=data.reason,
            changes={"version": item.version, "correlation_id": correlation},
        )
        mutation = {
            "status": "success",
            "operation": "restore",
            "changed_count": 1,
            "unchanged_count": 0,
            "changed_ids": [item.id],
            "versions": {item.id: item.version},
            "audit_correlation_id": correlation,
            "idempotent_replay": False,
        }
        await save_executed_receipt(db, request, operation=operation, idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result=mutation, correlation_id=correlation)
        await db.commit()
        return mutation
    except Exception:
        await db.rollback()
        raise


def _history_datetime(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=timezone.utc)


async def restore_nested_history(
    db: AsyncSession,
    request: Request,
    *,
    entity_type: str,
    entity_id: int,
    data: schemas.FarHistoryRestoreRequest,
) -> dict[str, Any]:
    require_role(request, {"ADMIN"})
    operation = f"far.{entity_type}.history_restore"
    prior = await existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != operation or prior.state != "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        replay = dict(prior.result_json or {})
        replay["idempotent_replay"] = True
        return replay
    item = await get_nested_entity(db, entity_type, entity_id, include_retired=True)
    if item.version != data.expected_version:
        raise HTTPException(status_code=409, detail={"code": "FAR_VERSION_CONFLICT", "expected": data.expected_version, "actual": item.version})
    history_result = await db.execute(
        select(models.FarEntityHistory).where(
            models.FarEntityHistory.entity_type == entity_type,
            models.FarEntityHistory.entity_id == entity_id,
            models.FarEntityHistory.version == data.history_version,
        )
    )
    history = history_result.scalar_one_or_none()
    if history is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_HISTORY_VERSION_NOT_FOUND", "history_version": data.history_version})

    snapshot = dict(history.snapshot or {})
    relationships = dict(history.relationship_snapshot or {})
    retirement_state = (item.is_retired, item.retired_at, item.retired_by_user_id, item.retired_reason)
    prior_parents = await _collect_nested_parents(db, entity_type, item)
    old_mode_ids = set(prior_parents[0])
    old_cause_ids = set(prior_parents[1])
    new_mode_ids: set[int] = set()
    new_cause_ids: set[int] = set()

    if entity_type == "cause":
        item.cause_text = str(snapshot.get("cause_text") or item.cause_text)
        item.occurrence_level = int(snapshot.get("occurrence_level") or item.occurrence_level)
        item.responsible_team = snapshot.get("responsible_team")
        new_mode_ids = {int(value) for value in relationships.get("mode_ids", [])}
        resolution_ids = [int(value) for value in relationships.get("resolution_ids", [])]
        await exact_entities(db, models.FarFailureMode, sorted(new_mode_ids), label="mode_ids")
        await exact_entities(db, models.FarResolution, resolution_ids, label="resolution_ids")
        await db.execute(delete(models.far_mode_causes).where(models.far_mode_causes.c.cause_id == entity_id))
        if new_mode_ids:
            await db.execute(insert(models.far_mode_causes), [{"mode_id": value, "cause_id": entity_id} for value in sorted(new_mode_ids)])
        await db.execute(delete(models.far_cause_resolutions).where(models.far_cause_resolutions.c.cause_id == entity_id))
        if resolution_ids:
            await db.execute(insert(models.far_cause_resolutions), [{"cause_id": entity_id, "resolution_id": value} for value in resolution_ids])
    elif entity_type == "resolution":
        item.knowledge_id = snapshot.get("knowledge_id")
        if item.knowledge_id is not None:
            await exact_entities(db, models.KnowledgeEntry, [int(item.knowledge_id)], active_field="is_deleted", label="knowledge_id")
        item.preventive_follow_up = snapshot.get("preventive_follow_up")
        item.responsible_team = snapshot.get("responsible_team")
        item.guidance_notes = snapshot.get("guidance_notes")
        new_cause_ids = {int(value) for value in relationships.get("cause_ids", [])}
        await exact_entities(db, models.FarFailureCause, sorted(new_cause_ids), label="cause_ids")
        await db.execute(delete(models.far_cause_resolutions).where(models.far_cause_resolutions.c.resolution_id == entity_id))
        if new_cause_ids:
            await db.execute(insert(models.far_cause_resolutions), [{"cause_id": value, "resolution_id": entity_id} for value in sorted(new_cause_ids)])
    elif entity_type == "mitigation":
        item.mitigation_type = str(snapshot.get("mitigation_type") or item.mitigation_type)
        item.mitigation_steps = snapshot.get("mitigation_steps")
        item.responsible_team = snapshot.get("responsible_team")
        item.status = str(snapshot.get("status") or item.status)
        item.cause_id = int(snapshot["cause_id"]) if snapshot.get("cause_id") is not None else None
        item.monitoring_item_id = int(snapshot["monitoring_item_id"]) if snapshot.get("monitoring_item_id") is not None else None
        if item.cause_id is not None:
            await exact_entities(db, models.FarFailureCause, [item.cause_id], label="cause_id")
            new_cause_ids.add(item.cause_id)
        if item.monitoring_item_id is not None:
            await exact_entities(db, models.MonitoringItem, [item.monitoring_item_id], label="monitoring_item_id")
        new_mode_ids = {int(value) for value in relationships.get("mode_ids", [])}
        await exact_entities(db, models.FarFailureMode, sorted(new_mode_ids), label="mode_ids")
        await db.execute(delete(models.far_mode_mitigations).where(models.far_mode_mitigations.c.mitigation_id == entity_id))
        if new_mode_ids:
            await db.execute(insert(models.far_mode_mitigations), [{"mode_id": value, "mitigation_id": entity_id} for value in sorted(new_mode_ids)])
    else:
        item.failure_mode_id = int(snapshot.get("failure_mode_id") or relationships.get("mode_id") or item.failure_mode_id)
        item.cause_id = int(snapshot["cause_id"]) if snapshot.get("cause_id") is not None else None
        item.project_id = int(snapshot["project_id"]) if snapshot.get("project_id") is not None else None
        item.prevention_action = str(snapshot.get("prevention_action") or item.prevention_action)
        item.status = str(snapshot.get("status") or item.status)
        item.target_date = _history_datetime(snapshot.get("target_date"))
        item.responsible_team = snapshot.get("responsible_team")
        await exact_entities(db, models.FarFailureMode, [item.failure_mode_id], label="failure_mode_id")
        new_mode_ids.add(item.failure_mode_id)
        if item.cause_id is not None:
            await exact_entities(db, models.FarFailureCause, [item.cause_id], label="cause_id")
            new_cause_ids.add(item.cause_id)
        if item.project_id is not None:
            await exact_entities(db, models.Project, [item.project_id], active_field="is_deleted", label="project_id")

    item.is_retired, item.retired_at, item.retired_by_user_id, item.retired_reason = retirement_state
    item.version += 1
    await db.flush()
    db.expire_all()

    affected_mode_ids = old_mode_ids | new_mode_ids
    affected_cause_ids = old_cause_ids | new_cause_ids
    affected_modes = {value: await get_mode(db, value, include_retired=True) for value in sorted(affected_mode_ids)}
    affected_causes = {
        value: await get_cause(db, value, include_retired=True)
        for value in sorted(affected_cause_ids)
        if not (entity_type == "cause" and value == entity_id)
    }
    for mode in affected_modes.values():
        mode.version += 1
    for cause in affected_causes.values():
        cause.version += 1
    await db.flush()
    db.expire_all()
    item = await get_nested_entity(db, entity_type, entity_id, include_retired=True)
    affected_modes = {value: await get_mode(db, value, include_retired=True) for value in sorted(affected_mode_ids)}
    affected_causes = {
        value: await get_cause(db, value, include_retired=True)
        for value in sorted(affected_cause_ids)
        if not (entity_type == "cause" and value == entity_id)
    }
    correlation = str(uuid4())
    try:
        await _write_nested_and_parent_history(
            db,
            request,
            entity_type=entity_type,
            item=item,
            affected_modes=affected_modes,
            affected_causes=affected_causes,
            summary=f"Restored history v{data.history_version}: {data.reason}",
        )
        await write_audit(
            db,
            request,
            action=operation,
            target_table=NESTED_MODEL_MAP[entity_type].__tablename__,
            target_id=entity_id,
            description=data.reason,
            changes={
                "source_history_version": data.history_version,
                "retirement_state_preserved": True,
                "version": item.version,
                "affected_mode_ids": sorted(affected_modes),
                "affected_cause_ids": sorted(affected_causes),
                "correlation_id": correlation,
            },
        )
        mutation = {
            "status": "success",
            "operation": "history_restore",
            "changed_count": 1,
            "unchanged_count": 0,
            "changed_ids": [entity_id],
            "versions": {entity_id: item.version},
            "audit_correlation_id": correlation,
            "idempotent_replay": False,
        }
        await save_executed_receipt(db, request, operation=operation, idempotency_key=data.idempotency_key, payload=data.model_dump(mode="json"), result=mutation, correlation_id=correlation)
        await db.commit()
        return mutation
    except Exception:
        await db.rollback()
        raise
