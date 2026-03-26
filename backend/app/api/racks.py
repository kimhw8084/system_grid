from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from ..database import get_db
from ..models import models
from typing import List, Optional

router = APIRouter(prefix="/racks", tags=["Racks"])

@router.get("/")
async def get_racks(site_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    if site_id == "missing":
        query = select(models.Rack).filter(models.Rack.room_id == None)
    elif site_id and site_id != "null" and site_id != "":
        query = select(models.Rack).join(models.Room).filter(models.Room.site_id == int(site_id))
    else:
        query = select(models.Rack)
    
    result = await db.execute(query)
    racks = result.scalars().all()
    
    final_result = []
    for rack in racks:
        loc_result = await db.execute(select(models.DeviceLocation).filter(models.DeviceLocation.rack_id == rack.id))
        locs = loc_result.scalars().all()
        
        dev_list = []
        for loc in locs:
            dev_res = await db.execute(select(models.Device).filter(models.Device.id == loc.device_id))
            d = dev_res.scalar_one_or_none()
            if d:
                dev_list.append({
                    "id": d.id,
                    "name": d.name,
                    "status": d.status,
                    "type": d.type,
                    "size_u": loc.size_u,
                    "start_u": loc.start_unit
                })
        
        site_name = "Missing Site"
        if rack.room_id:
            room_res = await db.execute(select(models.Room).filter(models.Room.id == rack.room_id))
            room = room_res.scalar_one_or_none()
            if room:
                site_res = await db.execute(select(models.Site).filter(models.Site.id == room.site_id))
                site = site_res.scalar_one_or_none()
                if site:
                    site_name = site.name

        final_result.append({
            "id": rack.id,
            "name": rack.name,
            "total_u": rack.total_u_height,
            "max_power_kw": rack.max_power_kw or 8.0,
            "room_id": rack.room_id,
            "site_name": site_name,
            "devices": dev_list
        })
    return final_result

@router.post("/")
async def create_rack(data: dict, db: AsyncSession = Depends(get_db)):
    site_id = data.get('site_id')
    if not site_id:
        raise HTTPException(status_code=400, detail="Site selection mandatory")
    
    name = data.get('name', 'New Rack')
    # Check for duplicate name
    dup_result = await db.execute(select(models.Rack).filter(models.Rack.name == name))
    if dup_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RACK_NAME_DUPLICATE")

    room_res = await db.execute(select(models.Room).filter(models.Room.site_id == int(site_id)))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=400, detail="Site has no rooms")

    rack = models.Rack(
        name=name, 
        total_u_height=data.get('total_u', 42),
        max_power_kw=data.get('max_power_kw', 8.0),
        room_id=room.id
    )
    db.add(rack)
    await db.commit()
    await db.refresh(rack)
    
    log = models.AuditLog(
        user_id="admin", 
        action="CREATE", 
        target_table="racks", 
        target_id=str(rack.id), 
        description=f"Provisioned rack {rack.name} at site ID {site_id}"
    )
    db.add(log)
    await db.commit()
    return rack

@router.put("/{rack_id}")
async def update_rack(rack_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Rack).filter(models.Rack.id == rack_id))
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")
    
    if 'name' in data and data['name'] != rack.name:
        # Check for duplicate name in ANOTHER rack
        dup_result = await db.execute(select(models.Rack).filter(models.Rack.name == data['name'], models.Rack.id != rack_id))
        if dup_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RACK_NAME_DUPLICATE")
        rack.name = data['name']
        
    if 'max_power_kw' in data: rack.max_power_kw = data['max_power_kw']
    if 'total_u' in data: rack.total_u_height = data['total_u']
    
    if 'new_site_id' in data:
        if data['new_site_id'] is None:
            rack.room_id = None
        else:
            room_res = await db.execute(select(models.Room).filter(models.Room.site_id == int(data['new_site_id'])))
            new_room = room_res.scalar_one_or_none()
            if new_room:
                rack.room_id = new_room.id
    
    log = models.AuditLog(
        user_id="admin", 
        action="UPDATE", 
        target_table="racks", 
        target_id=str(rack.id), 
        description=f"Updated rack {rack.name} configuration"
    )
    db.add(log)
    await db.commit()
    return rack

@router.delete("/{rack_id}")
async def delete_rack(rack_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Rack).filter(models.Rack.id == rack_id))
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")
    
    name = rack.name
    await db.delete(rack)
    log = models.AuditLog(
        user_id="admin", 
        action="DELETE", 
        target_table="racks", 
        target_id=str(rack_id), 
        description=f"Decommissioned rack {name}"
    )
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.post("/{rack_id}/mount")
async def mount_device(rack_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    device_id = int(data['device_id'])
    
    loc_res = await db.execute(select(models.DeviceLocation).filter(models.DeviceLocation.device_id == device_id))
    existing_loc = loc_res.scalar_one_or_none()
    
    if existing_loc and not data.get('relocate'):
        rack_res = await db.execute(select(models.Rack).filter(models.Rack.id == existing_loc.rack_id))
        r = rack_res.scalar_one_or_none()
        raise HTTPException(status_code=409, detail=f"Device already mounted in {r.name if r else 'another rack'} at U{existing_loc.start_unit}")

    rack_locs_res = await db.execute(select(models.DeviceLocation).filter(models.DeviceLocation.rack_id == rack_id))
    rack_locs = rack_locs_res.scalars().all()
    
    new_start = int(data['start_u'])
    new_end = new_start + int(data['size_u'])
    
    for loc in rack_locs:
        if loc.device_id == device_id: continue
        loc_end = loc.start_unit + loc.size_u
        if not (new_end <= loc.start_unit or new_start >= loc_end):
            dev_res = await db.execute(select(models.Device).filter(models.Device.id == loc.device_id))
            d = dev_res.scalar_one_or_none()
            raise HTTPException(status_code=400, detail=f"Collision with {d.name if d else 'existing device'} at U{loc.start_unit}")

    if existing_loc:
        await db.delete(existing_loc)
        
    loc = models.DeviceLocation(
        rack_id=rack_id,
        device_id=device_id,
        start_unit=new_start,
        size_u=int(data['size_u'])
    )
    db.add(loc)
    
    log = models.AuditLog(
        user_id="admin", 
        action="MOUNT", 
        target_table="devices", 
        target_id=str(device_id), 
        description=f"Mounted/Relocated device in rack ID {rack_id}"
    )
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.delete("/mount/{device_id}")
async def unmount_device(device_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.DeviceLocation).filter(models.DeviceLocation.device_id == device_id))
    loc = result.scalar_one_or_none()
    if loc:
        await db.delete(loc)
        log = models.AuditLog(
            user_id="admin", 
            action="UNMOUNT", 
            target_table="devices", 
            target_id=str(device_id), 
            description="Removed device from rack"
        )
        db.add(log)
        await db.commit()
    return {"status": "success"}
