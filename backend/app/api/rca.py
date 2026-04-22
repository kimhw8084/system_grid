from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import joinedload, selectinload
from typing import List, Optional, Any
from ..database import get_db
from ..models import models
from ..schemas import schemas
from datetime import datetime

router = APIRouter(prefix="/rca", tags=["Incident RCA Management"])

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    exclude = {"id", "created_at", "updated_at", "created_by_user_id"}
    return {k: v for k, v in data.items() if k in valid_keys and k not in exclude}

def get_rca_options():
    """Reusable options for deep loading RCA records to satisfy RcaRecordResponse schema."""
    return [
        selectinload(models.RcaRecord.timeline),
        selectinload(models.RcaRecord.mitigations),
        selectinload(models.RcaRecord.knowledge_bkm),
        selectinload(models.RcaRecord.monitoring_config),
        selectinload(models.RcaRecord.linked_failure_modes).selectinload(models.FarFailureMode.affected_assets),
        selectinload(models.RcaRecord.linked_failure_modes).selectinload(models.FarFailureMode.causes).selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.RcaRecord.linked_failure_modes).selectinload(models.FarFailureMode.mitigations),
        selectinload(models.RcaRecord.linked_failure_modes).selectinload(models.FarFailureMode.prevention_actions),
        selectinload(models.RcaRecord.linked_failure_modes).selectinload(models.FarFailureMode.linked_rcas)
    ]

@router.get("/", response_model=List[schemas.RcaRecordResponse])
async def get_rca_records(db: AsyncSession = Depends(get_db)):
    query = select(models.RcaRecord).options(*get_rca_options()).filter(models.RcaRecord.is_deleted == False)
    result = await db.execute(query)
    return result.unique().scalars().all()

@router.get("/{rca_id}", response_model=schemas.RcaRecordResponse)
async def get_rca_detail(rca_id: int, db: AsyncSession = Depends(get_db)):
    query = select(models.RcaRecord).options(*get_rca_options()).filter(models.RcaRecord.id == rca_id)
    result = await db.execute(query)
    record = result.unique().scalar_one_or_none()
    if not record: raise HTTPException(404, "RCA Record not found")
    return record

@router.post("/", response_model=schemas.RcaRecordResponse)
async def create_rca(data: dict, db: AsyncSession = Depends(get_db)):
    linked_modes_data = data.pop("linked_failure_modes", [])
    clean_data = filter_valid_columns(models.RcaRecord, data)
    
    # Priority Mapping
    p_map = {"LOW": 1, "MEDIUM": 4, "HIGH": 7, "HIGHEST": 10}
    if "priority" in clean_data and isinstance(clean_data["priority"], str):
        clean_data["priority"] = p_map.get(clean_data["priority"].upper(), 1)

    # Handle ISO dates
    for date_field in ["occurrence_at", "acknowledged_at", "detection_at"]:
        if date_field in clean_data and isinstance(clean_data[date_field], str) and clean_data[date_field]:
            try:
                clean_data[date_field] = datetime.fromisoformat(clean_data[date_field].replace('Z', '+00:00'))
            except Exception:
                pass
        elif date_field in clean_data and not clean_data[date_field]:
            clean_data[date_field] = None

    record = models.RcaRecord(**clean_data)
    
    if linked_modes_data:
        mode_ids = [m.get("id") for m in linked_modes_data if m.get("id")]
        if mode_ids:
            modes_result = await db.execute(select(models.FarFailureMode).filter(models.FarFailureMode.id.in_(mode_ids)))
            record.linked_failure_modes = list(modes_result.scalars().all())

    db.add(record)
    await db.commit()
    
    # Re-fetch with all options to ensure fresh return
    result = await db.execute(select(models.RcaRecord).options(*get_rca_options()).filter(models.RcaRecord.id == record.id))
    record = result.unique().scalar_one()
    
    return record

