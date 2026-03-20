from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models
from typing import List, Optional

router = APIRouter(prefix="/racks", tags=["Racks"])

@router.get("/")
def get_racks(site_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Rack)
    if site_id and site_id != "null" and site_id != "":
        query = query.join(models.Room).filter(models.Room.site_id == int(site_id))
    
    racks = query.all()
    result = []
    for rack in racks:
        locs = db.query(models.DeviceLocation).filter(models.DeviceLocation.rack_id == rack.id).all()
        dev_list = []
        for loc in locs:
            d = db.query(models.Device).filter(models.Device.id == loc.device_id).first()
            if d:
                dev_list.append({
                    "id": d.id,
                    "name": d.name,
                    "status": d.status.value if d.status else 'active',
                    "size_u": loc.size_u,
                    "start_u": loc.start_unit
                })
        result.append({
            "id": rack.id,
            "name": rack.name,
            "total_u": rack.total_u_height,
            "max_power_kw": rack.max_power_kw or 8.0,
            "room_id": rack.room_id,
            "devices": dev_list
        })
    return result

@router.post("/")
def create_rack(data: dict, db: Session = Depends(get_db)):
    site_id = data.get('site_id')
    if not site_id: raise HTTPException(400, "Site selection mandatory for new rack")
    
    # Get first room of this site
    room = db.query(models.Room).filter(models.Room.site_id == site_id).first()
    if not room: raise HTTPException(400, "Site has no floor/room")

    rack = models.Rack(
        name=data.get('name', 'New Rack'), 
        total_u_height=data.get('total_u', 42),
        max_power_kw=data.get('max_power_kw', 8.0),
        room_id=room.id
    )
    db.add(rack)
    db.commit()
    db.refresh(rack)
    
    # Audit
    log = models.AuditLog(user_id="admin", action="CREATE", table_name="racks", record_id=rack.id, intent_note=f"Provisioned rack {rack.name}")
    db.add(log)
    db.commit()
    
    return rack

@router.put("/{rack_id}")
def update_rack(rack_id: int, data: dict, db: Session = Depends(get_db)):
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if not rack: raise HTTPException(404)
    
    if 'name' in data: rack.name = data['name']
    if 'max_power_kw' in data: rack.max_power_kw = data['max_power_kw']
    
    # Handle Site Transfer
    if 'new_site_id' in data:
        new_room = db.query(models.Room).filter(models.Room.site_id == int(data['new_site_id'])).first()
        if new_room:
            rack.room_id = new_room.id
    
    db.commit()
    return rack

@router.delete("/{rack_id}")
def delete_rack(rack_id: int, db: Session = Depends(get_db)):
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if not rack: raise HTTPException(404)
    db.delete(rack)
    
    # Audit
    log = models.AuditLog(user_id="admin", action="DELETE", table_name="racks", record_id=rack_id, intent_note=f"Decommissioned rack {rack.name}")
    db.add(log)
    db.commit()
    
    return {"status": "success"}

# --- MOUNTING ENGINE ---
@router.post("/{rack_id}/mount")
def mount_device(rack_id: int, data: dict, db: Session = Depends(get_db)):
    # data: { device_id, start_u, size_u }
    # Check collision
    existing = db.query(models.DeviceLocation).filter(models.DeviceLocation.rack_id == rack_id).all()
    for loc in existing:
        if not (data['start_u'] + data['size_u'] <= loc.start_unit or data['start_u'] >= loc.start_unit + loc.size_u):
            raise HTTPException(400, "Collision detected at requested U slot")
            
    loc = models.DeviceLocation(
        rack_id=rack_id,
        device_id=data['device_id'],
        start_unit=data['start_u'],
        size_u=data['size_u']
    )
    db.add(loc)
    db.commit()
    
    # Audit
    log = models.AuditLog(user_id="admin", action="MOUNT", table_name="devices", record_id=data['device_id'], intent_note=f"Mounted device in rack ID {rack_id}")
    db.add(log)
    db.commit()
    
    return {"status": "success"}
