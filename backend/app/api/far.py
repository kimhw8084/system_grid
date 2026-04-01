from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter()

# --- FAILURE MODES ---

@router.get("/modes")
def get_failure_modes(system: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.FarFailureMode).filter(models.FarFailureMode.is_deleted == False)
    if system:
        query = query.filter(models.FarFailureMode.system_name == system)
    return query.all()

@router.post("/modes")
def create_failure_mode(data: dict, db: Session = Depends(get_db)):
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
    db.flush()

    # Link Assets
    if data.get('affected_assets'):
        assets = db.query(models.Device).filter(models.Device.id.in_(data['affected_assets'])).all()
        mode.affected_assets = assets

    db.commit()
    db.refresh(mode)
    return mode

# --- CAUSES ---

@router.post("/causes")
def create_cause(data: dict, db: Session = Depends(get_db)):
    cause = models.FarFailureCause(
        cause_text=data.get('cause_text'),
        occurrence_level=data.get('occurrence_level', 1),
        responsible_team=data.get('responsible_team')
    )
    db.add(cause)
    db.flush()
    
    if data.get('mode_ids'):
        modes = db.query(models.FarFailureMode).filter(models.FarFailureMode.id.in_(data['mode_ids'])).all()
        cause.failure_modes = modes
        
    db.commit()
    db.refresh(cause)
    return cause

# --- RESOLUTIONS ---

@router.post("/resolutions")
def create_resolution(data: dict, db: Session = Depends(get_db)):
    res = models.FarResolution(
        knowledge_id=data.get('knowledge_id'),
        preventive_follow_up=data.get('preventive_follow_up'),
        responsible_team=data.get('responsible_team')
    )
    db.add(res)
    db.flush()
    
    if data.get('cause_ids'):
        causes = db.query(models.FarFailureCause).filter(models.FarFailureCause.id.in_(data['cause_ids'])).all()
        # Handle join table linkage (far_cause_resolutions)
        for cause in causes:
            cause.resolutions.append(res)
            
    db.commit()
    db.refresh(res)
    return res

# --- MITIGATIONS ---

@router.post("/mitigations")
def create_mitigation(data: dict, db: Session = Depends(get_db)):
    mit = models.FarMitigation(
        mitigation_type=data.get('mitigation_type'),
        mitigation_steps=data.get('mitigation_steps'),
        responsible_team=data.get('responsible_team'),
        monitoring_item_id=data.get('monitoring_item_id')
    )
    db.add(mit)
    db.flush()
    
    if data.get('mode_ids'):
        modes = db.query(models.FarFailureMode).filter(models.FarFailureMode.id.in_(data['mode_ids'])).all()
        for mode in modes:
            mode.mitigations.append(mit)
            
    db.commit()
    db.refresh(mit)
    return mit

# --- PREVENTION ---

@router.post("/prevention")
def create_prevention(data: dict, db: Session = Depends(get_db)):
    prev = models.FarPrevention(
        failure_mode_id=data.get('failure_mode_id'),
        prevention_action=data.get('prevention_action'),
        responsible_team=data.get('responsible_team'),
        target_date=data.get('target_date')
    )
    db.add(prev)
    db.commit()
    db.refresh(prev)
    return prev
