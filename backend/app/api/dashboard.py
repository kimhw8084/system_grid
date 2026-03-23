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
    
    racks_res = await db.execute(select(func.count(models.Rack.id)))
    racks = racks_res.scalar()
    
    devices_res = await db.execute(select(models.Device))
    devices = devices_res.scalars().all()
    
    physical = 0
    virtual = 0
    storage = 0
    switches = 0
    systems_set = set()

    for d in devices:
        dtype = d.type
        if dtype == 'physical': physical += 1
        elif dtype == 'virtual': virtual += 1
        elif dtype == 'storage': storage += 1
        elif dtype == 'switch': switches += 1
        
        if d.system:
            systems_set.add(d.system)
            
    return {
        "sites": sites,
        "racks": racks,
        "physical_servers": physical,
        "virtual_servers": virtual,
        "storage_arrays": storage,
        "switches": switches,
        "total_systems": len(systems_set)
    }
