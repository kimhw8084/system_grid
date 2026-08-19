from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, selectinload
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas
from .utils import filter_valid_columns

from sqlalchemy import delete, update
from ..api.utils import filter_valid_columns, normalize_json_object, normalize_json_list

router = APIRouter(prefix="/far", tags=["FAR"])
IMMUTABLE_FAR_FIELDS = {"id", "created_at", "updated_at", "created_by_user_id", "version", "is_deleted"}
FAR_BULK_SCORE_FIELDS = {"severity", "occurrence", "detection"}

def normalize_far_versioned_mutation_request(data: dict):
    if not isinstance(data, dict):
        raise ValueError("FAR mutation request must be an object")

    expected_version = data.get("expected_version")
    if isinstance(expected_version, bool) or not isinstance(expected_version, int) or expected_version <= 0:
        raise ValueError("expected_version must be a positive integer")

    mutation_data = dict(data)
    mutation_data.pop("expected_version", None)
    return expected_version, mutation_data

def get_far_versioned_mutation_precondition(mode, expected_version: int):
    actual_version = int(getattr(mode, "version", 1) or 1)
    if bool(getattr(mode, "is_deleted", False)):
        return {
            "code": "far_mode_archived_read_only",
            "id": int(getattr(mode, "id")),
            "actual_version": actual_version,
        }
    if actual_version != expected_version:
        return {
            "code": "far_mode_version_conflict",
            "id": int(getattr(mode, "id")),
            "expected_version": expected_version,
            "actual_version": actual_version,
        }
    return None

def normalize_far_bulk_score_request(data: dict):
    if not isinstance(data, dict):
        raise ValueError("Bulk score request must be an object")

    raw_ids = data.get("ids")
    if not isinstance(raw_ids, list) or not raw_ids:
        raise ValueError("ids must be a non-empty list")
    if any(isinstance(item, bool) or not isinstance(item, int) or item <= 0 for item in raw_ids):
        raise ValueError("ids must contain positive integers")
    if len(set(raw_ids)) != len(raw_ids):
        raise ValueError("ids must not contain duplicates")
    ids = list(raw_ids)

    field = data.get("field")
    if field not in FAR_BULK_SCORE_FIELDS:
        raise ValueError("field must be severity, occurrence, or detection")

    value = data.get("value")
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 10:
        raise ValueError("value must be an integer from 1 to 10")

    raw_expected = data.get("expected_versions")
    if not isinstance(raw_expected, dict):
        raise ValueError("expected_versions must be an object")

    expected_versions = {}
    normalized_keys = set()
    for raw_key, raw_version in raw_expected.items():
        try:
            key = int(raw_key)
        except (TypeError, ValueError):
            raise ValueError("expected_versions keys must be record ids")
        if isinstance(raw_version, bool) or not isinstance(raw_version, int) or raw_version <= 0:
            raise ValueError("expected_versions values must be positive integers")
        normalized_keys.add(key)
        expected_versions[key] = raw_version

    if normalized_keys != set(ids):
        raise ValueError("expected_versions must exactly match ids")

    return ids, field, value, expected_versions

def collect_far_bulk_score_preconditions(ids, modes, expected_versions):
    by_id = {int(mode.id): mode for mode in modes}
    missing_ids = [mode_id for mode_id in ids if mode_id not in by_id]
    archived_ids = [
        mode_id for mode_id in ids
        if mode_id in by_id and bool(getattr(by_id[mode_id], "is_deleted", False))
    ]
    version_conflicts = [
        {
            "id": mode_id,
            "expected_version": expected_versions[mode_id],
            "actual_version": int(getattr(by_id[mode_id], "version", 1) or 1),
        }
        for mode_id in ids
        if (
            mode_id in by_id
            and int(getattr(by_id[mode_id], "version", 1) or 1) != expected_versions[mode_id]
        )
    ]
    return {
        "missing_ids": missing_ids,
        "archived_ids": archived_ids,
        "version_conflicts": version_conflicts,
    }

def apply_far_bulk_score_value(mode, field: str, value: int):
    if getattr(mode, field) == value:
        return False
    setattr(mode, field, value)
    mode.rpn = int(mode.severity) * int(mode.occurrence) * int(mode.detection)
    mode.version = int(mode.version or 1) + 1
    return True

