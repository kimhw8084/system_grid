from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import joinedload
from typing import List, Optional, Any
from urllib.parse import urlparse
from ..database import get_db
from ..models import models
from ..schemas import schemas
from .utils import filter_valid_columns

router = APIRouter(prefix="/monitoring", tags=["Monitoring Matrix"])
IMMUTABLE_MONITORING_FIELDS = {"id", "created_at", "updated_at", "created_by_user_id"}
MONITORING_SEVERITIES = {"Critical", "Warning", "Info"}
MONITORING_STATUSES = {"Existing", "Planned", "Cancelled", "Decommissioned", "Deleted"}
MONITORING_OWNER_ROLES = {"Primary Support", "Escalation", "Observer"}
CHECK_INTERVAL_MIN = 15
CHECK_INTERVAL_MAX = 86400
ALERT_DURATION_MIN = 0
ALERT_DURATION_MAX = 86400
NOTIFICATION_THROTTLE_MIN = 60
NOTIFICATION_THROTTLE_MAX = 604800

def normalize_monitoring_url(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    url = value.strip()
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Monitoring URL must use http or https")
    if not parsed.netloc:
        raise HTTPException(status_code=400, detail="Monitoring URL must include a host")
    lowered = url.lower()
    blocked_tokens = ("<", ">", "\"", "'", "javascript:", "data:", "vbscript:")
    if any(token in lowered for token in blocked_tokens):
        raise HTTPException(status_code=400, detail="Monitoring URL contains unsafe content")
    return url

async def get_setting_values_by_category(db: AsyncSession, category: str) -> set[str]:
    result = await db.execute(select(models.SettingOption.value).where(models.SettingOption.category == category))
    return {value for value in result.scalars().all() if value}

async def get_registered_team_names(db: AsyncSession) -> set[str]:
    result = await db.execute(select(models.Team.name).where(models.Team.is_archived == False))
    return {name for name in result.scalars().all() if name}

async def build_monitoring_payload(
    db: AsyncSession,
    payload: dict[str, Any],
    *,
    partial: bool = False,
) -> tuple[dict[str, Any], list[dict[str, Any]] | None]:
    owners_data = payload.get("owners") if "owners" in payload else None
    clean_data = filter_valid_columns(models.MonitoringItem, payload, exclude=IMMUTABLE_MONITORING_FIELDS | {"owners"})

    if "monitoring_url" in clean_data:
        clean_data["monitoring_url"] = normalize_monitoring_url(clean_data.get("monitoring_url"))

    if "severity" in clean_data and clean_data["severity"] not in MONITORING_SEVERITIES:
        raise HTTPException(status_code=400, detail=f"Severity must be one of: {', '.join(sorted(MONITORING_SEVERITIES))}")
    if "status" in clean_data and clean_data["status"] not in MONITORING_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(sorted(MONITORING_STATUSES))}")

    for field_name, minimum, maximum in (
        ("check_interval", CHECK_INTERVAL_MIN, CHECK_INTERVAL_MAX),
        ("alert_duration", ALERT_DURATION_MIN, ALERT_DURATION_MAX),
        ("notification_throttle", NOTIFICATION_THROTTLE_MIN, NOTIFICATION_THROTTLE_MAX),
    ):
        if field_name in clean_data and clean_data[field_name] is not None:
            value = int(clean_data[field_name])
            if value < minimum or value > maximum:
                raise HTTPException(status_code=400, detail=f"{field_name} must be between {minimum} and {maximum}")
            clean_data[field_name] = value

    if "platform" in clean_data and clean_data["platform"]:
        platforms = await get_setting_values_by_category(db, "MonitoringPlatform")
        if platforms and clean_data["platform"] not in platforms:
            raise HTTPException(status_code=400, detail="Platform must be selected from Monitoring Platform settings")

    registered_teams = await get_registered_team_names(db)
    if "owner_team" in clean_data:
        owner_team = clean_data.get("owner_team")
        if owner_team and owner_team not in registered_teams:
            raise HTTPException(status_code=400, detail="Owner team must be selected from user management teams")

    resolved_owners: list[dict[str, Any]] | None = None
    if owners_data is not None:
        if not isinstance(owners_data, list):
            raise HTTPException(status_code=400, detail="owners must be a list")
        resolved_owners = []
        for owner in owners_data:
            operator_id = owner.get("operator_id")
            role = owner.get("role")
            if not operator_id:
                raise HTTPException(status_code=400, detail="Each owner must include operator_id")
            if role not in MONITORING_OWNER_ROLES:
                raise HTTPException(status_code=400, detail=f"Owner role must be one of: {', '.join(sorted(MONITORING_OWNER_ROLES))}")
            operator_result = await db.execute(select(models.Operator).where(models.Operator.id == operator_id))
            operator = operator_result.scalar_one_or_none()
            if not operator:
                raise HTTPException(status_code=400, detail=f"Operator {operator_id} was not found")
            resolved_owners.append({
                "operator_id": operator.id,
                "name": operator.full_name or operator.username or operator.external_id,
                "external_id": operator.external_id,
                "role": role,
            })

    if not partial:
        data = schemas.MonitoringItemCreate.model_validate({**clean_data, "owners": resolved_owners or []})
        clean_data = data.model_dump(exclude={"owners"})
        resolved_owners = [owner.model_dump() for owner in data.owners]
    elif "logic_json" in clean_data:
        clean_data["logic_json"] = [schemas.MonitoringLogicEntry.model_validate(entry).model_dump() for entry in clean_data["logic_json"] or []]

    severity = clean_data.get("severity")
    if severity == "Critical" and not clean_data.get("recovery_docs"):
        raise HTTPException(status_code=400, detail="Critical monitors require at least one linked recovery document")

    owner_team = clean_data.get("owner_team")
    has_team_owner = bool(owner_team)
    has_individual_owners = bool(resolved_owners)
    if has_team_owner and has_individual_owners:
        raise HTTPException(status_code=400, detail="Choose either a team owner or individual owners, not both")
    if not has_team_owner and not has_individual_owners:
        raise HTTPException(status_code=400, detail="Choose a team owner or at least one individual owner")

    if "status" in clean_data:
        clean_data["is_deleted"] = clean_data["status"] == "Deleted"

    return clean_data, resolved_owners

