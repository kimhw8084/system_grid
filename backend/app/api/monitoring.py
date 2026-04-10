from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import joinedload
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/monitoring", tags=["Monitoring Matrix"])

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    exclude = {"id", "created_at", "updated_at", "created_by_user_id"}
    return {k: v for k, v in data.items() if k in valid_keys and k not in exclude}

@router.get("/", response_model=List[schemas.MonitoringItemResponse])
async def get_monitoring_items(device_id: Optional[int] = None, include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.MonitoringItem).options(joinedload(models.MonitoringItem.owners))
    if not include_deleted:
        query = query.filter(models.MonitoringItem.is_deleted == False)
    
    if device_id:
        query = query.filter(models.MonitoringItem.device_id == device_id)
    
    result = await db.execute(query)
    items = result.unique().scalars().all()
    
    # Enrich with device name and service names
    res = []
    for item in items:
        resp = schemas.MonitoringItemResponse.model_validate(item)
        if item.device_id:
            dev_res = await db.execute(select(models.Device.name).filter(models.Device.id == item.device_id))
            resp.device_name = dev_res.scalar_one_or_none()
            
        if item.monitored_services:
            svc_res = await db.execute(select(models.LogicalService.name).filter(models.LogicalService.id.in_(item.monitored_services)))
            resp.monitored_service_names = list(svc_res.scalars().all())
            
        if item.recovery_docs:
            doc_res = await db.execute(select(models.KnowledgeEntry.title).filter(models.KnowledgeEntry.id.in_(item.recovery_docs)))
            resp.recovery_doc_titles = list(doc_res.scalars().all())
            
        res.append(resp)
        
    return res

@router.post("/", response_model=schemas.MonitoringItemResponse)
async def create_monitoring_item(data: schemas.MonitoringItemCreate, db: AsyncSession = Depends(get_db)):
    owners_data = data.owners
    item_data = data.model_dump(exclude={"owners"})
    
    db_obj = models.MonitoringItem(**item_data)
    db.add(db_obj)
    await db.flush() # To get db_obj.id
    
    for owner in owners_data:
        db_owner = models.MonitoringOwner(**owner.model_dump(), monitoring_item_id=db_obj.id)
        db.add(db_owner)
        
    await db.commit()
    
    # Reload with owners
    result = await db.execute(select(models.MonitoringItem).options(joinedload(models.MonitoringItem.owners)).filter(models.MonitoringItem.id == db_obj.id))
    db_obj = result.unique().scalar_one()
    
    resp = schemas.MonitoringItemResponse.model_validate(db_obj)
    if db_obj.device_id:
        dev_res = await db.execute(select(models.Device.name).filter(models.Device.id == db_obj.device_id))
        resp.device_name = dev_res.scalar_one_or_none()
        
    if db_obj.monitored_services:
        svc_res = await db.execute(select(models.LogicalService.name).filter(models.LogicalService.id.in_(db_obj.monitored_services)))
        resp.monitored_service_names = list(svc_res.scalars().all())
        
    if db_obj.recovery_docs:
        doc_res = await db.execute(select(models.KnowledgeEntry.title).filter(models.KnowledgeEntry.id.in_(db_obj.recovery_docs)))
        resp.recovery_doc_titles = list(doc_res.scalars().all())
        
    return resp

@router.put("/{item_id}", response_model=schemas.MonitoringItemResponse)
async def update_monitoring_item(item_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item: raise HTTPException(404, "Monitoring item not found")
    
    owners_data = data.get("owners")
    clean_data = filter_valid_columns(models.MonitoringItem, data)
    
    for k, v in clean_data.items():
        setattr(item, k, v)
    
    if owners_data is not None:
        # Simple replace for now
        await db.execute(delete(models.MonitoringOwner).where(models.MonitoringOwner.monitoring_item_id == item_id))
        for owner in owners_data:
            db_owner = models.MonitoringOwner(**owner, monitoring_item_id=item_id)
            db.add(db_owner)
            
    await db.commit()
    
    # Reload with owners
    result = await db.execute(select(models.MonitoringItem).options(joinedload(models.MonitoringItem.owners)).filter(models.MonitoringItem.id == item_id))
    item = result.unique().scalar_one()
    
    resp = schemas.MonitoringItemResponse.model_validate(item)
    if item.device_id:
        dev_res = await db.execute(select(models.Device.name).filter(models.Device.id == item.device_id))
        resp.device_name = dev_res.scalar_one_or_none()
        
    if item.monitored_services:
        svc_res = await db.execute(select(models.LogicalService.name).filter(models.LogicalService.id.in_(item.monitored_services)))
        resp.monitored_service_names = list(svc_res.scalars().all())
        
    if item.recovery_docs:
        doc_res = await db.execute(select(models.KnowledgeEntry.title).filter(models.KnowledgeEntry.id.in_(item.recovery_docs)))
        resp.recovery_doc_titles = list(doc_res.scalars().all())
        
    return resp

@router.post("/bulk-action")
async def bulk_action(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    payload = data.get("payload", {})
    if not ids: return {"status": "no_op"}
    
    if action == "delete":
        await db.execute(update(models.MonitoringItem).where(models.MonitoringItem.id.in_(ids)).values(is_deleted=True, status="Deleted"))
    elif action == "purge":
        await db.execute(delete(models.MonitoringItem).where(models.MonitoringItem.id.in_(ids)))
    elif action == "restore":
        await db.execute(update(models.MonitoringItem).where(models.MonitoringItem.id.in_(ids)).values(is_deleted=False, status="Existing"))
    elif action == "update":
        clean_update = filter_valid_columns(models.MonitoringItem, payload)
        if clean_update:
            await db.execute(update(models.MonitoringItem).where(models.MonitoringItem.id.in_(ids)).values(**clean_update))
    
    await db.commit()
    return {"status": "success"}

@router.delete("/{item_id}")
async def delete_monitoring_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item: raise HTTPException(404, "Monitoring item not found")
    
    item.is_deleted = True
    item.status = "Deleted"
    await db.commit()
    return {"status": "success"}
