from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import joinedload
from typing import List, Optional
from ..database import get_db
from ..models import models
from datetime import datetime

router = APIRouter(prefix="/incidents", tags=["Incident Management"])

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    exclude = {"id", "created_at", "updated_at", "created_by_user_id"}
    return {k: v for k, v in data.items() if k in valid_keys and k not in exclude}

def parse_iso_date(val):
    if not val: return None
    if isinstance(val, datetime): return val
    try: return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except: return None

def format_incident(inc: models.IncidentLog):
    return {
        "id": inc.id,
        "device_id": inc.device_id,
        "device_name": inc.device.name if inc.device else "Unknown Node",
        "title": inc.title,
        "severity": inc.severity,
        "status": inc.status,
        "start_time": inc.start_time.isoformat() if inc.start_time else None,
        "end_time": inc.end_time.isoformat() if inc.end_time else None,
        "impact_analysis": inc.impact_analysis,
        "root_cause": inc.root_cause,
        "resolution_steps": inc.resolution_steps,
        "lessons_learned": inc.lessons_learned,
        "prevention_strategy": inc.prevention_strategy,
        "timeline": inc.timeline_json or [],
        "todos": inc.todos_json or []
    }

@router.get("/")
async def get_incidents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.IncidentLog).options(joinedload(models.IncidentLog.device)).order_by(models.IncidentLog.created_at.desc()))
    incidents = result.scalars().all()
    return [format_incident(inc) for inc in incidents]

@router.post("/")
async def create_incident(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.IncidentLog, data)
    
    # Handle dates
    if 'start_time' in data: clean_data['start_time'] = parse_iso_date(data['start_time'])
    if 'end_time' in data: clean_data['end_time'] = parse_iso_date(data['end_time'])
    
    # Handle JSON fields
    if 'timeline' in data: clean_data['timeline_json'] = data['timeline']
    if 'todos' in data: clean_data['todos_json'] = data['todos']
    
    inc = models.IncidentLog(**clean_data)
    db.add(inc)
    try:
        await db.flush()
        log = models.AuditLog(
            user_id="admin", action="CREATE", target_table="incident_logs", 
            target_id=str(inc.id), description=f"Logged incident: {inc.title}"
        )
        db.add(log)
        await db.commit()
        
        result = await db.execute(select(models.IncidentLog).options(joinedload(models.IncidentLog.device)).filter(models.IncidentLog.id == inc.id))
        return format_incident(result.scalars().one())
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, detail=str(e))

@router.put("/{incident_id}")
async def update_incident(incident_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.IncidentLog).filter(models.IncidentLog.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc: raise HTTPException(404, "Incident not found")
    
    clean_data = filter_valid_columns(models.IncidentLog, data)
    
    if 'start_time' in data: clean_data['start_time'] = parse_iso_date(data['start_time'])
    if 'end_time' in data: clean_data['end_time'] = parse_iso_date(data['end_time'])
    if 'timeline' in data: clean_data['timeline_json'] = data['timeline']
    if 'todos' in data: clean_data['todos_json'] = data['todos']
    
    for k, v in clean_data.items():
        setattr(inc, k, v)
        
    log = models.AuditLog(
        user_id="admin", action="UPDATE", target_table="incident_logs", 
        target_id=str(incident_id), description=f"Updated incident forensics: {inc.title}"
    )
    db.add(log)
    await db.commit()
    
    result = await db.execute(select(models.IncidentLog).options(joinedload(models.IncidentLog.device)).filter(models.IncidentLog.id == incident_id))
    return format_incident(result.scalars().one())

@router.delete("/{incident_id}")
async def delete_incident(incident_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.IncidentLog).filter(models.IncidentLog.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc: raise HTTPException(404, "Incident not found")
    
    title = inc.title
    await db.delete(inc)
    
    log = models.AuditLog(
        user_id="admin", action="DELETE", target_table="incident_logs", 
        target_id=str(incident_id), description=f"Purged incident record: {title}"
    )
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.post("/bulk-action")
async def bulk_action(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    if not ids: return {"status": "no_op"}
    
    if action == "delete":
        await db.execute(delete(models.IncidentLog).where(models.IncidentLog.id.in_(ids)))
        log = models.AuditLog(user_id="admin", action="DELETE", target_table="incident_logs", target_id="MULTIPLE", description=f"Bulk purged {len(ids)} incident records")
        db.add(log)
    
    await db.commit()
    return {"status": "success"}
