from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db)):
    # Run counts asynchronously
    sites_res = await db.execute(select(func.count(models.Site.id)))
    sites = sites_res.scalar()
    
    racks_res = await db.execute(select(func.count(models.Rack.id)).filter(models.Rack.is_deleted == False))
    racks = racks_res.scalar()
    
    services_res = await db.execute(select(func.count(models.LogicalService.id)).filter(models.LogicalService.is_deleted == False))
    services = services_res.scalar()

    # Get device type breakdown
    devices_res = await db.execute(select(models.Device).filter(models.Device.is_deleted == False))
    devices = devices_res.scalars().all()
    
    type_counts = {}
    systems_set = set()

    for d in devices:
        dtype = d.type if d.type else "Unknown"
        type_counts[dtype] = type_counts.get(dtype, 0) + 1
        
        if d.system:
            systems_set.add(d.system)
            
    return {
        "sites": sites,
        "racks": racks,
        "services": services,
        "asset_types": type_counts,
        "total_systems": len(systems_set)
    }
