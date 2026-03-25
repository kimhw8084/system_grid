from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, or_
from datetime import datetime
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/devices", tags=["Devices"])

def parse_iso_date(val):
    if not val: return None
    if isinstance(val, datetime): return val
    try: return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except: return None

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    return {k: v for k, v in data.items() if k in valid_keys}

@router.get("/")
async def get_devices(include_decommissioned: bool = False, include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.Device)
    if include_deleted:
        query = query.filter(models.Device.is_deleted == True)
    else:
        query = query.filter(models.Device.is_deleted == False)
        if not include_decommissioned:
            query = query.filter(models.Device.status != "Decommissioned")
        else:
            query = query.filter(models.Device.status == "Decommissioned")
    
    result = await db.execute(query)
    devices = result.scalars().all()
    
    final_devices = []
    for d in devices:
        loc_res = await db.execute(select(models.DeviceLocation).filter(models.DeviceLocation.device_id == d.id))
        loc = loc_res.scalars().first()
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
    required = ["name", "system"]
    for f in required:
        if not data.get(f): raise HTTPException(400, f"Field {f} is mandatory")
    
    dup_res = await db.execute(select(models.Device).filter(models.Device.name == data["name"], models.Device.is_deleted == False))
    existing = dup_res.scalars().all()
    if existing:
        active = [e for e in existing if e.status != "Decommissioned"]
        if active: raise HTTPException(409, "DUPLICATE_HOSTNAME_ACTIVE")
        if not force: raise HTTPException(409, "WARN_EXISTING_DECOMMISSIONED")

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
    # Exclude read-only fields
    for ro_field in ["id", "created_at", "updated_at", "created_by_user_id"]:
        if ro_field in clean_data:
            del clean_data[ro_field]

    for k, v in clean_data.items():
        if k in ["purchase_date", "install_date", "warranty_end", "eol_date"]:
            # Ensure we only pass datetime objects or None to SQLAlchemy for DateTime columns
            setattr(db_device, k, parse_iso_date(v))
        elif k == "metadata_json" and isinstance(v, str):
            try:
                import json
                setattr(db_device, k, json.loads(v))
            except:
                setattr(db_device, k, v)
        else:
            setattr(db_device, k, v)
    await db.commit(); await db.refresh(db_device); return db_device

@router.post("/bulk-action")
async def bulk_action(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    payload = data.get("payload", {})
    if not ids: return {"status": "no_op"}
    
    if action == "delete":
        await db.execute(update(models.Device).where(models.Device.id.in_(ids)).values(is_deleted=True))
    elif action == "purge":
        await db.execute(delete(models.Device).where(models.Device.id.in_(ids)))
    elif action == "restore":
        # Conflicts check before restore
        res = await db.execute(select(models.Device).where(models.Device.id.in_(ids)))
        to_restore = res.scalars().all()
        
        restored_ids, conflict_ids = [], []
        for d in to_restore:
            # Check if name conflict exists in active inventory
            dup_res = await db.execute(select(models.Device).filter(models.Device.name == d.name, models.Device.is_deleted == False, models.Device.id != d.id))
            if dup_res.scalars().first():
                conflict_ids.append(d.id)
            else:
                d.is_deleted = False
                restored_ids.append(d.id)
        
        await db.commit()
        return {"status": "success", "restored": restored_ids, "conflicts": conflict_ids}
    elif action == "update":
        clean_update = filter_valid_columns(models.Device, payload)
        if clean_update:
            await db.execute(update(models.Device).where(models.Device.id.in_(ids)).values(**clean_update))
    
    await db.commit()
    return {"status": "success"}

@router.get("/{device_id}/hardware")
async def get_hardware(device_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.HardwareComponent).filter(models.HardwareComponent.device_id == device_id))
    return res.scalars().all()

@router.post("/{device_id}/hardware")
async def add_hardware(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    # Audit: Ensure data is not empty
    if not data or not any(data.values()): raise HTTPException(400, "Empty hardware data")
    clean = filter_valid_columns(models.HardwareComponent, data)
    comp = models.HardwareComponent(device_id=device_id, **clean)
    db.add(comp); await db.commit(); return comp

@router.get("/{device_id}/secrets")
async def get_secrets(device_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.SecretVault).filter(models.SecretVault.device_id == device_id))
    return res.scalars().all()

@router.post("/{device_id}/secrets")
async def add_secret(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    if not data or not data.get("secret_type"): raise HTTPException(400, "Secret type required")
    clean = filter_valid_columns(models.SecretVault, data)
    sec = models.SecretVault(device_id=device_id, **clean)
    db.add(sec); await db.commit(); return sec

@router.get("/{device_id}/relationships")
async def get_relationships(device_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.DeviceRelationship).filter(models.DeviceRelationship.source_device_id == device_id))
    return res.scalars().all()

@router.post("/{device_id}/relationships")
async def add_relationship(device_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    target_id = data.get("target_device_id")
    if not target_id: raise HTTPException(400, "Target device ID required")
    if int(target_id) == device_id: raise HTTPException(400, "Cannot link server to itself")
    clean = filter_valid_columns(models.DeviceRelationship, data)
    rel = models.DeviceRelationship(source_device_id=device_id, **clean)
    db.add(rel); await db.commit(); return rel

@router.delete("/{resource}/{id}")
async def delete_resource(resource: str, id: int, db: AsyncSession = Depends(get_db)):
    model_map = {"hardware": models.HardwareComponent, "software": models.DeviceSoftware, "secrets": models.SecretVault, "relationships": models.DeviceRelationship}
    if resource not in model_map: raise HTTPException(400)
    await db.execute(delete(model_map[resource]).where(model_map[resource].id == id))
    await db.commit(); return {"status": "success"}

@router.post("/{resource}/{id}")
async def update_resource(resource: str, id: int, data: dict, db: AsyncSession = Depends(get_db)):
    model_map = {"hardware": models.HardwareComponent, "software": models.DeviceSoftware, "secrets": models.SecretVault, "relationships": models.DeviceRelationship}
    if resource not in model_map: raise HTTPException(400)
    
    res = await db.execute(select(model_map[resource]).filter(model_map[resource].id == id))
    item = res.scalar_one_or_none()
    if not item: raise HTTPException(404)
    
    clean = filter_valid_columns(model_map[resource], data)
    for k, v in clean.items():
        if k != "id": setattr(item, k, v)
    
    await db.commit(); return item
