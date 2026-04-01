from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/far", tags=["FAR"])

# --- FAILURE MODES ---

@router.get("/modes")
async def get_failure_modes(system: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarFailureMode).options(
        joinedload(models.FarFailureMode.causes).joinedload(models.FarFailureCause.resolutions),
        joinedload(models.FarFailureMode.mitigations),
        joinedload(models.FarFailureMode.affected_assets),
        joinedload(models.FarFailureMode.prevention_actions)
    ).filter(models.FarFailureMode.is_deleted == False)
    
    if system:
        stmt = stmt.filter(models.FarFailureMode.system_name == system)
    
    result = await db.execute(stmt)
    return result.unique().scalars().all()

@router.post("/modes")
async def create_failure_mode(data: dict, db: AsyncSession = Depends(get_db)):
    # Calculate RPN
    rpn = data.get('severity', 1) * data.get('occurrence', 1) * data.get('detection', 1)
    
    mode = models.FarFailureMode(
        system_name=data.get('system_name'),
        title=data.get('title'),
        effect=data.get('effect'),
        severity=data.get('severity', 1),
        occurrence=data.get('occurrence', 1),
        detection=data.get('detection', 1),
        rpn=rpn,
        status="Analyzing"
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

    await db.commit()
    
    # Reload with all relationships to avoid MissingGreenlet during serialization
    stmt = select(models.FarFailureMode).options(
        joinedload(models.FarFailureMode.causes).joinedload(models.FarFailureCause.resolutions),
        joinedload(models.FarFailureMode.mitigations),
        joinedload(models.FarFailureMode.affected_assets),
        joinedload(models.FarFailureMode.prevention_actions)
    ).filter(models.FarFailureMode.id == mode.id)
    result = await db.execute(stmt)
    return result.unique().scalar_one()

# --- CAUSES ---

@router.get("/causes")
async def get_failure_causes(db: AsyncSession = Depends(get_db)):
    stmt = select(models.FarFailureCause).options(
        joinedload(models.FarFailureCause.failure_modes),
        joinedload(models.FarFailureCause.resolutions)
    )
    result = await db.execute(stmt)
    return result.unique().scalars().all()

@router.post("/causes")
async def create_cause(data: dict, db: AsyncSession = Depends(get_db)):
    cause = models.FarFailureCause(
        cause_text=data.get('cause_text'),
        occurrence_level=data.get('occurrence_level', 1),
        responsible_team=data.get('responsible_team')
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
        joinedload(models.FarFailureCause.failure_modes),
        joinedload(models.FarFailureCause.resolutions)
    ).filter(models.FarFailureCause.id == cause.id)
    result = await db.execute(stmt)
    return result.unique().scalar_one()

# --- RESOLUTIONS ---

@router.post("/resolutions")
async def create_resolution(data: dict, db: AsyncSession = Depends(get_db)):
    res = models.FarResolution(
        knowledge_id=data.get('knowledge_id'),
        preventive_follow_up=data.get('preventive_follow_up'),
        responsible_team=data.get('responsible_team')
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
    
    stmt = select(models.FarResolution).filter(models.FarResolution.id == res.id)
    result = await db.execute(stmt)
    return result.scalar_one()

# --- MITIGATIONS ---

@router.post("/mitigations")
async def create_mitigation(data: dict, db: AsyncSession = Depends(get_db)):
    mit = models.FarMitigation(
        mitigation_type=data.get('mitigation_type'),
        mitigation_steps=data.get('mitigation_steps'),
        responsible_team=data.get('responsible_team'),
        monitoring_item_id=data.get('monitoring_item_id')
    )
    db.add(mit)
    await db.flush()
    
    if data.get('mode_ids'):
        stmt = select(models.FarFailureMode).filter(models.FarFailureMode.id.in_(data['mode_ids']))
        result = await db.execute(stmt)
        modes = result.scalars().all()
        for mode in modes:
            mode.mitigations.append(mit)
            
    await db.commit()
    
    stmt = select(models.FarMitigation).filter(models.FarMitigation.id == mit.id)
    result = await db.execute(stmt)
    return result.scalar_one()

# --- PREVENTION ---

@router.post("/prevention")
async def create_prevention(data: dict, db: AsyncSession = Depends(get_db)):
    prev = models.FarPrevention(
        failure_mode_id=data.get('failure_mode_id'),
        prevention_action=data.get('prevention_action'),
        responsible_team=data.get('responsible_team'),
        target_date=data.get('target_date')
    )
    db.add(prev)
    await db.commit()
    
    stmt = select(models.FarPrevention).filter(models.FarPrevention.id == prev.id)
    result = await db.execute(stmt)
    return result.scalar_one()