FAR_HISTORY_FIELD_LABELS = {
    "system_name": "System",
    "failure_type": "Failure type",
    "title": "Failure mode",
    "effect": "Effect",
    "severity": "Severity",
    "occurrence": "Occurrence",
    "detection": "Detection",
    "rpn": "RPN",
    "status": "Maturity status",
    "affected_asset_ids": "Affected assets",
    "cause_ids": "Causes",
    "has_incident_history": "Incident history",
    "is_deleted": "Lifecycle",
}

def build_far_snapshot(mode: models.FarFailureMode) -> dict:
    """Creates a forensic snapshot of a Failure Mode."""
    return {
        "system_name": mode.system_name,
        "failure_type": mode.failure_type,
        "title": mode.title,
        "effect": mode.effect,
        "severity": mode.severity,
        "occurrence": mode.occurrence,
        "detection": mode.detection,
        "rpn": mode.rpn,
        "status": mode.status,
        "affected_asset_ids": [a.id for a in mode.affected_assets],
        "cause_ids": [c.id for c in mode.causes],
        "has_incident_history": bool(mode.has_incident_history),
        "is_deleted": bool(mode.is_deleted),
    }

def build_far_history_delta(previous_snapshot: Optional[dict], current_snapshot: dict) -> list[dict]:
    previous = previous_snapshot or {}
    current = current_snapshot or {}
    keys = list(dict.fromkeys([*FAR_HISTORY_FIELD_LABELS.keys(), *previous.keys(), *current.keys()]))
    delta = []
    for field in keys:
        previous_value = previous.get(field, False) if field == "is_deleted" else previous.get(field)
        current_value = current.get(field, False) if field == "is_deleted" else current.get(field)
        if previous_snapshot is not None and previous_value == current_value:
            continue
        if field == "is_deleted":
            change_type = "archived" if current_value else "restored"
        elif previous_snapshot is None:
            change_type = "created"
        else:
            change_type = "updated"
        delta.append({
            "field": field,
            "label": FAR_HISTORY_FIELD_LABELS.get(field, field.replace("_", " ").title()),
            "before": previous_value,
            "after": current_value,
            "change_type": change_type,
        })
    return delta

async def save_far_history(mode_id: int, version: int, db: AsyncSession, summary: str = None):
    stmt = select(models.FarFailureMode).options(
        joinedload(models.FarFailureMode.affected_assets),
        joinedload(models.FarFailureMode.causes)
    ).filter(models.FarFailureMode.id == mode_id)
    res = await db.execute(stmt)
    mode = res.unique().scalar_one()
    
    # Ensure no duplicate version entries
    await db.execute(
        delete(models.FarHistory)
        .where(models.FarHistory.far_mode_id == mode_id, models.FarHistory.version == version)
    )
    
    history = models.FarHistory(
        far_mode_id=mode_id,
        version=version,
        snapshot=build_far_snapshot(mode),
        change_summary=summary
    )
    db.add(history)

# --- FAILURE MODES ---

@router.get("/modes", response_model=List[schemas.FarFailureModeResponse])
async def get_failure_modes(
    system: Optional[str] = None,
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(models.FarFailureMode).options(
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.mitigations),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.prevention_actions),
        selectinload(models.FarFailureMode.mitigations),
        selectinload(models.FarFailureMode.affected_assets),
        selectinload(models.FarFailureMode.prevention_actions),
        selectinload(models.FarFailureMode.linked_rcas)
    )
    if not include_deleted:
        stmt = stmt.filter(models.FarFailureMode.is_deleted == False)
    
    if system:
        stmt = stmt.filter(models.FarFailureMode.system_name == system)
    
    result = await db.execute(stmt)
    return result.unique().scalars().all()

