from __future__ import annotations

import csv
import io
import secrets
from datetime import timedelta
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import models
from ..schemas import schemas
from . import far_service

FAR_EXCHANGE_SCHEMA = "sysgrid.far.v1"
LEGACY_PROFILE = "far_records"


def _coerce_id_list(value: Any) -> list[int]:
    if value in (None, ""):
        return []
    if isinstance(value, str):
        value = [item.strip() for item in value.split(",") if item.strip()]
    if not isinstance(value, list):
        raise ValueError("Relationship IDs must be a list or comma-separated string")
    result: list[int] = []
    for item in value:
        candidate = item.get("id") if isinstance(item, dict) else item
        parsed = int(candidate)
        if parsed < 1:
            raise ValueError("Relationship IDs must be positive")
        result.append(parsed)
    return result


def _canonical_adapter(record: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    adapted = dict(record)
    warnings: list[str] = []
    relationship_aliases = {
        "affected_assets": "affected_asset_ids",
        "causes": "cause_ids",
        "linked_rcas": "linked_rca_ids",
    }
    for old, new in relationship_aliases.items():
        if old in adapted and new not in adapted:
            adapted[new] = _coerce_id_list(adapted.pop(old))
            warnings.append(f"Mapped exported relationship {old} to {new}.")
    for key in ("affected_asset_ids", "cause_ids", "linked_rca_ids"):
        if key in adapted:
            adapted[key] = _coerce_id_list(adapted[key])
    for key in ("severity", "occurrence", "detection"):
        if key in adapted and adapted[key] not in (None, ""):
            adapted[key] = int(adapted[key])
    for read_only in (
        "id", "rpn", "risk_band", "maturity_level", "version", "is_retired",
        "retired_at", "retired_reason", "has_incident_history", "created_at",
        "updated_at", "created_by_user_id", "mitigations", "prevention_actions",
    ):
        adapted.pop(read_only, None)
    if "status" in adapted:
        adapted["status"] = far_service.canonical_status(str(adapted["status"]))
    adapted.setdefault("failure_type", "Design")
    adapted.setdefault("effect", None)
    adapted.setdefault("severity", 1)
    adapted.setdefault("occurrence", 1)
    adapted.setdefault("detection", 1)
    adapted.setdefault("status", "Analyzing")
    adapted.setdefault("affected_asset_ids", [])
    adapted.setdefault("cause_ids", [])
    adapted.setdefault("linked_rca_ids", [])
    adapted.setdefault("metadata_json", {})
    adapted.setdefault("idempotency_key", f"far-import-row-{secrets.token_hex(12)}")
    allowed = set(schemas.FarFailureModeCreate.model_fields)
    return {key: value for key, value in adapted.items() if key in allowed}, warnings


def _legacy_adapter(record: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    adapted = dict(record)
    warnings: list[str] = []
    aliases = {
        "affected_assets": "affected_asset_ids",
        "owner": "owner_user_id",
        "team": "owner_team",
    }
    for old, new in aliases.items():
        if old in adapted and new not in adapted:
            adapted[new] = adapted.pop(old)
            warnings.append(f"Mapped legacy field {old} to {new}.")
    canonical, canonical_warnings = _canonical_adapter(adapted)
    return canonical, [*warnings, *canonical_warnings]


async def preview_import(
    db: AsyncSession,
    request: Request,
    data: schemas.FarExchangePreviewRequest,
) -> dict[str, Any]:
    far_service.require_role(request, {"EDITOR", "ADMIN"})
    prior = await far_service.existing_receipt(db, request, data.idempotency_key)
    if prior:
        if prior.operation_type != "far.exchange.import" or prior.state not in {"previewed", "executed"}:
            raise HTTPException(status_code=409, detail={"code": "FAR_IDEMPOTENCY_KEY_REUSED"})
        if prior.state == "executed":
            raise HTTPException(status_code=409, detail={"code": "FAR_IMPORT_ALREADY_EXECUTED", "result": prior.result_json})
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_TOKEN_ALREADY_ISSUED", "preview_hash": prior.preview_hash})

    if data.schema_id not in {FAR_EXCHANGE_SCHEMA, LEGACY_PROFILE}:
        raise HTTPException(status_code=422, detail={"code": "FAR_EXCHANGE_SCHEMA_UNSUPPORTED", "schema_id": data.schema_id})

    normalized: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    for index, raw in enumerate(data.records):
        try:
            adapted, row_warnings = _legacy_adapter(raw) if data.schema_id == LEGACY_PROFILE else _canonical_adapter(raw)
            candidate = schemas.FarFailureModeCreate.model_validate(adapted)
            normalized.append(candidate.model_dump(mode="json"))
            warnings.extend({"row": index + 1, "message": item} for item in row_warnings)
        except Exception as exc:
            errors.append({"row": index + 1, "message": str(exc)})

    duplicate_titles: list[str] = []
    title_keys = [(item["system_name"].strip().lower(), item["title"].strip().lower()) for item in normalized]
    seen: set[tuple[str, str]] = set()
    for key in title_keys:
        if key in seen:
            duplicate_titles.append(f"{key[0]}::{key[1]}")
        seen.add(key)
    if duplicate_titles:
        errors.append({"code": "FAR_IMPORT_DUPLICATE_INPUT", "keys": sorted(set(duplicate_titles))})

    payload = {
        "schema_id": FAR_EXCHANGE_SCHEMA,
        "source_schema_id": data.schema_id,
        "records": normalized,
        "warnings": warnings,
        "errors": errors,
        "tenant": far_service.tenant_identity(request),
        "actor": far_service.actor_identity(request),
    }
    preview_hash = far_service.canonical_hash(payload)
    token = secrets.token_urlsafe(40)
    expires_at = far_service.utcnow() + timedelta(minutes=15)
    receipt = models.FarOperationReceipt(
        actor_user_id=far_service.actor_identity(request),
        tenant_identity=far_service.tenant_identity(request),
        operation_type="far.exchange.import",
        idempotency_key=data.idempotency_key,
        token_hash=far_service.token_hash(token),
        payload_hash=far_service.canonical_hash(data.model_dump(mode="json")),
        preview_hash=preview_hash,
        target_versions={},
        expires_at=expires_at,
        state="previewed",
        result_json=far_service.json_value(payload),
        audit_correlation_id=str(uuid4()),
        created_by_user_id=far_service.actor_identity(request),
    )
    db.add(receipt)
    await db.commit()
    return {
        "schema_id": FAR_EXCHANGE_SCHEMA,
        "source_schema_id": data.schema_id,
        "record_count": len(data.records),
        "valid_count": len(normalized),
        "warning_count": len(warnings),
        "error_count": len(errors),
        "warnings": warnings,
        "errors": errors,
        "can_execute": not errors and bool(normalized),
        "preview_token": token,
        "preview_hash": preview_hash,
        "expires_at": expires_at,
    }


async def execute_import(
    db: AsyncSession,
    request: Request,
    data: schemas.FarExchangeExecuteRequest,
) -> dict[str, Any]:
    far_service.require_role(request, {"EDITOR", "ADMIN"})
    result = await db.execute(select(models.FarOperationReceipt).where(
        models.FarOperationReceipt.token_hash == far_service.token_hash(data.preview_token),
        models.FarOperationReceipt.actor_user_id == far_service.actor_identity(request),
        models.FarOperationReceipt.tenant_identity == far_service.tenant_identity(request),
        models.FarOperationReceipt.operation_type == "far.exchange.import",
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
    expires_at = receipt.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=far_service.timezone.utc)
    if receipt.state != "previewed" or expires_at <= far_service.utcnow():
        receipt.state = "expired"
        await db.commit()
        raise HTTPException(status_code=409, detail={"code": "FAR_PREVIEW_EXPIRED"})
    preview = dict(receipt.result_json or {})
    if preview.get("errors") or not preview.get("records"):
        raise HTTPException(status_code=409, detail={"code": "FAR_IMPORT_PREVIEW_BLOCKED", "preview": preview})

    created: list[int] = []
    try:
        for raw in preview["records"]:
            candidate = schemas.FarFailureModeCreate.model_validate(raw)
            assets = await far_service.exact_entities(db, models.Device, candidate.affected_asset_ids, active_field="is_deleted", label="affected_asset_ids")
            causes = await far_service.exact_entities(db, models.FarFailureCause, candidate.cause_ids, active_field="is_retired", label="cause_ids")
            rcas = await far_service.exact_entities(db, models.RcaRecord, candidate.linked_rca_ids, label="linked_rca_ids")
            mode = models.FarFailureMode(
                system_name=candidate.system_name.strip(),
                failure_type=candidate.failure_type.strip(),
                title=candidate.title.strip(),
                effect=candidate.effect,
                severity=candidate.severity,
                occurrence=candidate.occurrence,
                detection=candidate.detection,
                rpn=far_service.calculate_rpn(candidate.severity, candidate.occurrence, candidate.detection),
                status=far_service.canonical_status(candidate.status),
                owner_user_id=candidate.owner_user_id,
                owner_team=candidate.owner_team,
                due_at=candidate.due_at,
                metadata_json=candidate.metadata_json,
                affected_assets=assets,
                causes=causes,
                linked_rcas=rcas,
                version=1,
                is_deleted=False,
                is_retired=False,
                created_by_user_id=far_service.actor_identity(request),
            )
            db.add(mode)
            await db.flush()
            created.append(mode.id)
            loaded = await far_service.get_mode(db, mode.id, include_retired=True)
            await far_service.write_mode_history(db, loaded, request, "Imported through sysgrid.far.v1")
            await far_service.write_audit(db, request, action="far.mode.import", target_table="far_failure_modes", target_id=mode.id, description="Imported FAR failure mode", changes={"after": far_service.serialize_mode(loaded), "correlation_id": receipt.audit_correlation_id})
        mutation = {
            "status": "success",
            "operation": "import",
            "changed_count": len(created),
            "unchanged_count": 0,
            "changed_ids": created,
            "versions": {item: 1 for item in created},
            "audit_correlation_id": receipt.audit_correlation_id,
            "idempotent_replay": False,
        }
        receipt.state = "executed"
        receipt.executed_at = far_service.utcnow()
        receipt.result_json = far_service.json_value(mutation)
        await db.commit()
        return mutation
    except Exception:
        await db.rollback()
        raise


async def structured_export(db: AsyncSession, *, include_retired: bool = False) -> dict[str, Any]:
    modes = await far_service.list_modes(db, include_retired=include_retired)

    causes_result = await db.execute(far_service.cause_query().order_by(models.FarFailureCause.id.asc()))
    causes = list(causes_result.unique().scalars().all())
    resolutions_result = await db.execute(
        select(models.FarResolution)
        .options(selectinload(models.FarResolution.knowledge_bkm))
        .order_by(models.FarResolution.id.asc())
    )
    resolutions = list(resolutions_result.scalars().all())
    mitigations_result = await db.execute(select(models.FarMitigation).order_by(models.FarMitigation.id.asc()))
    mitigations = list(mitigations_result.scalars().all())
    prevention_result = await db.execute(select(models.FarPrevention).order_by(models.FarPrevention.id.asc()))
    prevention = list(prevention_result.scalars().all())

    if not include_retired:
        causes = [item for item in causes if not item.is_retired]
        resolutions = [item for item in resolutions if not item.is_retired]
        mitigations = [item for item in mitigations if not item.is_retired]
        prevention = [item for item in prevention if not item.is_retired]

    cause_records = []
    for item in causes:
        cause_records.append({
            "record": far_service.json_value(far_service.serialize_cause(item, include_retired_nested=include_retired)),
            "relationships": far_service.json_value(await far_service.nested_relationship_snapshot(db, "cause", item)),
        })
    resolution_records = []
    for item in resolutions:
        resolution_records.append({
            "record": far_service.json_value(far_service.serialize_resolution(item)),
            "relationships": far_service.json_value(await far_service.nested_relationship_snapshot(db, "resolution", item)),
        })
    mitigation_records = []
    for item in mitigations:
        mitigation_records.append({
            "record": far_service.json_value(far_service.serialize_mitigation(item)),
            "relationships": far_service.json_value(await far_service.nested_relationship_snapshot(db, "mitigation", item)),
        })
    prevention_records = []
    for item in prevention:
        prevention_records.append({
            "record": far_service.json_value(far_service.serialize_prevention(item)),
            "relationships": far_service.json_value(await far_service.nested_relationship_snapshot(db, "prevention", item)),
        })

    history_result = await db.execute(
        select(models.FarEntityHistory).order_by(
            models.FarEntityHistory.entity_type.asc(),
            models.FarEntityHistory.entity_id.asc(),
            models.FarEntityHistory.version.asc(),
        )
    )
    history = [
        {
            "entity_type": item.entity_type,
            "entity_id": item.entity_id,
            "version": item.version,
            "schema_version": item.schema_version,
            "snapshot": far_service.json_value(item.snapshot),
            "relationship_snapshot": far_service.json_value(item.relationship_snapshot),
            "actor_user_id": item.actor_user_id,
            "snapshot_hash": item.snapshot_hash,
            "change_summary": item.change_summary,
            "created_at": far_service.json_value(item.created_at),
        }
        for item in history_result.scalars().all()
    ]
    payload = {
        "schema_id": FAR_EXCHANGE_SCHEMA,
        "schema_version": 1,
        "exported_at": far_service.utcnow().isoformat(),
        "include_retired": include_retired,
        "entities": {
            "failure_modes": [far_service.json_value(item) for item in modes],
            "causes": cause_records,
            "mitigations": mitigation_records,
            "prevention": prevention_records,
            "resolutions": resolution_records,
        },
        "entity_counts": {
            "failure_modes": len(modes),
            "causes": len(cause_records),
            "mitigations": len(mitigation_records),
            "prevention": len(prevention_records),
            "resolutions": len(resolution_records),
        },
        "history_count": len(history),
        "history": history,
        "recovery_contract": {
            "mode_import_endpoint": "/api/v1/far/exchange/preview",
            "retirement_requires_actor_bound_preview": True,
            "explicit_restore_requires_expected_version": True,
            "history_restore_requires_expected_version": True,
            "nested_entities_restore_through_their_own_history": True,
            "retirement_state_is_not_implicitly_changed_by_history_restore": True,
            "cross_tenant_recovery_requires_relationship_id_reconciliation": True,
        },
    }
    return {**payload, "export_hash": far_service.canonical_hash(payload)}


async def csv_export(db: AsyncSession, *, include_retired: bool = False) -> str:
    records = await far_service.list_modes(db, include_retired=include_retired)
    stream = io.StringIO()
    fields = [
        "id", "system_name", "failure_type", "title", "effect", "severity", "occurrence",
        "detection", "rpn", "risk_band", "status", "owner_user_id", "owner_team", "due_at",
        "version", "is_retired", "affected_asset_ids", "cause_ids", "mitigation_ids",
        "prevention_ids", "linked_rca_ids", "created_at", "updated_at",
    ]
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    for record in records:
        writer.writerow({
            "id": record["id"],
            "system_name": record["system_name"],
            "failure_type": record["failure_type"],
            "title": record["title"],
            "effect": record.get("effect") or "",
            "severity": record["severity"],
            "occurrence": record["occurrence"],
            "detection": record["detection"],
            "rpn": record["rpn"],
            "risk_band": record["risk_band"],
            "status": record["status"],
            "owner_user_id": record.get("owner_user_id") or "",
            "owner_team": record.get("owner_team") or "",
            "due_at": far_service.json_value(record.get("due_at")) or "",
            "version": record["version"],
            "is_retired": record["is_retired"],
            "affected_asset_ids": ",".join(str(item["id"]) for item in record["affected_assets"]),
            "cause_ids": ",".join(str(item["id"]) for item in record["causes"]),
            "mitigation_ids": ",".join(str(item["id"]) for item in record["mitigations"]),
            "prevention_ids": ",".join(str(item["id"]) for item in record["prevention_actions"]),
            "linked_rca_ids": ",".join(str(item["id"]) for item in record["linked_rcas"]),
            "created_at": far_service.json_value(record.get("created_at")) or "",
            "updated_at": far_service.json_value(record.get("updated_at")) or "",
        })
    return stream.getvalue()
