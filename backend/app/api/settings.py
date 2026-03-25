from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/options")
async def get_options(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption))
    return result.scalars().all()

@router.post("/options")
async def create_option(data: dict, db: AsyncSession = Depends(get_db)):
    opt = models.SettingOption(**data)
    db.add(opt)
    await db.commit()
    await db.refresh(opt)
    return opt

@router.delete("/options/{opt_id}")
async def delete_option(opt_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption).filter(models.SettingOption.id == opt_id))
    opt = result.scalar_one_or_none()
    if opt:
        await db.delete(opt)
        await db.commit()
    return {"status": "success"}

@router.get("/initialize")
async def initialize_settings(db: AsyncSession = Depends(get_db)):
    # Simple check if already initialized
    res = await db.execute(select(models.SettingOption))
    if res.scalars().first():
        return {"status": "already_initialized"}
        
    defaults = [
        ("LogicalSystem", "SAP ERP"), ("LogicalSystem", "HR-Core"), ("LogicalSystem", "Sales-B2B"),
        ("DeviceType", "Physical"), ("DeviceType", "Virtual"), ("DeviceType", "Storage"), ("DeviceType", "Switch"),
        ("Status", "Planned"), ("Status", "Active"), ("Status", "Maintenance"), ("Status", "Decommissioned"),
        ("Environment", "Production"), ("Environment", "QA"), ("Environment", "Dev"), ("Environment", "DR")
    ]
    for cat, val in defaults:
        db.add(models.SettingOption(category=cat, label=val, value=val))
    await db.commit()
    return {"status": "initialized"}
