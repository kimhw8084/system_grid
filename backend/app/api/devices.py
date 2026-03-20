from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/")
def get_devices(db: Session = Depends(get_db)):
    # Join with system if possible, but keep it simple for MVP
    return db.query(models.Device).all()

@router.post("/")
def create_device(data: dict, db: Session = Depends(get_db)):
    db_device = models.Device(**data)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.put("/{device_id}")
def update_device(device_id: int, data: dict, db: Session = Depends(get_db)):
    db_device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not db_device: raise HTTPException(404)
    for k, v in data.items():
        setattr(db_device, k, v)
    db.commit()
    return db_device

@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    db_device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not db_device: raise HTTPException(404)
    db.delete(db_device)
    db.commit()
    return {"status": "success"}

# --- EXPANSIONS ---

@router.get("/{device_id}/hardware")
def get_hardware(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.HardwareComponent).filter(models.HardwareComponent.device_id == device_id).all()

@router.post("/{device_id}/hardware")
def add_hardware(device_id: int, data: dict, db: Session = Depends(get_db)):
    comp = models.HardwareComponent(device_id=device_id, **data)
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp

@router.delete("/hardware/{comp_id}")
def delete_hardware(comp_id: int, db: Session = Depends(get_db)):
    comp = db.query(models.HardwareComponent).filter(models.HardwareComponent.id == comp_id).first()
    if comp: 
        db.delete(comp)
        db.commit()
    return {"status": "success"}

@router.get("/{device_id}/secrets")
def get_secrets(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.SecretVault).filter(models.SecretVault.device_id == device_id).all()

@router.post("/{device_id}/secrets")
def add_secret(device_id: int, data: dict, db: Session = Depends(get_db)):
    secret = models.SecretVault(device_id=device_id, **data)
    db.add(secret)
    db.commit()
    db.refresh(secret)
    return secret
