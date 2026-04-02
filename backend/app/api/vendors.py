from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import joinedload
from typing import List, Optional
from ..database import get_db
from ..models import models
from datetime import datetime

router = APIRouter(prefix="/vendors", tags=["Vendor & Contract Management"])

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    exclude = {"id", "created_at", "updated_at", "created_by_user_id"}
    return {k: v for k, v in data.items() if k in valid_keys and k not in exclude}

def parse_iso_date(date_str):
    if not date_str: return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except:
        return None

@router.get("/")
async def get_vendors(include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.Vendor).options(
        joinedload(models.Vendor.contracts),
        joinedload(models.Vendor.personnel)
    )
    if not include_deleted:
        query = query.filter(models.Vendor.is_deleted == False)
    result = await db.execute(query.order_by(models.Vendor.name))
    return result.unique().scalars().all()

@router.post("/")
async def create_vendor(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.Vendor, data)
    vendor = models.Vendor(**clean_data)
    db.add(vendor)
    try:
        await db.commit()
        await db.refresh(vendor)
        return vendor
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, detail=str(e))

@router.put("/{vendor_id}")
async def update_vendor(vendor_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Vendor).filter(models.Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor: raise HTTPException(404, "Vendor not found")
    
    clean_data = filter_valid_columns(models.Vendor, data)
    for k, v in clean_data.items():
        setattr(vendor, k, v)
        
    await db.commit()
    await db.refresh(vendor)
    return vendor

@router.delete("/{vendor_id}")
async def delete_vendor(vendor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Vendor).filter(models.Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor: raise HTTPException(404, "Vendor not found")
    
    vendor.is_deleted = True
    await db.commit()
    return {"status": "success"}

# --- PERSONNEL ---

@router.post("/{vendor_id}/personnel")
async def add_personnel(vendor_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.VendorPersonnel, data)
    clean_data["vendor_id"] = vendor_id
    personnel = models.VendorPersonnel(**clean_data)
    db.add(personnel)
    await db.commit()
    await db.refresh(personnel)
    return personnel

@router.put("/personnel/{personnel_id}")
async def update_personnel(personnel_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.VendorPersonnel).filter(models.VendorPersonnel.id == personnel_id))
    personnel = result.scalar_one_or_none()
    if not personnel: raise HTTPException(404, "Personnel not found")
    
    clean_data = filter_valid_columns(models.VendorPersonnel, data)
    for k, v in clean_data.items():
        setattr(personnel, k, v)
    
    await db.commit()
    return personnel

@router.delete("/personnel/{personnel_id}")
async def delete_personnel(personnel_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.VendorPersonnel).filter(models.VendorPersonnel.id == personnel_id))
    personnel = result.scalar_one_or_none()
    if not personnel: raise HTTPException(404, "Personnel not found")
    
    await db.delete(personnel)
    await db.commit()
    return {"status": "success"}

# --- CONTRACTS ---

@router.get("/contracts/")
async def get_contracts(include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.VendorContract).options(joinedload(models.VendorContract.vendor_ref))
    if not include_deleted:
        query = query.filter(models.VendorContract.is_deleted == False)
    result = await db.execute(query.order_by(models.VendorContract.expiry_date))
    return result.unique().scalars().all()

@router.post("/contracts/")
async def create_contract(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.VendorContract, data)
    
    # Handle dates
    if 'effective_date' in data:
        clean_data['effective_date'] = parse_iso_date(data['effective_date'])
    if 'expiry_date' in data:
        clean_data['expiry_date'] = parse_iso_date(data['expiry_date'])

    contract = models.VendorContract(**clean_data)
    db.add(contract)

    try:
        await db.commit()
        await db.refresh(contract)
        return contract
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, detail=str(e))

@router.put("/contracts/{contract_id}")
async def update_contract(contract_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.VendorContract).filter(models.VendorContract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract: raise HTTPException(404, "Contract not found")
    
    clean_data = filter_valid_columns(models.VendorContract, data)
    
    if 'effective_date' in data:
        clean_data['effective_date'] = parse_iso_date(data['effective_date'])
    if 'expiry_date' in data:
        clean_data['expiry_date'] = parse_iso_date(data['expiry_date'])
        
    for k, v in clean_data.items():
        setattr(contract, k, v)
    
    await db.commit()
    return contract

@router.post("/bulk-action")
async def bulk_action(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    target = data.get("target", "vendor") # vendor or contract
    
    if not ids: return {"status": "no_op"}
    
    model = models.Vendor if target == "vendor" else models.VendorContract
    
    if action == "delete":
        await db.execute(update(model).where(model.id.in_(ids)).values(is_deleted=True))
    elif action == "restore":
        await db.execute(update(model).where(model.id.in_(ids)).values(is_deleted=False))
    elif action == "purge":
        await db.execute(delete(model).where(model.id.in_(ids)))
        
    await db.commit()
    return {"status": "success"}