@router.post("/modes", response_model=schemas.FarFailureModeResponse)
async def create_failure_mode(data: dict, db: AsyncSession = Depends(get_db)):
    # Calculate RPN
    rpn = data.get('severity', 1) * data.get('occurrence', 1) * data.get('detection', 1)
    
    mode = models.FarFailureMode(
        system_name=data.get('system_name'),
        failure_type=data.get('failure_type', 'Design'),
        title=data.get('title'),
        effect=data.get('effect'),
        severity=data.get('severity', 1),
        occurrence=data.get('occurrence', 1),
        detection=data.get('detection', 1),
        rpn=rpn,
        status="Analyzing",
        version=1,
        # Initialize relationship collections eagerly so async assignment does not
        # trigger an implicit lazy load during creation.
        affected_assets=[],
        causes=[]
    )
    db.add(mode)
    await db.flush()

    # Link Assets
    if data.get('affected_assets'):
        stmt = select(models.Device).filter(models.Device.id.in_(data['affected_assets']))
        result = await db.execute(stmt)
        assets = result.scalars().all()
        mode.affected_assets = list(assets)

    # Link Causes
    if data.get('cause_ids'):
        stmt = select(models.FarFailureCause).filter(models.FarFailureCause.id.in_(data['cause_ids']))
        result = await db.execute(stmt)
        causes = result.scalars().all()
        mode.causes = list(causes)

    await db.flush()
    await save_far_history(mode.id, mode.version, db, "Initial creation")
    await db.commit()
    
    # Reload with all relationships to avoid MissingGreenlet during serialization
    stmt = select(models.FarFailureMode).options(
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.mitigations),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.prevention_actions),
        selectinload(models.FarFailureMode.mitigations),
        selectinload(models.FarFailureMode.affected_assets),
        selectinload(models.FarFailureMode.prevention_actions),
        selectinload(models.FarFailureMode.linked_rcas)
    ).filter(models.FarFailureMode.id == mode.id)
    result = await db.execute(stmt)
    return result.unique().scalar_one()

@router.put("/modes/{mode_id}", response_model=schemas.FarFailureModeResponse)
async def update_failure_mode(mode_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        expected_version, mutation_data = normalize_far_versioned_mutation_request(data)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    lock_stmt = (
        select(models.FarFailureMode)
        .filter(models.FarFailureMode.id == mode_id)
        .with_for_update()
    )
    lock_result = await db.execute(lock_stmt)
    mode = lock_result.scalar_one_or_none()
    if not mode:
        raise HTTPException(404)

    blocker = get_far_versioned_mutation_precondition(mode, expected_version)
    if blocker:
        raise HTTPException(409, detail=blocker)

    # Keep the row lock while loading the relationship collections needed for assignment.
    relation_stmt = select(models.FarFailureMode).options(
        joinedload(models.FarFailureMode.affected_assets),
        joinedload(models.FarFailureMode.causes)
    ).filter(models.FarFailureMode.id == mode_id)
    relation_result = await db.execute(relation_stmt)
    mode = relation_result.unique().scalar_one()

    # Track if we need to update RPN.
    rpn_fields = {'severity', 'occurrence', 'detection'}
    needs_rpn = False

    clean_data = filter_valid_columns(models.FarFailureMode, mutation_data, exclude=IMMUTABLE_FAR_FIELDS)

    for k, v in clean_data.items():
        if k == 'affected_assets' and isinstance(v, list):
            asset_stmt = select(models.Device).filter(models.Device.id.in_(v))
            asset_res = await db.execute(asset_stmt)
            mode.affected_assets = list(asset_res.scalars().all())
        elif k == 'cause_ids' and isinstance(v, list):
            cause_stmt = select(models.FarFailureCause).filter(models.FarFailureCause.id.in_(v))
            cause_res = await db.execute(cause_stmt)
            mode.causes = list(cause_res.scalars().all())
        elif hasattr(mode, k):
            setattr(mode, k, v)
            if k in rpn_fields:
                needs_rpn = True

    if needs_rpn:
        mode.rpn = mode.severity * mode.occurrence * mode.detection

    mode.version = int(mode.version or 1) + 1
    await db.flush()
    await save_far_history(mode.id, mode.version, db, mutation_data.get("_change_summary", "Update via API"))
    await db.commit()

    # Reload with full relations.
    stmt = select(models.FarFailureMode).options(
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.mitigations),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.prevention_actions),
        selectinload(models.FarFailureMode.mitigations),
        selectinload(models.FarFailureMode.affected_assets),
        selectinload(models.FarFailureMode.prevention_actions),
        selectinload(models.FarFailureMode.linked_rcas)
    ).filter(models.FarFailureMode.id == mode_id)
    result = await db.execute(stmt)
    return result.unique().scalar_one()

