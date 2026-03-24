from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, or_
from datetime import datetime
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/devices", tags=["Devices"])

def parse_iso_date(val):
    if not val: return None
    try: return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except: return None

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    return {k: v for k, v in data.items() if k in valid_keys}

@router.get("/")
async def get_devices(include_decommissioned: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.Device)
    if not include_decommissioned:
        query = query.filter(models.Device.status != "Decommissioned")
    result = await db.execute(query)
    devices = result.scalars().all()
    
    final_devices = []
    for d in devices:
        loc_res = await db.execute(select(models.DeviceLocation).filter(models.DeviceLocation.device_id == d.id))
        loc = loc_res.scalar_one_or_none()
        rack_name, site_name, u_start = None, "Unplaced", None
        if loc:
            rack_res = await db.execute(select(models.Rack).filter(models.Rack.id == loc.rack_id))
            rack = rack_res.scalar_one_or_none()
            if rack:
                rack_name = rack.name; u_start = loc.start_unit
                if rack.room_id:
                    room_res = await db.execute(select(models.Room).filter(models.Room.id == rack.room_id))
                    room = room_res.scalar_one_or_none()
                    if room:
                        site_res = await db.execute(select(models.Site).filter(models.Site.id == room.site_id))
                        site = site_res.scalar_one_or_none()
                        if site: site_name = site.name

        device_dict = {c.name: getattr(d, c.name) for c in d.__table__.columns}
        device_dict.update({"rack_name": rack_name, "site_name": site_name, "u_start": u_start})
        final_devices.append(device_dict)
    return final_devices

@router.post("/")
async def create_device(data: dict, force: bool = False, db: AsyncSession = Depends(get_db)):
    required = ["name", "system", "os_name", "owner", "business_unit"]
    for f in required:
        if not data.get(f): raise HTTPException(400, f"Field {f} is mandatory")
    
    dup_res = await db.execute(select(models.Device).filter(models.Device.name == data["name"]))
    existing = dup_res.scalars().all()
    if existing:
        active = [e for e in existing if e.status != "Decommissioned"]
        if active: raise HTTPException(409, "ACTIVE_DUPLICATE")
        if not force: raise HTTPException(409, "WARN_DECOMMISSIONED")

    clean_data = filter_valid_columns(models.Device, data)
    for date_f in ["purchase_date", "install_date", "warranty_end", "eol_date"]:
        if date_f in clean_data: clean_data[date_f] = parse_iso_date(clean_data[date_f])
    
    db_device = models.Device(**clean_data)
    db.add(db_device); await db.commit(); await db.refresh(db_device)
    return db_device

@router.put("/{device_id}")
async def update_device(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Device).filter(models.Device.id == device_id))
    db_device = result.scalar_one_or_none()
    if not db_device: raise HTTPException(404)
    
    clean_data = filter_valid_columns(models.Device, data)
    for k, v in clean_data.items():
        if k in ["purchase_date", "install_date", "warranty_end", "eol_date"]:
            setattr(db_device, k, parse_iso_date(v))
        else:
            setattr(db_device, k, v)
    await db.commit(); return db_device

@router.get("/{device_id}/hardware")
async def get_hardware(device_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.HardwareComponent).filter(models.HardwareComponent.device_id == device_id))
    return res.scalars().all()

@router.post("/{device_id}/hardware")
async def add_hardware(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    clean = filter_valid_columns(models.HardwareComponent, data)
    comp = models.HardwareComponent(device_id=device_id, **clean)
    db.add(comp); await db.commit(); return comp

@router.get("/{device_id}/secrets")
async def get_secrets(device_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.SecretVault).filter(models.SecretVault.device_id == device_id))
    return res.scalars().all()

@router.post("/{device_id}/secrets")
async def add_secret(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    clean = filter_valid_columns(models.SecretVault, data)
    sec = models.SecretVault(device_id=device_id, **clean)
    db.add(sec); await db.commit(); return sec

@router.delete("/{resource}/{id}")
async def delete_resource(resource: str, id: int, db: AsyncSession = Depends(get_db)):
    model_map = {"hardware": models.HardwareComponent, "software": models.DeviceSoftware, "secrets": models.SecretVault, "relationships": models.DeviceRelationship}
    if resource not in model_map: raise HTTPException(400)
    await db.execute(delete(model_map[resource]).where(model_map[resource].id == id))
    await db.commit(); return {"status": "success"}
