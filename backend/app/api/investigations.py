from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import joinedload
from typing import List, Optional
from ..database import get_db
from ..models import models
from datetime import datetime

router = APIRouter(prefix="/investigations", tags=["Investigation Management"])

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    exclude = {"id", "created_at", "updated_at", "created_by_user_id"}
    return {k: v for k, v in data.items() if k in valid_keys and k not in exclude}

@router.get("/")
async def get_investigations(include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.Investigation).options(joinedload(models.Investigation.progress_logs))
    if not include_deleted:
        query = query.filter(models.Investigation.is_deleted == False)
    result = await db.execute(query.order_by(models.Investigation.updated_at.desc()))
    return result.unique().scalars().all()

@router.post("/")
async def create_investigation(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.Investigation, data)
    
    # Handle ISO dates
    if "initiation_at" in clean_data and isinstance(clean_data["initiation_at"], str) and clean_data["initiation_at"]:
        clean_data["initiation_at"] = datetime.fromisoformat(clean_data["initiation_at"].replace('Z', '+00:00'))

    inv = models.Investigation(**clean_data)
    db.add(inv)
    try:
        await db.commit()
        await db.refresh(inv)
        return inv
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, detail=str(e))

@router.put("/{inv_id}")
async def update_investigation(inv_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Investigation).filter(models.Investigation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv: raise HTTPException(404, "Investigation not found")
    
    clean_data = filter_valid_columns(models.Investigation, data)
    
    # Handle ISO dates
    if "initiation_at" in clean_data and isinstance(clean_data["initiation_at"], str) and clean_data["initiation_at"]:
        clean_data["initiation_at"] = datetime.fromisoformat(clean_data["initiation_at"].replace('Z', '+00:00'))

    for k, v in clean_data.items():
        setattr(inv, k, v)
        
    await db.commit()
    await db.refresh(inv)
    return inv

@router.delete("/{inv_id}")
async def delete_investigation(inv_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Investigation).filter(models.Investigation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv: raise HTTPException(404, "Investigation not found")
    
    inv.is_deleted = True
    await db.commit()
    return {"status": "success"}

# --- PROGRESS LOGS ---

@router.post("/{inv_id}/logs")
async def add_progress_log(inv_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.InvestigationProgress, data)
    clean_data['investigation_id'] = inv_id
    if 'added_by' not in clean_data:
        clean_data['added_by'] = "system_admin"
        
    log = models.InvestigationProgress(**clean_data)
    db.add(log)
    try:
        await db.commit()
        await db.refresh(log)
        return log
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, detail=str(e))