async def load_monitoring_item(db: AsyncSession, item_id: int):
    result = await db.execute(
        select(models.MonitoringItem)
        .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
        .filter(models.MonitoringItem.id == item_id)
    )
    return result.unique().scalar_one_or_none()

async def to_monitoring_response(db: AsyncSession, item: models.MonitoringItem):
    resp = schemas.MonitoringItemResponse.model_validate(item)
    if item.device_id:
        dev_res = await db.execute(select(models.Device.name).filter(models.Device.id == item.device_id))
        resp.device_name = dev_res.scalar_one_or_none()
    if item.monitored_services:
        svc_res = await db.execute(select(models.LogicalService.name).filter(models.LogicalService.id.in_(item.monitored_services)))
        resp.monitored_service_names = list(svc_res.scalars().all())
    if item.recovery_docs:
        doc_res = await db.execute(select(models.KnowledgeEntry.title).filter(models.KnowledgeEntry.id.in_(item.recovery_docs)))
        resp.recovery_doc_titles = list(doc_res.scalars().all())
    return resp

async def save_monitoring_history(item_id: int, version: int, db: AsyncSession, summary: str = None):
    # Fetch the item with owners
    result = await db.execute(
        select(models.MonitoringItem)
        .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
        .filter(models.MonitoringItem.id == item_id)
    )
    item = result.unique().scalar_one()
    
    # Create snapshot (convert to dict)
    snapshot = {
        "device_id": item.device_id,
        "category": item.category,
        "status": item.status,
        "title": item.title,
        "spec": item.spec,
        "platform": item.platform,
        "monitoring_url": item.monitoring_url,
        "purpose": item.purpose,
        "impact": item.impact,
        "notification_method": item.notification_method,
        "notification_recipients": item.notification_recipients,
        "logic": item.logic,
        "logic_json": item.logic_json,
        "monitored_services": item.monitored_services,
        "owner_team": item.owner_team,
        "check_interval": item.check_interval,
        "alert_duration": item.alert_duration,
        "notification_throttle": item.notification_throttle,
        "severity": item.severity,
        "is_active": item.is_active,
        "is_deleted": item.is_deleted,
        "recovery_docs": item.recovery_docs,
        "owners": [
            {
                "operator_id": o.operator_id,
                "name": o.name or (o.operator.full_name if o.operator else None),
                "external_id": o.external_id or (o.operator.external_id if o.operator else None),
                "role": o.role,
            }
            for o in item.owners
        ]
    }
    
    history_obj = models.MonitoringHistory(
        monitoring_item_id=item_id,
        version=version,
        snapshot=snapshot,
        change_summary=summary
    )
    db.add(history_obj)

