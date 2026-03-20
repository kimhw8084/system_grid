from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    sites = db.query(models.Site).count()
    racks = db.query(models.Rack).count()
    devices = db.query(models.Device).all()
    
    physical = 0
    virtual = 0
    storage = 0
    switches = 0
    systems_set = set()

    for d in devices:
        meta = d.metadata_json or {}
        dtype = meta.get('type', 'physical')
        if dtype == 'physical': physical += 1
        elif dtype == 'virtual': virtual += 1
        elif dtype == 'storage': storage += 1
        elif dtype == 'switch': switches += 1
        
        sys = meta.get('system')
        if sys:
            systems_set.add(sys)
            
    return {
        "sites": sites,
        "racks": racks,
        "physical_servers": physical,
        "virtual_servers": virtual,
        "storage_arrays": storage,
        "switches": switches,
        "total_systems": len(systems_set)
    }
