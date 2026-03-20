from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/networks", tags=["Network Fabric"])

@router.get("/interfaces", response_model=List[schemas.BaseSchema]) # Simplified for MVP
def get_interfaces(db: Session = Depends(get_db)):
    return db.query(models.NetworkInterface).all()

@router.post("/interfaces")
def create_interface(data: dict, db: Session = Depends(get_db)):
    db_obj = models.NetworkInterface(**data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