@router.put("/{rca_id}", response_model=schemas.RcaRecordResponse)
async def update_rca(rca_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.RcaRecord).options(
        selectinload(models.RcaRecord.linked_failure_modes),
        selectinload(models.RcaRecord.timeline),
        selectinload(models.RcaRecord.mitigations)
    ).filter(models.RcaRecord.id == rca_id))
    record = result.unique().scalar_one_or_none()
    if not record: raise HTTPException(404, "RCA Record not found")
    
    linked_modes_data = data.pop("linked_failure_modes", None)
    timeline_data = data.pop("timeline", None)
    mitigations_data = data.pop("mitigations", None)
    
    clean_data = filter_valid_columns(models.RcaRecord, data)
    
    # Priority Mapping
    p_map = {"LOW": 1, "MEDIUM": 4, "HIGH": 7, "HIGHEST": 10}
    if "priority" in clean_data and isinstance(clean_data["priority"], str):
        clean_data["priority"] = p_map.get(clean_data["priority"].upper(), 1)

    # Handle ISO dates
    for date_field in ["occurrence_at", "acknowledged_at", "detection_at"]:
        if date_field in clean_data and isinstance(clean_data[date_field], str) and clean_data[date_field]:
            try:
                clean_data[date_field] = datetime.fromisoformat(clean_data[date_field].replace('Z', '+00:00'))
            except Exception:
                pass
        elif date_field in clean_data and not clean_data[date_field]:
            clean_data[date_field] = None

    # Sync primary owner from owners list if provided
    if "owners" in clean_data and isinstance(clean_data["owners"], list) and clean_data["owners"]:
        clean_data["owner"] = clean_data["owners"][0]

    for k, v in clean_data.items():
        setattr(record, k, v)
    
    # Sync Failure Modes
    if linked_modes_data is not None:
        mode_ids = [m if isinstance(m, int) else m.get("id") for m in linked_modes_data if (isinstance(m, int) or m.get("id"))]
        if mode_ids:
            modes_result = await db.execute(select(models.FarFailureMode).filter(models.FarFailureMode.id.in_(mode_ids)))
            record.linked_failure_modes = list(modes_result.scalars().all())
        else:
            record.linked_failure_modes = []

    # Sync Timeline
    if timeline_data is not None:
        new_timeline = []
        for t in timeline_data:
            t_clean = filter_valid_columns(models.RcaTimelineEvent, t)
            if 'event_time' in t_clean and isinstance(t_clean['event_time'], str):
                try:
                    t_clean['event_time'] = datetime.fromisoformat(t_clean['event_time'].replace('Z', '+00:00'))
                except Exception:
                    pass
            new_timeline.append(models.RcaTimelineEvent(**t_clean))
        record.timeline = new_timeline

    # Sync Mitigations
    if mitigations_data is not None:
        new_mitigations = []
        for m in mitigations_data:
            m_clean = filter_valid_columns(models.RcaMitigation, m)
            new_mitigations.append(models.RcaMitigation(**m_clean))
        record.mitigations = new_mitigations
        
    db.add(record)
    await db.flush()
    await db.commit()
    
    # Re-fetch with all options to ensure fresh return
    result = await db.execute(select(models.RcaRecord).options(*get_rca_options()).filter(models.RcaRecord.id == rca_id))
    record = result.unique().scalar_one()
    
    return record

@router.delete("/{rca_id}")
async def delete_rca(rca_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.RcaRecord).filter(models.RcaRecord.id == rca_id))
    record = result.scalar_one_or_none()
    if not record: raise HTTPException(404, "RCA Record not found")
    
    record.is_deleted = True
    await db.commit()
    return {"status": "success"}

# --- Timeline Events ---

@router.post("/{rca_id}/timeline")
async def add_timeline_event(rca_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.RcaTimelineEvent, data)
    clean_data["rca_id"] = rca_id
    if 'event_time' in clean_data and isinstance(clean_data['event_time'], str):
        clean_data['event_time'] = datetime.fromisoformat(clean_data['event_time'].replace('Z', '+00:00'))
    
    event = models.RcaTimelineEvent(**clean_data)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

# --- Mitigations ---

@router.post("/{rca_id}/mitigations")
async def add_mitigation(rca_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.RcaMitigation, data)
    clean_data["rca_id"] = rca_id
    
    mitigation = models.RcaMitigation(**clean_data)
    db.add(mitigation)
    await db.commit()
    await db.refresh(mitigation)
    return mitigation
