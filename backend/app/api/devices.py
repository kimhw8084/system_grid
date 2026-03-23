from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, or_
from typing import List, Optional
from datetime import datetime
import json
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/devices", tags=["Devices"])

def parse_dates(data: dict):
    date_fields = ['purchase_date', 'install_date', 'warranty_end', 'eol_date']
    for df in date_fields:
        if data.get(df) and isinstance(data[df], str):
            try:
                data[df] = datetime.fromisoformat(data[df].replace("Z", "+00:00"))
            except Exception:
                data.pop(df, None)
    return data

@router.get("/")
async def get_devices(include_decommissioned: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.Device)
    if not include_decommissioned:
        query = query.filter(models.Device.status != "Decommissioned")
    
    result = await db.execute(query)
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
                "target_name": target.name if target else "Unknown",
                "source_role": r.source_role,
                "target_role": r.target_role
            })
        
        # Fetch location info
        loc_res = await db.execute(select(models.DeviceLocation).filter(models.DeviceLocation.device_id == d.id))
        loc = loc_res.scalar_one_or_none()
        rack_name, site_name, u_size, u_start = None, "Unplaced", None, None
        
        if loc:
            rack_res = await db.execute(select(models.Rack).filter(models.Rack.id == loc.rack_id))
            rack = rack_res.scalar_one_or_none()
            if rack:
                rack_name = rack.name
                u_size = loc.size_u
                u_start = loc.start_unit
                if rack.room_id:
                    room_res = await db.execute(select(models.Room).filter(models.Room.id == rack.room_id))
                    room = room_res.scalar_one_or_none()
                    if room:
                        site_res = await db.execute(select(models.Site).filter(models.Site.id == room.site_id))
                        site = site_res.scalar_one_or_none()
                        if site: site_name = site.name

        device_dict = {c.name: getattr(d, c.name) for c in d.__table__.columns}
        device_dict["relationships"] = rel_list
        device_dict["rack_name"] = rack_name
        device_dict["site_name"] = site_name
        device_dict["u_size"] = u_size
        device_dict["u_start"] = u_start
        final_devices.append(device_dict)
        
    return final_devices

@router.post("/")
async def create_device(data: dict, force: bool = False, db: AsyncSession = Depends(get_db)):
    required = ["name", "serial_number", "asset_tag"]
    for field in required:
        if not data.get(field):
            raise HTTPException(status_code=400, detail=f"Field '{field}' is mandatory")

    # Duplicate Check (Active vs Decommissioned)
    dup_res = await db.execute(select(models.Device).filter(
        or_(models.Device.name == data['name'], models.Device.serial_number == data['serial_number'])
    ))
    existing = dup_res.scalars().all()
    
    if existing:
        active_dups = [e for e in existing if e.status != "Decommissioned"]
        if active_dups and not force:
            raise HTTPException(status_code=409, detail=f"Conflict: Hostname or Serial Number already exists in active registry.")
        
        decom_dups = [e for e in existing if e.status == "Decommissioned"]
        if decom_dups and not force:
            raise HTTPException(status_code=409, detail="WARN_DECOMMISSIONED: Identical asset found in Decommissioned History. Confirm to proceed.")

    clean_data = parse_dates(data)
    valid_keys = {c.name for c in models.Device.__table__.columns}
    filtered_data = {k: v for k, v in clean_data.items() if k in valid_keys}

    db_device = models.Device(**filtered_data)
    db.add(db_device)
    try:
        await db.commit()
        await db.refresh(db_device)
        log = models.AuditLog(user_id="admin", action="CREATE", target_table="devices", target_id=str(db_device.id), description=f"Provisioned asset: {db_device.name}")
        db.add(log)
        await db.commit()
        return db_device
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Provisioning failed: {str(e)}")

