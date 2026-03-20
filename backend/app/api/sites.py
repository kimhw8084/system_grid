from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.get("/")
def get_sites(db: Session = Depends(get_db)):
    return db.query(models.Site).all()

@router.post("/")
def create_site(data: dict, db: Session = Depends(get_db)):
    site = models.Site(name=data.get('name', 'New Site'), address=data.get('address', ''))
    db.add(site)
    db.commit()
    db.refresh(site)
    return site

@router.put("/{site_id}")
def update_site(site_id: int, data: dict, db: Session = Depends(get_db)):
    site = db.query(models.Site).filter(models.Site.id == site_id).first()
    if not site: raise HTTPException(404)
    if 'name' in data: site.name = data['name']
    db.commit()
    return site

@router.delete("/{site_id}")
def delete_site(site_id: int, db: Session = Depends(get_db)):
    site = db.query(models.Site).filter(models.Site.id == site_id).first()
    if not site: raise HTTPException(404)
    db.delete(site)
    db.commit()
    return {"status": "success"}
