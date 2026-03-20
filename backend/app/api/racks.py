from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models
from typing import List

router = APIRouter(prefix="/racks", tags=["Racks"])

@router.get("/")
def get_racks(db: Session = Depends(get_db)):
    racks = db.query(models.Rack).all()
    result = []
    for rack in racks:
        # Get devices in this rack
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
            "devices": dev_list
        })
    return result

@router.post("/")
def create_rack(data: dict, db: Session = Depends(get_db)):
    rack = models.Rack(
        name=data.get('name', 'New Rack'), 
        total_u_height=data.get('total_u', 42),
        room_id=data.get('room_id')
    )
    db.add(rack)
    db.commit()
    db.refresh(rack)
    
    # Audit log
    log = models.AuditLog(user_id="admin", action="CREATE", table_name="racks", record_id=rack.id, intent_note="Provisioned rack")
    db.add(log)
    db.commit()
    return {"status": "success", "id": rack.id}

@router.put("/{rack_id}")
def update_rack(rack_id: int, data: dict, db: Session = Depends(get_db)):
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if not rack:
        raise HTTPException(404)
    if 'name' in data: rack.name = data['name']
    db.commit()
    return rack

@router.delete("/{rack_id}")
def delete_rack(rack_id: int, db: Session = Depends(get_db)):
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if not rack:
        raise HTTPException(404)
    db.delete(rack)
    # Audit log
    log = models.AuditLog(user_id="admin", action="DELETE", table_name="racks", record_id=rack_id, intent_note="Decommissioned rack")
    db.add(log)
    db.commit()
    return {"status": "success"}
