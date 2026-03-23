from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import models
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/")
async def get_audit_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(models.AuditLog)
    
    # Apply filtering asynchronously
    if start_date:
        try:
            query = query.filter(models.AuditLog.timestamp >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(models.AuditLog.timestamp <= datetime.fromisoformat(end_date))
        except ValueError:
            pass
    
    result = await db.execute(query.order_by(models.AuditLog.timestamp.desc()).limit(200))
    return result.scalars().all()
