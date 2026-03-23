from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/")
async def get_audit_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(200))
    logs = result.scalars().all()
    
    final_logs = []
    for l in logs:
        final_logs.append({
            "id": l.id,
            "timestamp": l.timestamp,
            "user_id": l.user_id,
            "action": l.action,
            "target_table": l.target_table,
            "target_id": l.target_id,
            "description": l.description,
            "changes": l.changes
        })
    return final_logs
