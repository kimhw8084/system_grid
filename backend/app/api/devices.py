from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/")
async def get_devices(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device))
    devices = result.scalars().all()
    
    final_devices = []
    for d in devices:
        # Fetch relationships
        rel_result = await db.execute(select(models.DeviceRelationship).filter(models.DeviceRelationship.source_device_id == d.id))
        rels = rel_result.scalars().all()
        rel_list = []
        for r in rels:
            target_res = await db.execute(select(models.Device).filter(models.Device.id == r.target_device_id))
            target = target_res.scalar_one_or_none()
            rel_list.append({
                "type": r.relationship_type,
                "target_name": target.name if target else "Unknown"
            })
        
        device_dict = {c.name: getattr(d, c.name) for c in d.__table__.columns}
        device_dict["relationships"] = rel_list
        final_devices.append(device_dict)
        
    return final_devices

@router.post("/")
async def create_device(data: dict, db: AsyncSession = Depends(get_db)):
    # Ensure mandatory fields are present
    required = ["name", "serial_number", "asset_tag"]
    for field in required:
        if not data.get(field):
            raise HTTPException(status_code=400, detail=f"Field '{field}' is mandatory")

    db_device = models.Device(**data)
    db.add(db_device)
    try:
        await db.commit()
        await db.refresh(db_device)
        
        log = models.AuditLog(
            user_id="admin", action="CREATE", table_name="devices", 
            record_id=db_device.id, intent_note=f"Provisioned new asset: {db_device.name}"
        )
        db.add(log)
        await db.commit()
        return db_device
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Provisioning failed: Serial number or Asset Tag already exists")

@router.put("/{device_id}")
async def update_device(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    for k, v in data.items():
        if hasattr(db_device, k):
            setattr(db_device, k, v)
    
    log = models.AuditLog(
        user_id="admin", action="UPDATE", table_name="devices", 
        record_id=db_device.id, intent_note=f"Updated registry details for {db_device.name}"
    )
    db.add(log)
    await db.commit()
    await db.refresh(db_device)
    return db_device

@router.delete("/{device_id}")
async def delete_device(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    name = db_device.name
    await db.delete(db_device)
    
    log = models.AuditLog(
        user_id="admin", action="DELETE", table_name="devices", 
        record_id=device_id, intent_note=f"Purged asset from registry: {name}"
    )
    db.add(log)
    await db.commit()
    return {"status": "success"}

# --- HARDWARE EXPANSION ---
@router.get("/{device_id}/hardware")
async def get_hardware(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.HardwareComponent).filter(models.HardwareComponent.device_id == device_id))
    return result.scalars().all()

@router.post("/{device_id}/hardware")
async def add_hardware(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    comp = models.HardwareComponent(device_id=device_id, **data)
    db.add(comp)
    log = models.AuditLog(user_id="admin", action="UPDATE", table_name="hardware_components", record_id=device_id, intent_note="Added hardware component")
    db.add(log)
    await db.commit()
    await db.refresh(comp)
    return comp

@router.delete("/hardware/{comp_id}")
async def delete_hardware(comp_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.HardwareComponent).filter(models.HardwareComponent.id == comp_id))
    comp = result.scalar_one_or_none()
    if comp:
        await db.delete(comp)
        await db.commit()
    return {"status": "success"}

# --- SOFTWARE EXPANSION ---
@router.get("/{device_id}/software")
async def get_software(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.DeviceSoftware).filter(models.DeviceSoftware.device_id == device_id))
    return result.scalars().all()

@router.post("/{device_id}/software")
async def add_software(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    sw = models.DeviceSoftware(device_id=device_id, **data)
    db.add(sw)
    log = models.AuditLog(user_id="admin", action="UPDATE", table_name="device_software", record_id=device_id, intent_note="Updated software stack")
    db.add(log)
    await db.commit()
    await db.refresh(sw)
    return sw

@router.delete("/software/{sw_id}")
async def delete_software(sw_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.DeviceSoftware).filter(models.DeviceSoftware.id == sw_id))
    sw = result.scalar_one_or_none()
    if sw:
        await db.delete(sw)
        await db.commit()
    return {"status": "success"}

# --- CREDENTIALS EXPANSION ---
@router.get("/{device_id}/secrets")
async def get_secrets(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SecretVault).filter(models.SecretVault.device_id == device_id))
    return result.scalars().all()

@router.post("/{device_id}/secrets")
async def add_secret(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    secret = models.SecretVault(device_id=device_id, **data)
    db.add(secret)
    log = models.AuditLog(user_id="admin", action="UPDATE", table_name="secret_vault", record_id=device_id, intent_note="Modified security credentials")
    db.add(log)
    await db.commit()
    await db.refresh(secret)
    return secret

@router.delete("/secrets/{secret_id}")
async def delete_secret(secret_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SecretVault).filter(models.SecretVault.id == secret_id))
    secret = result.scalar_one_or_none()
    if secret:
        await db.delete(secret)
        await db.commit()
    return {"status": "success"}
