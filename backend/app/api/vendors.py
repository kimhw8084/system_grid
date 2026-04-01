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

@router.get("/")
async def get_vendors(include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.Vendor).options(joinedload(models.Vendor.contracts))
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

# --- CONTRACTS ---

@router.get("/contracts/")
async def get_contracts(include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.VendorContract).options(
        joinedload(models.VendorContract.vendor_ref),
        joinedload(models.VendorContract.coverage_links).joinedload(models.ContractCoverage.device)
    )
    if not include_deleted:
        query = query.filter(models.VendorContract.is_deleted == False)
    result = await db.execute(query.order_by(models.VendorContract.end_date))
    return result.unique().scalars().all()

@router.post("/contracts/")
async def create_contract(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.VendorContract, data)
    
    # Handle dates
    if 'start_date' in data and data['start_date']:
        clean_data['start_date'] = datetime.fromisoformat(data['start_date'].replace("Z", "+00:00"))
    if 'end_date' in data and data['end_date']:
        clean_data['end_date'] = datetime.fromisoformat(data['end_date'].replace("Z", "+00:00"))

    contract = models.VendorContract(**clean_data)
    db.add(contract)
    
    # Handle coverage multi-select if provided
    device_ids = data.get("covered_device_ids", [])
    support_tier = data.get("support_tier", "Standard")
    
    await db.flush()
    
    for did in device_ids:
        coverage = models.ContractCoverage(
            contract_id=contract.id,
            device_id=did,
            support_tier=support_tier
        )
        db.add(coverage)

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
    
    if 'start_date' in data and data['start_date']:
        clean_data['start_date'] = datetime.fromisoformat(data['start_date'].replace("Z", "+00:00"))
    if 'end_date' in data and data['end_date']:
        clean_data['end_date'] = datetime.fromisoformat(data['end_date'].replace("Z", "+00:00"))
        
    for k, v in clean_data.items():
        setattr(contract, k, v)
    
    # Update coverage links if provided
    if "covered_device_ids" in data:
        # Purge old links
        await db.execute(delete(models.ContractCoverage).where(models.ContractCoverage.contract_id == contract_id))
        
        device_ids = data.get("covered_device_ids", [])
        support_tier = data.get("support_tier", "Standard")
        for did in device_ids:
            coverage = models.ContractCoverage(
                contract_id=contract.id,
                device_id=did,
                support_tier=support_tier
            )
            db.add(coverage)

    await db.commit()
    return {"status": "success"}

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