@router.get("/{item_id}/history", response_model=List[schemas.MonitoringHistoryResponse])
async def get_monitoring_history(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.MonitoringHistory)
        .filter(models.MonitoringHistory.monitoring_item_id == item_id)
        .order_by(models.MonitoringHistory.version.desc())
    )
    return result.scalars().all()

@router.get("", response_model=List[schemas.MonitoringItemResponse])
async def get_monitoring_items(device_id: Optional[int] = None, include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.MonitoringItem).options(
        joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator)
    )
    if not include_deleted:
        query = query.filter(models.MonitoringItem.is_deleted == False)
    
    if device_id:
        query = query.filter(models.MonitoringItem.device_id == device_id)
    
    result = await db.execute(query)
    items = result.unique().scalars().all()
    
    # Batch fetch device names
    device_ids = {item.device_id for item in items if item.device_id}
    device_map = {}
    if device_ids:
        dev_res = await db.execute(select(models.Device.id, models.Device.name).filter(models.Device.id.in_(device_ids)))
        device_map = {id_: name for id_, name in dev_res.all()}

    # Batch fetch service names
    all_service_ids = set()
    for item in items:
        if item.monitored_services:
            all_service_ids.update(item.monitored_services)
    
    service_map = {}
    if all_service_ids:
        svc_res = await db.execute(select(models.LogicalService.id, models.LogicalService.name).filter(models.LogicalService.id.in_(all_service_ids)))
        service_map = {id_: name for id_, name in svc_res.all()}

    # Batch fetch recovery doc titles
    all_doc_ids = set()
    for item in items:
        if item.recovery_docs:
            all_doc_ids.update(item.recovery_docs)
            
    doc_map = {}
    if all_doc_ids:
        doc_res = await db.execute(select(models.KnowledgeEntry.id, models.KnowledgeEntry.title).filter(models.KnowledgeEntry.id.in_(all_doc_ids)))
        doc_map = {id_: title for id_, title in doc_res.all()}

    res = []
    for item in items:
        resp = schemas.MonitoringItemResponse.model_validate(item)
        resp.device_name = device_map.get(item.device_id)
        resp.monitored_service_names = [service_map.get(sid) for sid in (item.monitored_services or []) if service_map.get(sid)]
        resp.recovery_doc_titles = [doc_map.get(did) for did in (item.recovery_docs or []) if doc_map.get(did)]
        res.append(resp)
        
    return res

@router.post("", response_model=schemas.MonitoringItemResponse)
async def create_monitoring_item(data: schemas.MonitoringItemCreate, db: AsyncSession = Depends(get_db)):
    item_data, owners_data = await build_monitoring_payload(db, data.model_dump(), partial=False)
    
    db_obj = models.MonitoringItem(**item_data)
    db.add(db_obj)
    await db.flush() # To get db_obj.id
    
    for owner in owners_data or []:
        db_owner = models.MonitoringOwner(**owner, monitoring_item_id=db_obj.id)
        db.add(db_owner)
        
    await db.commit()
    await save_monitoring_history(db_obj.id, db_obj.version, db)
    await db.commit()
    
    # Reload with owners
    db_obj = await load_monitoring_item(db, db_obj.id)
    return await to_monitoring_response(db, db_obj)

