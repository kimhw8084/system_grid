from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from typing import List, Optional
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/logical-services", tags=["Logical Services"])

@router.get("/")
async def get_services(device_id: Optional[int] = None, include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.LogicalService).filter(models.LogicalService.is_deleted == include_deleted)
    if device_id:
        query = query.filter(models.LogicalService.device_id == device_id)
    
    result = await db.execute(query)
    services = result.scalars().all()
    
    final_result = []
    for s in services:
        device_name = "Floating / Unmounted"
        if s.device_id:
            dev_res = await db.execute(select(models.Device).filter(models.Device.id == s.device_id))
            dev = dev_res.scalar_one_or_none()
            if dev: device_name = dev.name
            
        final_result.append({
            "id": s.id,
            "name": s.name,
            "service_type": s.service_type,
            "status": s.status,
            "version": s.version,
            "environment": s.environment,
            "device_id": s.device_id,
            "device_name": device_name,
            "config_json": s.config_json,
            "custom_attributes": s.custom_attributes,
            "is_deleted": s.is_deleted
        })
    return final_result

@router.post("/")
async def create_service(data: dict, db: AsyncSession = Depends(get_db)):
    # data includes: name, service_type, status, version, environment, device_id, config_json, custom_attributes
    name = data.get('name')
    if not name: raise HTTPException(400, "Service name required")

    svc = models.LogicalService(**data)
    db.add(svc)
    try:
        await db.commit()
        await db.refresh(svc)
        
        log = models.AuditLog(
            user_id="admin", action="CREATE", target_table="logical_services", 
            target_id=str(svc.id), description=f"Registered logical service: {svc.name} ({svc.service_type})"
        )
        db.add(log)
        await db.commit()
        return svc
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{service_id}")
async def update_service(service_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LogicalService).filter(models.LogicalService.id == service_id))
    svc = result.scalar_one_or_none()
    if not svc: raise HTTPException(404)
    
    for k, v in data.items():
        if hasattr(svc, k): setattr(svc, k, v)
        
    log = models.AuditLog(
        user_id="admin", action="UPDATE", target_table="logical_services", 
        target_id=str(service_id), description=f"Updated service configuration: {svc.name}"
    )
    db.add(log)
    await db.commit()
    return svc

@router.delete("/{service_id}")
async def delete_service(service_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LogicalService).filter(models.LogicalService.id == service_id))
    svc = result.scalar_one_or_none()
    if not svc: raise HTTPException(404)
    
    name = svc.name
    svc.is_deleted = True
    log = models.AuditLog(
        user_id="admin", action="DELETE", target_table="logical_services", 
        target_id=str(service_id), description=f"Soft-deleted service: {name}"
    )
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.post("/bulk-action")
async def bulk_action(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    payload = data.get("payload", {})
    if not ids: return {"status": "no_op"}
    
    if action == "delete":
        await db.execute(update(models.LogicalService).where(models.LogicalService.id.in_(ids)).values(is_deleted=True))
    elif action == "restore":
        await db.execute(update(models.LogicalService).where(models.LogicalService.id.in_(ids)).values(is_deleted=False))
    elif action == "update":
        # Filter valid columns for LogicalService
        valid_keys = {c.name for c in models.LogicalService.__table__.columns}
        clean_update = {k: v for k, v in payload.items() if k in valid_keys}
        if clean_update:
            await db.execute(update(models.LogicalService).where(models.LogicalService.id.in_(ids)).values(**clean_update))
    
    await db.commit()
    return {"status": "success"}

@router.post("/{service_id}/mount/{device_id}")
async def mount_service(service_id: int, device_id: int, db: AsyncSession = Depends(get_db)):
    svc_res = await db.execute(select(models.LogicalService).filter(models.LogicalService.id == service_id))
    svc = svc_res.scalar_one_or_none()
    dev_res = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    dev = dev_res.scalar_one_or_none()
    
    if not svc or not dev: raise HTTPException(404, "Service or Device not found")
    
    svc.device_id = device_id
    log = models.AuditLog(
        user_id="admin", action="MOUNT", target_table="logical_services", 
        target_id=str(service_id), description=f"Mounted service {svc.name} onto host {dev.name}"
    )
    db.add(log)
    await db.commit()
    return {"status": "success"}
