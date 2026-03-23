from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.get("/")
def get_sites(db: Session = Depends(get_db)):
    sites = db.query(models.Site).all()
    return [{"id": s.id, "name": s.name, "address": s.address} for s in sites]

@router.post("/")
def create_site(data: dict, db: Session = Depends(get_db)):
    site = models.Site(name=data.get('name', 'New Site'), address=data.get('address', ''))
    db.add(site)
    db.commit()
    db.refresh(site)
    
    # Audit log
    log = models.AuditLog(user_id="admin", action="CREATE", table_name="sites", record_id=site.id, intent_note=f"Established new site: {site.name}")
    db.add(log)
    db.commit()
    
    # Create a default room for this site so racks can be added immediately
    room = models.Room(name="Main Floor", site_id=site.id)
    db.add(room)
    db.commit()
    
    return {"id": site.id, "name": site.name, "address": site.address}

@router.put("/{site_id}")
def update_site(site_id: int, data: dict, db: Session = Depends(get_db)):
    site = db.query(models.Site).filter(models.Site.id == site_id).first()
    if not site: raise HTTPException(404)
    if 'name' in data: site.name = data['name']
    db.commit()
    return {"id": site.id, "name": site.name}

@router.delete("/{site_id}")
def delete_site(site_id: int, db: Session = Depends(get_db)):
    site = db.query(models.Site).filter(models.Site.id == site_id).first()
    if not site: raise HTTPException(404)
    db.delete(site)
    
    # Audit log
    log = models.AuditLog(user_id="admin", action="DELETE", table_name="sites", record_id=site_id, intent_note=f"Decommissioned site: {site.name}")
    db.add(log)
    db.commit()
    
    return {"status": "success"}
