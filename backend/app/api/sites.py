from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.get("/")
async def get_sites(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Site))
    sites = result.scalars().all()
    return [{"id": s.id, "name": s.name, "address": s.address} for s in sites]

@router.post("/")
async def create_site(data: dict, db: AsyncSession = Depends(get_db)):
    name = data.get('name', 'New Site')
    # Check for duplicate name
    existing_result = await db.execute(select(models.Site).filter(models.Site.name == name))
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SITE_NAME_DUPLICATE")

    site = models.Site(name=name, address=data.get('address', ''))
    db.add(site)
    try:
        await db.commit()
        await db.refresh(site)
        
        # Audit log
        log = models.AuditLog(
            user_id="admin", 
            action="CREATE", 
            target_table="sites", 
            target_id=str(site.id), 
            description=f"Established new site: {site.name}"
        )
        db.add(log)
        
        room = models.Room(name="Main Floor", site_id=site.id)
        db.add(room)
        
        await db.commit()
        return {"id": site.id, "name": site.name, "address": site.address}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{site_id}")
async def update_site(site_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Site).filter(models.Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    
    if 'name' in data and data['name'] != site.name:
        # Check if the new name is already taken by ANOTHER site
        dup_result = await db.execute(select(models.Site).filter(models.Site.name == data['name'], models.Site.id != site_id))
        if dup_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SITE_NAME_DUPLICATE")
        site.name = data['name']
        
    if 'address' in data: site.address = data['address']
    
    log = models.AuditLog(
        user_id="admin", action="UPDATE", target_table="sites", 
        target_id=str(site.id), description=f"Updated site: {site.name}"
    )
    db.add(log)
    await db.commit()
    return {"id": site.id, "name": site.name}

@router.delete("/{site_id}")
async def delete_site(site_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Site).filter(models.Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    
    room_result = await db.execute(select(models.Room).filter(models.Room.site_id == site_id))
    rooms = room_result.scalars().all()
    for room in rooms:
        rack_result = await db.execute(select(models.Rack).filter(models.Rack.room_id == room.id))
        racks = rack_result.scalars().all()
        for rack in racks:
            rack.room_id = None
            
    await db.delete(site)
    log = models.AuditLog(
        user_id="admin", action="DELETE", target_table="sites", 
        target_id=str(site_id), description=f"Decommissioned site: {site.name}"
    )
    db.add(log)
    await db.commit()
    return {"status": "success"}
