from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models
from ..schemas import schemas
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/")
def get_audit_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.AuditLog)
    if start_date:
        query = query.filter(models.AuditLog.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(models.AuditLog.timestamp <= datetime.fromisoformat(end_date))
    
    return query.order_by(models.AuditLog.timestamp.desc()).limit(200).all()
