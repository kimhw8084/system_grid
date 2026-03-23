from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..database import get_db
from ..models import models
from typing import List, Optional

router = APIRouter(prefix="/racks", tags=["Racks"])

@router.get("/")
async def get_racks(site_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(models.Rack)
    if site_id and site_id != "null" and site_id != "":
        query = query.join(models.Room).filter(models.Room.site_id == int(site_id))
    
    result = await db.execute(query)
    racks = result.scalars().all()
    
    final_result = []
    for rack in racks:
        # Get devices in this rack
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
                    "status": d.status if d.status else 'active',
                    "size_u": loc.size_u,
                    "start_u": loc.start_unit
                })
        
        final_result.append({
            "id": rack.id,
            "name": rack.name,
            "total_u": rack.total_u_height,
            "max_power_kw": rack.max_power_kw or 8.0,
            "room_id": rack.room_id,
            "devices": dev_list
        })
    return final_result

@router.post("/")
async def create_rack(data: dict, db: AsyncSession = Depends(get_db)):
    site_id = data.get('site_id')
    if not site_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Site selection mandatory")
    
    room_res = await db.execute(select(models.Room).filter(models.Room.site_id == int(site_id)))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Site has no rooms")

    rack = models.Rack(
        name=data.get('name', 'New Rack'), 
        total_u_height=data.get('total_u', 42),
        max_power_kw=data.get('max_power_kw', 8.0),
        room_id=room.id
    )
    db.add(rack)
    await db.commit()
    await db.refresh(rack)
    
    log = models.AuditLog(user_id="admin", action="CREATE", table_name="racks", record_id=rack.id, intent_note=f"Provisioned rack {rack.name}")
    db.add(log)
    await db.commit()
    return rack

@router.put("/{rack_id}")
async def update_rack(rack_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Rack).filter(models.Rack.id == rack_id))
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rack not found")
    
    if 'name' in data: rack.name = data['name']
    if 'max_power_kw' in data: rack.max_power_kw = data['max_power_kw']
    
    if 'new_site_id' in data:
        room_res = await db.execute(select(models.Room).filter(models.Room.site_id == int(data['new_site_id'])))
        new_room = room_res.scalar_one_or_none()
        if new_room:
            rack.room_id = new_room.id
    
    await db.commit()
    return rack

@router.delete("/{rack_id}")
async def delete_rack(rack_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Rack).filter(models.Rack.id == rack_id))
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rack not found")
    
    await db.delete(rack)
    log = models.AuditLog(user_id="admin", action="DELETE", table_name="racks", record_id=rack_id, intent_note=f"Decommissioned rack {rack.name}")
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.post("/{rack_id}/mount")
async def mount_device(rack_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    loc_result = await db.execute(select(models.DeviceLocation).filter(models.DeviceLocation.rack_id == rack_id))
    existing = loc_result.scalars().all()
    
    for loc in existing:
        if not (data['start_u'] + data['size_u'] <= loc.start_unit or data['start_u'] >= loc.start_unit + loc.size_u):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Collision detected")
            
    loc = models.DeviceLocation(
        rack_id=rack_id,
        device_id=data['device_id'],
        start_unit=data['start_u'],
        size_u=data['size_u']
    )
    db.add(loc)
    log = models.AuditLog(user_id="admin", action="MOUNT", table_name="devices", record_id=data['device_id'], intent_note=f"Mounted device in rack ID {rack_id}")
    db.add(log)
    await db.commit()
    return {"status": "success"}