@router.get("/modes/{mode_id}/history")
async def get_far_history(mode_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarHistory).filter(models.FarHistory.far_mode_id == mode_id).order_by(models.FarHistory.version.desc())
    res = await db.execute(stmt)
    entries = list(res.scalars().all())
    history = []
    for index, entry in enumerate(entries):
        previous_entry = entries[index + 1] if index + 1 < len(entries) else None
        delta = build_far_history_delta(previous_entry.snapshot if previous_entry else None, entry.snapshot or {})
        history.append({
            "id": entry.id,
            "far_mode_id": entry.far_mode_id,
            "version": entry.version,
            "snapshot": entry.snapshot,
            "change_summary": entry.change_summary,
            "created_at": entry.created_at,
            "previous_version": previous_entry.version if previous_entry else None,
            "delta": delta,
            "changed_fields": [item["field"] for item in delta],
            "changed_labels": [item["label"] for item in delta],
        })
    return history

@router.post("/modes/{mode_id}/restore/{version}")
async def restore_far_version(mode_id: int, version: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        expected_version, _ = normalize_far_versioned_mutation_request(data)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    stmt = select(models.FarHistory).filter(models.FarHistory.far_mode_id == mode_id, models.FarHistory.version == version)
    res = await db.execute(stmt)
    history = res.scalar_one_or_none()
    if not history:
        raise HTTPException(404, "History version not found")

    lock_stmt = (
        select(models.FarFailureMode)
        .filter(models.FarFailureMode.id == mode_id)
        .with_for_update()
    )
    mode_res = await db.execute(lock_stmt)
    mode = mode_res.scalar_one_or_none()
    if not mode:
        raise HTTPException(404)

    blocker = get_far_versioned_mutation_precondition(mode, expected_version)
    if blocker:
        raise HTTPException(409, detail=blocker)

    relation_stmt = select(models.FarFailureMode).options(
        joinedload(models.FarFailureMode.affected_assets),
        joinedload(models.FarFailureMode.causes)
    ).filter(models.FarFailureMode.id == mode_id)
    relation_res = await db.execute(relation_stmt)
    mode = relation_res.unique().scalar_one()

    snapshot = history.snapshot
    # Content-version restore must not mutate the independent archive lifecycle.
    for k, v in snapshot.items():
        if k == 'affected_asset_ids' and isinstance(v, list):
            asset_stmt = select(models.Device).filter(models.Device.id.in_(v))
            asset_res = await db.execute(asset_stmt)
            mode.affected_assets = list(asset_res.scalars().all())
        elif k == 'cause_ids' and isinstance(v, list):
            cause_stmt = select(models.FarFailureCause).filter(models.FarFailureCause.id.in_(v))
            cause_res = await db.execute(cause_stmt)
            mode.causes = list(cause_res.scalars().all())
        elif k == 'is_deleted':
            continue
        elif hasattr(mode, k):
            setattr(mode, k, v)

    mode.version = int(mode.version or 1) + 1
    await db.flush()
    await save_far_history(mode.id, mode.version, db, f"Restored from v{version}")
    await db.commit()
    return {
        "status": "success",
        "restored_from_version": version,
        "previous_version": expected_version,
        "new_version": mode.version,
    }

@router.post("/modes/{mode_id}/archive")
@router.delete("/modes/{mode_id}", include_in_schema=False)
async def archive_failure_mode(mode_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id == mode_id)
    result = await db.execute(stmt)
    mode = result.scalar_one_or_none()
    if not mode: raise HTTPException(404)
    if mode.is_deleted:
        return {"status": "success", "changed": False, "version": mode.version}
    
    mode.is_deleted = True
    mode.version = (mode.version or 1) + 1
    await db.flush()
    await save_far_history(mode.id, mode.version, db, "Archived failure vector")
    await db.commit()
    return {"status": "success", "changed": True, "version": mode.version}

@router.post("/modes/bulk-score")
async def bulk_score_failure_modes(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        ids, field, value, expected_versions = normalize_far_bulk_score_request(data)
    except ValueError as exc:
        raise HTTPException(422, detail=str(exc))

    stmt = (
        select(models.FarFailureMode)
        .filter(models.FarFailureMode.id.in_(ids))
        .order_by(models.FarFailureMode.id)
        .with_for_update()
    )
    result = await db.execute(stmt)
    modes = list(result.scalars().all())

    blockers = collect_far_bulk_score_preconditions(ids, modes, expected_versions)
    if blockers["missing_ids"] or blockers["archived_ids"] or blockers["version_conflicts"]:
        raise HTTPException(
            409,
            detail={
                "code": "far_bulk_score_precondition_failed",
                **blockers,
            },
        )

    by_id = {int(mode.id): mode for mode in modes}
    changed_ids = []
    unchanged_ids = []
    for mode_id in ids:
        mode = by_id[mode_id]
        if not apply_far_bulk_score_value(mode, field, value):
            unchanged_ids.append(mode_id)
            continue
        await db.flush()
        await save_far_history(
            mode.id,
            mode.version,
            db,
            f"Bulk score update: {field}={value}",
        )
        changed_ids.append(mode_id)

    await db.commit()
    return {
        "status": "success",
        "field": field,
        "value": value,
        "selected_count": len(ids),
        "changed_count": len(changed_ids),
        "unchanged_count": len(unchanged_ids),
        "changed_ids": changed_ids,
        "unchanged_ids": unchanged_ids,
        "versions": {str(mode_id): int(by_id[mode_id].version or 1) for mode_id in ids},
    }

@router.post("/modes/bulk-archive")
@router.post("/modes/bulk-delete", include_in_schema=False)
async def bulk_archive_failure_modes(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    if not ids: return {"status": "success", "count": 0}
    
    stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id.in_(ids))
    result = await db.execute(stmt)
    modes = result.scalars().all()
    changed = []
    for mode in modes:
        if mode.is_deleted:
            continue
        mode.is_deleted = True
        mode.version = (mode.version or 1) + 1
        await db.flush()
        await save_far_history(mode.id, mode.version, db, "Archived failure vector")
        changed.append(mode.id)
        
    await db.commit()
    return {"status": "success", "count": len(changed), "changed_ids": changed}

@router.post("/modes/{mode_id}/restore")
async def restore_failure_mode(mode_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id == mode_id)
    result = await db.execute(stmt)
    mode = result.scalar_one_or_none()
    if not mode: raise HTTPException(404)
    if not mode.is_deleted:
        return {"status": "success", "changed": False, "version": mode.version}

    mode.is_deleted = False
    mode.version = (mode.version or 1) + 1
    await db.flush()
    await save_far_history(mode.id, mode.version, db, "Restored failure vector")
    await db.commit()
    return {"status": "success", "changed": True, "version": mode.version}

@router.post("/modes/bulk-restore")
async def bulk_restore_failure_modes(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    if not ids: return {"status": "success", "count": 0}

    stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id.in_(ids))
    result = await db.execute(stmt)
    modes = result.scalars().all()
    changed = []
    for mode in modes:
        if not mode.is_deleted:
            continue
        mode.is_deleted = False
        mode.version = (mode.version or 1) + 1
        await db.flush()
        await save_far_history(mode.id, mode.version, db, "Restored failure vector")
        changed.append(mode.id)

    await db.commit()
    return {"status": "success", "count": len(changed), "changed_ids": changed}

# --- CAUSES ---

@router.get("/causes", response_model=List[schemas.FarFailureCauseResponse])
async def get_failure_causes(db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarFailureCause).options(
        selectinload(models.FarFailureCause.failure_modes),
        selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureCause.mitigations),
        selectinload(models.FarFailureCause.prevention_actions)
    )
    result = await db.execute(stmt)
    return result.unique().scalars().all()

@router.post("/causes", response_model=schemas.FarFailureCauseResponse)
async def create_cause(data: dict, db: AsyncSession = Depends(get_db)):
    cause = models.FarFailureCause(
        cause_text=data.get('cause_text'),
        occurrence_level=data.get('occurrence_level', 1),
        responsible_team=data.get('responsible_team'),
        failure_modes=[],
        resolutions=[],
        mitigations=[],
        prevention_actions=[]
    )
    db.add(cause)
    await db.flush()
    
    if data.get('mode_ids'):
        stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id.in_(data['mode_ids']))
        result = await db.execute(stmt)
        modes = result.scalars().all()
        cause.failure_modes = list(modes)
        
    await db.commit()
    
    stmt = select(models.FarFailureCause).options(
        selectinload(models.FarFailureCause.failure_modes),
        selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureCause.mitigations).selectinload(models.FarMitigation.monitoring_item),
        selectinload(models.FarFailureCause.prevention_actions)
    ).filter(models.FarFailureCause.id == cause.id)
    result = await db.execute(stmt)
    return result.unique().scalar_one()

