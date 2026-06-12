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
IMMUTABLE_FAR_FIELDS = {"id", "created_at", "updated_at", "created_by_user_id", "version"}

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
        "cause_ids": [c.id for c in mode.causes]
    }

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
async def get_failure_modes(system: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarFailureMode).options(
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.mitigations),
        selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.prevention_actions),
        selectinload(models.FarFailureMode.mitigations),
        selectinload(models.FarFailureMode.affected_assets),
        selectinload(models.FarFailureMode.prevention_actions),
        selectinload(models.FarFailureMode.linked_rcas)
    ).filter(models.FarFailureMode.is_deleted == False)
    
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
    stmt = select(models.FarFailureMode).options(
        joinedload(models.FarFailureMode.affected_assets),
        joinedload(models.FarFailureMode.causes)
    ).filter(models.FarFailureMode.id == mode_id)
    result = await db.execute(stmt)
    mode = result.unique().scalar_one_or_none()
    if not mode: raise HTTPException(404)
    
    # Track if we need to update RPN
    rpn_fields = {'severity', 'occurrence', 'detection'}
    needs_rpn = False
    
    clean_data = filter_valid_columns(models.FarFailureMode, data, exclude=IMMUTABLE_FAR_FIELDS)
    
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
            if k in rpn_fields: needs_rpn = True
            
    if needs_rpn:
        mode.rpn = mode.severity * mode.occurrence * mode.detection
            
    mode.version = (mode.version or 1) + 1
    await db.flush()
    await save_far_history(mode.id, mode.version, db, data.get("_change_summary", "Update via API"))
    await db.commit()
    
    # Reload with full relations
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
    return res.scalars().all()

@router.post("/modes/{mode_id}/restore/{version}")
async def restore_far_version(mode_id: int, version: int, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarHistory).filter(models.FarHistory.far_mode_id == mode_id, models.FarHistory.version == version)
    res = await db.execute(stmt)
    history = res.scalar_one_or_none()
    if not history: raise HTTPException(404, "History version not found")
    
    mode_stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id == mode_id)
    mode_res = await db.execute(mode_stmt)
    mode = mode_res.scalar_one()
    
    snapshot = history.snapshot
    # Apply snapshot (Cloned from standard)
    for k, v in snapshot.items():
        if k == 'affected_asset_ids' and isinstance(v, list):
            asset_stmt = select(models.Device).filter(models.Device.id.in_(v))
            asset_res = await db.execute(asset_stmt)
            mode.affected_assets = list(asset_res.scalars().all())
        elif k == 'cause_ids' and isinstance(v, list):
            cause_stmt = select(models.FarFailureCause).filter(models.FarFailureCause.id.in_(v))
            cause_res = await db.execute(cause_stmt)
            mode.causes = list(cause_res.scalars().all())
        elif hasattr(mode, k):
            setattr(mode, k, v)
            
    mode.version = (mode.version or 1) + 1
    await db.flush()
    await save_far_history(mode.id, mode.version, db, f"Restored from v{version}")
    await db.commit()
    return {"status": "success", "new_version": mode.version}

@router.delete("/modes/{mode_id}")
async def delete_failure_mode(mode_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id == mode_id)
    result = await db.execute(stmt)
    mode = result.scalar_one_or_none()
    if not mode: raise HTTPException(404)
    
    mode.is_deleted = True
    await db.commit()
    return {"status": "success"}

@router.post("/modes/bulk-delete")
async def bulk_delete_failure_modes(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    if not ids: return {"status": "success", "count": 0}
    
    stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id.in_(ids))
    result = await db.execute(stmt)
    modes = result.scalars().all()
    
    for mode in modes:
        mode.is_deleted = True
        
    await db.commit()
    return {"status": "success", "count": len(modes)}

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
