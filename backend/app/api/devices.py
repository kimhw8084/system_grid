from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/")
async def get_devices(include_decommissioned: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.Device)
    if not include_decommissioned:
        query = query.filter(models.Device.status != "decommissioned")
    
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
async def create_device(data: dict, db: AsyncSession = Depends(get_db)):
    required = ["name", "serial_number", "asset_tag"]
    for field in required:
        if not data.get(field):
            raise HTTPException(status_code=400, detail=f"Field '{field}' is mandatory")

    db_device = models.Device(**data)
    db.add(db_device)
    try:
        await db.commit()
        await db.refresh(db_device)
        log = models.AuditLog(user_id="admin", action="CREATE", table_name="devices", record_id=db_device.id, intent_note=f"Provisioned asset: {db_device.name}")
        db.add(log)
        await db.commit()
        return db_device
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Provisioning failed: Serial number or Asset Tag already exists")

@router.put("/{device_id}")
async def update_device(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device: raise HTTPException(404)
    
    old_vals = {c.name: getattr(db_device, c.name) for c in db_device.__table__.columns}
    for k, v in data.items():
        if hasattr(db_device, k): setattr(db_device, k, v)
    
    log = models.AuditLog(user_id="admin", action="UPDATE", table_name="devices", record_id=db_device.id, intent_note=f"Updated registry details for {db_device.name}", old_values=old_vals, new_values=data)
    db.add(log)
    await db.commit()
    return db_device

@router.post("/bulk-edit")
async def bulk_edit(data: dict, db: AsyncSession = Depends(get_db)):
    # data: { ids: [], updates: {} }
    ids = data.get('ids', [])
    updates = data.get('updates', {})
    if not ids: return {"status": "no-op"}
    
    await db.execute(update(models.Device).where(models.Device.id.in_(ids)).values(**updates))
    log = models.AuditLog(user_id="admin", action="BULK_EDIT", table_name="devices", intent_note=f"Bulk edit performed on {len(ids)} assets")
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.delete("/{device_id}")
async def soft_delete_device(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device: raise HTTPException(404)
    
    db_device.status = "decommissioned"
    log = models.AuditLog(user_id="admin", action="DELETE", table_name="devices", record_id=device_id, intent_note=f"Soft-deleted asset: {db_device.name}")
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.post("/{device_id}/relationships")
async def add_relationship(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    # data: { target_id, type, source_role, target_role, notes }
    target_id = int(data['target_id'])
    
    # Create forward relation
    rel1 = models.DeviceRelationship(
        source_device_id=device_id,
        target_device_id=target_id,
        relationship_type=data['type'],
        source_role=data['source_role'],
        target_role=data['target_role'],
        notes=data.get('notes')
    )
    # Create inverse relation
    rel2 = models.DeviceRelationship(
        source_device_id=target_id,
        target_device_id=device_id,
        relationship_type=data['type'],
        source_role=data['target_role'],
        target_role=data['source_role'],
        notes=data.get('notes')
    )
    db.add_all([rel1, rel2])
    await db.commit()
    return {"status": "success"}

# expansion routers (HW/SW/Secrets) keep same pattern but return dicts for cleaner UX
@router.post("/{device_id}/hardware")
async def add_hardware(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    comp = models.HardwareComponent(device_id=device_id, **data)
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp

@router.put("/hardware/{comp_id}")
async def edit_hardware(comp_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.HardwareComponent).filter(models.HardwareComponent.id == comp_id))
    comp = res.scalar_one_or_none()
    if not comp: raise HTTPException(404)
    for k,v in data.items(): setattr(comp, k, v)
    await db.commit()
    return comp

# ... similar for SW and Secrets
@router.post("/{device_id}/software")
async def add_software(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    sw = models.DeviceSoftware(device_id=device_id, **data)
    db.add(sw)
    await db.commit()
    return sw

@router.put("/software/{sw_id}")
async def edit_software(sw_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.DeviceSoftware).filter(models.DeviceSoftware.id == sw_id))
    sw = res.scalar_one_or_none()
    if not sw: raise HTTPException(404)
    for k,v in data.items(): setattr(sw, k, v)
    await db.commit()
    return sw

@router.post("/{device_id}/secrets")
async def add_secret(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    secret = models.SecretVault(device_id=device_id, **data)
    db.add(secret)
    await db.commit()
    return secret

@router.put("/secrets/{sec_id}")
async def edit_secret(sec_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.SecretVault).filter(models.SecretVault.id == sec_id))
    sec = res.scalar_one_or_none()
    if not sec: raise HTTPException(404)
    for k,v in data.items(): setattr(sec, k, v)
    await db.commit()
    return sec
