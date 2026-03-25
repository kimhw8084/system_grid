from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/options")
async def get_options(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption))
    return result.scalars().all()

@router.post("/options")
async def create_option(data: dict, db: AsyncSession = Depends(get_db)):
    opt = models.SettingOption(**data)
    db.add(opt)
    await db.commit()
    await db.refresh(opt)
    return opt

@router.put("/options/{opt_id}")
async def update_option(opt_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption).filter(models.SettingOption.id == opt_id))
    opt = result.scalar_one_or_none()
    if not opt: raise HTTPException(404, "Option not found")
    
    old_value = opt.value
    new_value = data.get('value', opt.value)
    new_label = data.get('label', opt.label)
    
    # Update associated models if value changed
    if old_value != new_value:
        if opt.category == "Status":
            await db.execute(update(models.Device).where(models.Device.status == old_value).values(status=new_value))
            await db.execute(update(models.LogicalService).where(models.LogicalService.status == old_value).values(status=new_value))
            await db.execute(update(models.MaintenanceWindow).where(models.MaintenanceWindow.status == old_value).values(status=new_value))
        elif opt.category == "Environment":
            await db.execute(update(models.Device).where(models.Device.environment == old_value).values(environment=new_value))
            await db.execute(update(models.LogicalService).where(models.LogicalService.environment == old_value).values(environment=new_value))
        elif opt.category == "DeviceType":
            await db.execute(update(models.Device).where(models.Device.type == old_value).values(type=new_value))
        elif opt.category == "LogicalSystem":
            await db.execute(update(models.Device).where(models.Device.system == old_value).values(system=new_value))
    
    opt.value = new_value
    opt.label = new_label
    
    await db.commit()
    await db.refresh(opt)
    return opt

@router.delete("/options/{opt_id}")
async def delete_option(opt_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption).filter(models.SettingOption.id == opt_id))
    opt = result.scalar_one_or_none()
    if not opt: raise HTTPException(404, "Option not found")
    
    # Check usage
    in_use = False
    if opt.category == "Status":
        res = await db.execute(select(models.Device).filter(models.Device.status == opt.value))
        if res.scalars().first(): in_use = True
        res = await db.execute(select(models.LogicalService).filter(models.LogicalService.status == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "Environment":
        res = await db.execute(select(models.Device).filter(models.Device.environment == opt.value))
        if res.scalars().first(): in_use = True
        res = await db.execute(select(models.LogicalService).filter(models.LogicalService.environment == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "DeviceType":
        res = await db.execute(select(models.Device).filter(models.Device.type == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "LogicalSystem":
        res = await db.execute(select(models.Device).filter(models.Device.system == opt.value))
        if res.scalars().first(): in_use = True
        
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete option that is currently in use")
        
    await db.delete(opt)
    await db.commit()
    return {"status": "success"}

@router.get("/ui")
async def get_ui_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == "UISettings"))
    opts = res.scalars().all()
    
    settings = {
        "status_badged": True,
        "status_colors": {
            "Active": "#10b981",
            "Maintenance": "#f59e0b",
            "Decommissioned": "#f43f5e",
            "Planned": "#3b82f6"
        }
    }
    
    for o in opts:
        if o.label == "status_badged":
            settings["status_badged"] = (o.value == "true")
        elif o.label.startswith("color_"):
            status_name = o.label.replace("color_", "")
            settings["status_colors"][status_name] = o.value
            
    return settings

@router.post("/ui")
async def update_ui_settings(data: dict, db: AsyncSession = Depends(get_db)):
    # Simple clear and set
    from sqlalchemy import delete
    await db.execute(delete(models.SettingOption).where(models.SettingOption.category == "UISettings"))
    
    if "status_badged" in data:
        db.add(models.SettingOption(category="UISettings", label="status_badged", value="true" if data["status_badged"] else "false"))
    
    if "status_colors" in data:
        for status_name, color in data["status_colors"].items():
            db.add(models.SettingOption(category="UISettings", label=f"color_{status_name}", value=color))
            
    await db.commit()
    return {"status": "success"}

@router.get("/initialize")
async def initialize_settings(db: AsyncSession = Depends(get_db)):
    # Simple check if already initialized
    res = await db.execute(select(models.SettingOption))
    if res.scalars().first():
        return {"status": "already_initialized"}
        
    defaults = [
        ("LogicalSystem", "SAP ERP"), ("LogicalSystem", "HR-Core"), ("LogicalSystem", "Sales-B2B"),
        ("DeviceType", "Physical"), ("DeviceType", "Virtual"), ("DeviceType", "Storage"), ("DeviceType", "Switch"),
        ("Status", "Planned"), ("Status", "Active"), ("Status", "Maintenance"), ("Status", "Decommissioned"),
        ("Environment", "Production"), ("Environment", "QA"), ("Environment", "Dev"), ("Environment", "DR")
    ]
    for cat, val in defaults:
        db.add(models.SettingOption(category=cat, label=val, value=val))
    await db.commit()
    return {"status": "initialized"}