@router.delete("/causes/{cause_id}")
async def delete_cause(cause_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarFailureCause).filter(models.FarFailureCause.id == cause_id)
    result = await db.execute(stmt)
    cause = result.scalar_one_or_none()
    if not cause:
        raise HTTPException(404)

    await db.delete(cause)
    await db.commit()
    return {"status": "success"}

# --- RESOLUTIONS ---

@router.post("/resolutions", response_model=schemas.FarResolutionResponse)
async def create_resolution(data: dict, db: AsyncSession = Depends(get_db)):
    res = models.FarResolution(
        knowledge_id=data.get('knowledge_id'),
        preventive_follow_up=data.get('preventive_follow_up'),
        responsible_team=data.get('responsible_team'),
        guidance_notes=data.get('guidance_notes')
    )
    db.add(res)
    await db.flush()
    
    if data.get('cause_ids'):
        stmt = select(models.FarFailureCause).filter(models.FarFailureCause.id.in_(data['cause_ids']))
        result = await db.execute(stmt)
        causes = result.scalars().all()
        # Handle join table linkage (far_cause_resolutions)
        for cause in causes:
            cause.resolutions.append(res)
            
    await db.commit()
    
    stmt = select(models.FarResolution).options(joinedload(models.FarResolution.knowledge_bkm)).filter(models.FarResolution.id == res.id)
    result = await db.execute(stmt)
    return result.scalar_one()

