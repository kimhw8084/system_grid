from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models
from typing import List, Optional

router = APIRouter(prefix="/racks", tags=["Racks"])

@router.get("/")
def get_racks(site_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Rack)
    # Handle empty string or null site_id from frontend
    if site_id and site_id != "" and site_id != "null":
        try:
            s_id = int(site_id)
            query = query.join(models.Room).filter(models.Room.site_id == s_id)
        except ValueError:
            pass
    
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
    room_id = data.get('room_id')
    if not room_id:
        room = db.query(models.Room).first()
        if not room:
            site = models.Site(name="Default Site", address="Default Address")
            db.add(site)
            db.commit()
            db.refresh(site)
            room = models.Room(name="Default Room", site_id=site.id)
            db.add(room)
            db.commit()
            db.refresh(room)
        room_id = room.id

    rack = models.Rack(
        name=data.get('name', 'New Rack'), 
        total_u_height=data.get('total_u', 42),
        max_power_kw=data.get('max_power_kw', 8.0),
        room_id=room_id
    )
    db.add(rack)
    db.commit()
    db.refresh(rack)
    return rack

@router.put("/{rack_id}")
def update_rack(rack_id: int, data: dict, db: Session = Depends(get_db)):
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if not rack: raise HTTPException(404)
    if 'name' in data: rack.name = data['name']
    if 'max_power_kw' in data: rack.max_power_kw = data['max_power_kw']
    if 'room_id' in data: rack.room_id = data['room_id']
    db.commit()
    return rack

@router.delete("/{rack_id}")
def delete_rack(rack_id: int, db: Session = Depends(get_db)):
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if not rack: raise HTTPException(404)
    db.delete(rack)
    db.commit()
    return {"status": "success"}
