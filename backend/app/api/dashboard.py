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
    # ... existing code ...

@router.get("/search")
async def global_search(q: str, db: AsyncSession = Depends(get_db)):
    if not q or len(q) < 2:
        return {"results": []}
    
    results = []
    search_term = f"%{q}%"

    # 1. Search Assets (Devices)
    assets_query = select(models.Device).filter(
        models.Device.is_deleted == False,
        (models.Device.name.ilike(search_term)) |
        (models.Device.system.ilike(search_term)) |
        (models.Device.asset_tag.ilike(search_term)) |
        (models.Device.serial_number.ilike(search_term)) |
        (models.Device.management_ip.ilike(search_term)) |
        (models.Device.primary_ip.ilike(search_term))
    ).limit(10)
    assets = (await db.execute(assets_query)).scalars().all()
    for a in assets:
        results.append({
            "id": a.id,
            "type": "asset",
            "title": a.name,
            "subtitle": f"{a.system} | {a.management_ip or a.primary_ip or 'No IP'}",
            "tag": a.type,
            "path": "/asset"
        })

    # 2. Search Projects
    projects_query = select(models.Project).filter(
        models.Project.is_deleted == False,
        (models.Project.name.ilike(search_term)) |
        (models.Project.description.ilike(search_term))
    ).limit(10)
    projects = (await db.execute(projects_query)).scalars().all()
    for p in projects:
        results.append({
            "id": p.id,
            "type": "project",
            "title": p.name,
            "subtitle": p.status,
            "tag": p.type,
            "path": "/projects"
        })

    # 3. Search FAR
    far_query = select(models.FarFailureMode).filter(
        models.FarFailureMode.is_deleted == False,
        (models.FarFailureMode.title.ilike(search_term)) |
        (models.FarFailureMode.system_name.ilike(search_term)) |
        (models.FarFailureMode.effect.ilike(search_term))
    ).limit(10)
    far = (await db.execute(far_query)).scalars().all()
    for f in far:
        results.append({
            "id": f.id,
            "type": "far",
            "title": f.title,
            "subtitle": f.system_name,
            "tag": f"RPN: {f.rpn}",
            "path": "/far"
        })

    return {"results": results}
