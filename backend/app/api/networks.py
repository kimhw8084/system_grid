from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/networks", tags=["Network Fabric"])

@router.get("/interfaces")
def get_interfaces(db: Session = Depends(get_db)):
    return db.query(models.NetworkInterface).all()

@router.post("/interfaces")
def create_interface(data: dict, db: Session = Depends(get_db)):
    db_obj = models.NetworkInterface(**data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/connections")
def get_connections(db: Session = Depends(get_db)):
    # Join with device names for better visualization
    conns = db.query(models.PortConnection).all()
    result = []
    for c in conns:
        dev_a = db.query(models.Device).filter(models.Device.id == c.device_a_id).first()
        dev_b = db.query(models.Device).filter(models.Device.id == c.device_b_id).first()
        result.append({
            "id": c.id,
            "server_a": dev_a.name if dev_a else "Unknown",
            "port_a": c.port_a,
            "server_b": dev_b.name if dev_b else "Unknown",
            "port_b": c.port_b,
            "speed": "10G", # Default for now
            "purpose": c.purpose
        })
    return result

@router.post("/connections")
def create_connection(data: dict, db: Session = Depends(get_db)):
    # data: { device_a_id, port_a, device_b_id, port_b, purpose }
    conn = models.PortConnection(**data)
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn

@router.delete("/connections/{conn_id}")
def delete_connection(conn_id: int, db: Session = Depends(get_db)):
    conn = db.query(models.PortConnection).filter(models.PortConnection.id == conn_id).first()
    if conn:
        db.delete(conn)
        db.commit()
    return {"status": "success"}
