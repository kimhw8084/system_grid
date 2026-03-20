from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(100).all()
    return logs
