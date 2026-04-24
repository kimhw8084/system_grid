from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from ..database import get_db
from ..models import models
from typing import Dict, Any, List

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def group_by_status(items: List[Any], type_attr: str = "type") -> Dict[str, Dict[str, int]]:
    """Groups items by their type and then by status within that type."""
    result = {}
    for item in items:
        # Get type (or platform for monitoring)
        itype = getattr(item, type_attr, "Unknown") or "Unknown"
        status = getattr(item, "status", "Unknown") or "Unknown"
        
        if itype not in result:
            result[itype] = {}
        
        result[itype][status] = result[itype].get(status, 0) + 1
    return result

@router.get("/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db)):
    # 1. Rack Overview
    sites_count = (await db.execute(select(func.count(models.Site.id)))).scalar() or 0
    racks_count = (await db.execute(select(func.count(models.Rack.id)).filter(models.Rack.is_deleted == False))).scalar() or 0
    
    # Count unique devices that have a record in device_locations
    racked_assets_query = select(func.count(func.distinct(models.DeviceLocation.device_id))).join(
        models.Device, models.Device.id == models.DeviceLocation.device_id
    ).filter(models.Device.is_deleted == False)
    racked_assets = (await db.execute(racked_assets_query)).scalar() or 0
    
    # 2. Asset Overview
    devices = (await db.execute(select(models.Device).filter(models.Device.is_deleted == False))).scalars().all()
    asset_overview = {
        "total": len(devices),
        "breakdown": group_by_status(devices, "type")
    }

    # 3. Service Overview
    services = (await db.execute(select(models.LogicalService).filter(models.LogicalService.is_deleted == False))).scalars().all()
    service_overview = {
        "total": len(services),
        "breakdown": group_by_status(services, "service_type")
    }

    # 4. External Overview
    externals = (await db.execute(select(models.ExternalEntity).filter(models.ExternalEntity.is_deleted == False))).scalars().all()
    external_overview = {
        "total": len(externals),
        "breakdown": group_by_status(externals, "type")
    }

    # 5. Network Overview
    connections = (await db.execute(select(models.PortConnection))).scalars().all()
    network_overview = {
        "total": len(connections),
        "breakdown": group_by_status(connections, "link_type")
    }

    # 6. Monitoring Overview
    mon_items = (await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.is_deleted == False))).scalars().all()
    monitoring_overview = {
        "total": len(mon_items),
        "breakdown": group_by_status(mon_items, "platform")
    }

    # 7. Recent Items (Last 3)
    research = (await db.execute(select(models.Investigation).order_by(desc(models.Investigation.updated_at)).limit(3))).scalars().all()
    far = (await db.execute(select(models.FarFailureMode).order_by(desc(models.FarFailureMode.created_at)).limit(3))).scalars().all()
    knowledge = (await db.execute(select(models.KnowledgeEntry).order_by(desc(models.KnowledgeEntry.created_at)).limit(3))).scalars().all()
    architecture = (await db.execute(select(models.DataFlow).order_by(desc(models.DataFlow.created_at)).limit(3))).scalars().all()
    
    # Projects: 3 latest in progress, 3 latest completed
    projects_in_progress = (await db.execute(select(models.Project).filter(models.Project.status == "In Progress").order_by(desc(models.Project.updated_at)).limit(3))).scalars().all()
    projects_completed = (await db.execute(select(models.Project).filter(models.Project.status == "Completed").order_by(desc(models.Project.updated_at)).limit(3))).scalars().all()

    return {
        "rack_overview": {
            "total_sites": sites_count,
            "total_racks": racks_count,
            "total_racked_assets": racked_assets
        },
        "asset_overview": asset_overview,
        "service_overview": service_overview,
        "external_overview": external_overview,
        "network_overview": network_overview,
        "monitoring_overview": monitoring_overview,
        "recent": {
            "research": [{"id": r.id, "title": r.system_name, "updated_at": r.updated_at} for r in research],
            "far": [{"id": f.id, "title": f.failure_mode, "created_at": f.created_at} for f in far],
            "knowledge": [{"id": k.id, "title": k.title, "created_at": k.created_at} for k in knowledge],
            "architecture": [{"id": a.id, "title": a.name, "created_at": a.created_at} for a in architecture],
            "projects": {
                "in_progress": [{"id": p.id, "title": p.name, "updated_at": p.updated_at} for p in projects_in_progress],
                "completed": [{"id": p.id, "title": p.name, "updated_at": p.updated_at} for p in projects_completed]
            }
        }
    }