@router.put("/{device_id}")
async def update_device(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device: raise HTTPException(404)
    
    clean_data = parse_dates(data)
    valid_keys = {c.name for c in models.Device.__table__.columns}
    
    for k, v in clean_data.items():
        if k in valid_keys:
            setattr(db_device, k, v)
    
    log = models.AuditLog(user_id="admin", action="UPDATE", target_table="devices", target_id=str(db_device.id), description=f"Updated registry details for {db_device.name}")
    db.add(log)
    await db.commit()
    return db_device

@router.post("/bulk-delete")
async def bulk_delete(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get('ids', [])
    if not ids: return {"status": "no-op"}
    await db.execute(update(models.Device).where(models.Device.id.in_(ids)).values(status="Decommissioned"))
    log = models.AuditLog(user_id="admin", action="BULK_DELETE", target_table="devices", description=f"Soft-deleted {len(ids)} assets")
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.post("/bulk-restore")
async def bulk_restore(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get('ids', [])
    if not ids: return {"status": "no-op"}
    await db.execute(update(models.Device).where(models.Device.id.in_(ids)).values(status="Active"))
    log = models.AuditLog(user_id="admin", action="RESTORE", target_table="devices", description=f"Restored {len(ids)} decommissioned assets")
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.delete("/{device_id}")
async def soft_delete_device(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device: raise HTTPException(404)
    db_device.status = "Decommissioned"
    log = models.AuditLog(user_id="admin", action="DELETE", target_table="devices", target_id=str(device_id), description=f"Soft-deleted asset: {db_device.name}")
    db.add(log)
    await db.commit()
    return {"status": "success"}

# --- EXPANSIONS (Fixed Paths) ---
@router.get("/{device_id}/hardware")
async def get_hardware(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.HardwareComponent).filter(models.HardwareComponent.device_id == device_id))
    return result.scalars().all()

@router.post("/{device_id}/hardware")
async def add_hardware(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    comp = models.HardwareComponent(device_id=device_id, **data)
    db.add(comp)
    await db.commit()
    return comp

@router.delete("/hardware/{comp_id}")
async def delete_hardware(comp_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.HardwareComponent).filter(models.HardwareComponent.id == comp_id))
    comp = result.scalar_one_or_none()
    if comp:
        await db.delete(comp)
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
    return sw

@router.delete("/software/{sw_id}")
async def delete_software(sw_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.DeviceSoftware).filter(models.DeviceSoftware.id == sw_id))
    sw = result.scalar_one_or_none()
    if sw:
        await db.delete(sw)
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
    return secret

@router.delete("/secrets/{secret_id}")
async def delete_secret(secret_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SecretVault).filter(models.SecretVault.id == secret_id))
    secret = result.scalar_one_or_none()
    if secret:
        await db.delete(secret)
        await db.commit()
    return {"status": "success"}

@router.get("/{device_id}/relationships")
async def get_relationships(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.DeviceRelationship).filter(models.DeviceRelationship.source_device_id == device_id))
    rels = result.scalars().all()
    final = []
    for r in rels:
        target_res = await db.execute(select(models.Device).filter(models.Device.id == r.target_device_id))
        target = target_res.scalar_one_or_none()
        final.append({"id": r.id, "type": r.relationship_type, "target_name": target.name if target else "Unknown", "source_role": r.source_role, "target_role": r.target_role})
    return final

@router.post("/{device_id}/relationships")
async def add_relationship(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    target_id = int(data['target_id'])
    rel1 = models.DeviceRelationship(source_device_id=device_id, target_device_id=target_id, relationship_type=data['type'], source_role=data.get('source_role'), target_role=data.get('target_role'))
    rel2 = models.DeviceRelationship(source_device_id=target_id, target_device_id=device_id, relationship_type=data['type'], source_role=data.get('target_role'), target_role=data.get('source_role'))
    db.add_all([rel1, rel2])
    await db.commit()
    return {"status": "success"}

@router.delete("/relationships/{rel_id}")
async def delete_relationship(rel_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.DeviceRelationship).filter(models.DeviceRelationship.id == rel_id))
    rel = result.scalar_one_or_none()
    if rel:
        await db.delete(rel)
        await db.commit()
    return {"status": "success"}