# --- MITIGATIONS ---

@router.post("/mitigations", response_model=schemas.FarMitigationResponse)
async def create_mitigation(data: dict, db: AsyncSession = Depends(get_db)):
    mit = models.FarMitigation(
        mitigation_type=data.get('mitigation_type'),
        mitigation_steps=data.get('mitigation_steps'),
        responsible_team=data.get('responsible_team'),
        status=data.get('status', 'Not Started'),
        cause_id=data.get('cause_id'),
        monitoring_item_id=data.get('monitoring_item_id')
    )
    db.add(mit)
    await db.flush()
    
    if data.get('mode_ids'):
        stmt = select(models.FarFailureMode).options(
            joinedload(models.FarFailureMode.mitigations)
        ).filter(models.FarFailureMode.id.in_(data['mode_ids']))
        result = await db.execute(stmt)
        modes = result.unique().scalars().all()
        for mode in modes:
            mode.mitigations.append(mit)
            
    await db.commit()
    
    stmt = select(models.FarMitigation).options(
        selectinload(models.FarMitigation.monitoring_item)
    ).filter(models.FarMitigation.id == mit.id)
    result = await db.execute(stmt)
    return result.scalar_one()

@router.delete("/mitigations/{mitigation_id}")
async def delete_mitigation(mitigation_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarMitigation).filter(models.FarMitigation.id == mitigation_id)
    result = await db.execute(stmt)
    mitigation = result.scalar_one_or_none()
    if not mitigation:
        raise HTTPException(404)

    await db.delete(mitigation)
    await db.commit()
    return {"status": "success"}

# --- PREVENTION ---

@router.post("/prevention", response_model=schemas.FarPreventionResponse)
async def create_prevention(data: dict, db: AsyncSession = Depends(get_db)):
    prev = models.FarPrevention(
        failure_mode_id=data.get('failure_mode_id'),
        cause_id=data.get('cause_id'),
        prevention_action=data.get('prevention_action'),
        responsible_team=data.get('responsible_team'),
        status=data.get('status', 'Open'),
        target_date=data.get('target_date')
    )
    db.add(prev)
    await db.commit()
    
    stmt = select(models.FarPrevention).filter(models.FarPrevention.id == prev.id)
    result = await db.execute(stmt)
    return result.scalar_one()
