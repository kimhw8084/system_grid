from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/security", tags=["Security Vault"])

@router.get("/vault")
def get_secrets(db: Session = Depends(get_db)):
    return db.query(models.SecretVault).all()

@router.post("/vault")
def add_secret(data: dict, db: Session = Depends(get_db)):
    db_obj = models.SecretVault(**data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