@router.put("/{item_id}", response_model=schemas.MonitoringItemResponse)
async def update_monitoring_item(item_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    item = await load_monitoring_item(db, item_id)
    if not item: raise HTTPException(404, "Monitoring item not found")
    
    merged_payload = {
        "device_id": item.device_id,
        "category": item.category,
        "status": item.status,
        "title": item.title,
        "spec": item.spec,
        "platform": item.platform,
        "monitoring_url": item.monitoring_url,
        "purpose": item.purpose,
        "impact": item.impact,
        "notification_method": item.notification_method,
        "notification_recipients": item.notification_recipients,
        "logic": item.logic,
        "logic_json": item.logic_json,
        "monitored_services": item.monitored_services,
        "owner_team": item.owner_team,
        "check_interval": item.check_interval,
        "alert_duration": item.alert_duration,
        "notification_throttle": item.notification_throttle,
        "severity": item.severity,
        "is_active": item.is_active,
        "recovery_docs": item.recovery_docs,
        "owners": [
            {"operator_id": owner.operator_id, "role": owner.role}
            for owner in item.owners
        ],
    }
    merged_payload.update(data)
    clean_data, owners_data = await build_monitoring_payload(db, merged_payload, partial=False)

    for k, v in clean_data.items():
        setattr(item, k, v)
    
    # Increment version
    item.version = (item.version or 0) + 1

    if owners_data is not None:
        await db.execute(delete(models.MonitoringOwner).where(models.MonitoringOwner.monitoring_item_id == item_id))
        for owner in owners_data:
            db_owner = models.MonitoringOwner(**owner, monitoring_item_id=item_id)
            db.add(db_owner)
            
    await db.commit()
    await save_monitoring_history(item_id, item.version, db)
    await db.commit()
    
    # Reload with owners
    item = await load_monitoring_item(db, item_id)
    return await to_monitoring_response(db, item)

@router.post("/bulk-action")
async def bulk_action(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    payload = data.get("payload", {})
    if not ids: return {"status": "no_op"}

    if action == "delete":
        result = await db.execute(
            select(models.MonitoringItem)
            .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
            .where(models.MonitoringItem.id.in_(ids))
        )
        items = result.unique().scalars().all()
        for item in items:
            item.is_deleted = True
            item.status = "Deleted"
            item.version = (item.version or 0) + 1
            await db.flush()
            await save_monitoring_history(item.id, item.version, db, "Bulk delete")
    elif action == "purge":
        await db.execute(delete(models.MonitoringItem).where(models.MonitoringItem.id.in_(ids)))
    elif action == "restore":
        result = await db.execute(
            select(models.MonitoringItem)
            .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
            .where(models.MonitoringItem.id.in_(ids))
        )
        items = result.unique().scalars().all()
        for item in items:
            item.is_deleted = False
            item.status = "Existing"
            item.version = (item.version or 0) + 1
            await db.flush()
            await save_monitoring_history(item.id, item.version, db, "Bulk restore")
    elif action == "update":
        if payload:
            result = await db.execute(
                select(models.MonitoringItem)
                .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
                .where(models.MonitoringItem.id.in_(ids))
            )
            items = result.unique().scalars().all()
            for item in items:
                merged_payload = {
                    "device_id": item.device_id,
                    "category": item.category,
                    "status": item.status,
                    "title": item.title,
                    "spec": item.spec,
                    "platform": item.platform,
                    "monitoring_url": item.monitoring_url,
                    "purpose": item.purpose,
                    "impact": item.impact,
                    "notification_method": item.notification_method,
                    "notification_recipients": item.notification_recipients,
                    "logic": item.logic,
                    "logic_json": item.logic_json,
                    "monitored_services": item.monitored_services,
                    "owner_team": item.owner_team,
                    "check_interval": item.check_interval,
                    "alert_duration": item.alert_duration,
                    "notification_throttle": item.notification_throttle,
                    "severity": item.severity,
                    "is_active": item.is_active,
                    "recovery_docs": item.recovery_docs,
                    "owners": [
                        {"operator_id": owner.operator_id, "role": owner.role}
                        for owner in item.owners
                        if owner.operator_id
                    ],
                }
                merged_payload.update(payload)
                validated_update, owners_data = await build_monitoring_payload(db, merged_payload, partial=False)
                for key, value in validated_update.items():
                    setattr(item, key, value)
                if owners_data is not None:
                    await db.execute(delete(models.MonitoringOwner).where(models.MonitoringOwner.monitoring_item_id == item.id))
                    for owner in owners_data:
                        db.add(models.MonitoringOwner(**owner, monitoring_item_id=item.id))
                item.version = (item.version or 0) + 1
                await db.flush()
                summary_fields = ", ".join(sorted(payload.keys()))
                await save_monitoring_history(item.id, item.version, db, f"Bulk update: {summary_fields}")

    await db.commit()
    return {"status": "success"}

@router.delete("/{item_id}")
async def delete_monitoring_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item: raise HTTPException(404, "Monitoring item not found")
    
    item.is_deleted = True
    item.status = "Deleted"
    await db.commit()
    return {"status": "success"}
