from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/", response_model=List[schemas.DeviceResponse])
async def get_devices(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device))
    return result.scalars().all()

@router.post("/", response_model=schemas.DeviceResponse)
async def create_device(device: schemas.DeviceCreate, db: AsyncSession = Depends(get_db)):
    db_device = models.Device(**device.model_dump())
    db.add(db_device)
    try:
        await db.commit()
        await db.refresh(db_device)
        return db_device
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{device_id}", response_model=schemas.DeviceResponse)
async def update_device(device_id: int, device_update: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    for key, value in device_update.items():
        if hasattr(db_device, key):
            setattr(db_device, key, value)
    
    try:
        await db.commit()
        await db.refresh(db_device)
        return db_device
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{device_id}")
async def delete_device(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    await db.delete(db_device)
    await db.commit()
    return {"status": "success"}

# Expansion endpoints (Hardware, Software, Secrets)
@router.get("/{device_id}/hardware")
async def get_hardware(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.HardwareComponent).filter(models.HardwareComponent.device_id == device_id))
    return result.scalars().all()

@router.post("/{device_id}/hardware")
async def add_hardware(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    comp = models.HardwareComponent(device_id=device_id, **data)
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp

@router.delete("/hardware/{comp_id}")
async def delete_hardware(comp_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(models.HardwareComponent).filter(models.HardwareComponent.id == comp_id))
    await db.commit()
    return {"status": "success"}

@router.get("/{device_id}/software")
async def get_software(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.DeviceSoftware).filter(models.DeviceSoftware.device_id == device_id))
    return result.scalars().all()

@router.post("/{device_id}/software")
async def add_software(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    sw = models.DeviceSoftware(device_id=device_id, **data)
    db.add(sw)
    await db.commit()
    await db.refresh(sw)
    return sw

@router.delete("/software/{sw_id}")
async def delete_software(sw_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(models.DeviceSoftware).filter(models.DeviceSoftware.id == sw_id))
    await db.commit()
    return {"status": "success"}

@router.get("/{device_id}/secrets")
async def get_secrets(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SecretVault).filter(models.SecretVault.device_id == device_id))
    return result.scalars().all()

@router.post("/{device_id}/secrets")
async def add_secret(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    secret = models.SecretVault(device_id=device_id, **data)
    db.add(secret)
    await db.commit()
    await db.refresh(secret)
    return secret

@router.delete("/secrets/{secret_id}")
async def delete_secret(secret_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(models.SecretVault).filter(models.SecretVault.id == secret_id))
    await db.commit()
    return {"status": "success"}
