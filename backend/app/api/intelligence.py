from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import selectinload
from typing import List, Optional, Any, Dict
from ..database import get_db
from ..models import models
from ..schemas import schemas
from .utils import filter_valid_columns

router = APIRouter(prefix="/intelligence", tags=["External Intelligence"])

async def log_audit(db: AsyncSession, action: str, table: str, target_id: int, description: str, changes: Optional[Dict] = None):
    log = models.AuditLog(
        user_id="admin", # Default for prototype
        action=action,
        target_table=table,
        target_id=str(target_id),
        description=description,
        changes=changes
    )
    db.add(log)
    await db.commit()

# --- External Entities ---

@router.get("/entities", response_model=List[schemas.ExternalEntityResponse])
async def get_entities(include_deleted: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(models.ExternalEntity).options(selectinload(models.ExternalEntity.secrets))
    if not include_deleted:
        query = query.filter(models.ExternalEntity.is_deleted == False)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/entities", response_model=schemas.ExternalEntityResponse)
async def create_entity(data: schemas.ExternalEntityCreate, db: AsyncSession = Depends(get_db)):
    db_obj = models.ExternalEntity(**data.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    await log_audit(db, "CREATE", "external_entities", db_obj.id, f"Created external entity: {db_obj.name}")
    return db_obj

@router.put("/entities/{entity_id}", response_model=schemas.ExternalEntityResponse)
async def update_entity(entity_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ExternalEntity).filter(models.ExternalEntity.id == entity_id).options(selectinload(models.ExternalEntity.secrets)))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, "Entity not found")
    
    clean_data = filter_valid_columns(models.ExternalEntity, data)
    for k, v in clean_data.items():
        setattr(obj, k, v)
    
    await db.commit()
    await db.refresh(obj)
    await log_audit(db, "UPDATE", "external_entities", entity_id, f"Updated external entity: {obj.name}", clean_data)
    return obj

@router.post("/entities/{entity_id}/restore")
async def restore_entity(entity_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ExternalEntity).filter(models.ExternalEntity.id == entity_id))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, "Entity not found")
    
    obj.is_deleted = False
    await db.commit()
    await log_audit(db, "RESTORE", "external_entities", entity_id, f"Restored external entity: {obj.name}")
    return {"status": "success"}

@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: int, purge: bool = False, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ExternalEntity).filter(models.ExternalEntity.id == entity_id))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, "Entity not found")
    
    if purge:
        # Check for links
        link_check = await db.execute(select(models.ExternalLink).filter(models.ExternalLink.external_entity_id == entity_id))
        if link_check.scalars().first():
            raise HTTPException(400, "Cannot purge entity with active connectivity links")
        await db.delete(obj)
        await log_audit(db, "PURGE", "external_entities", entity_id, f"Permanently purged external entity: {obj.name}")
    else:
        obj.is_deleted = True
        await log_audit(db, "DELETE", "external_entities", entity_id, f"Soft-deleted external entity: {obj.name}")
    
    await db.commit()
    return {"status": "success"}

# --- External Entity Secrets ---

@router.post("/entities/{entity_id}/secrets", response_model=schemas.ExternalEntitySecretResponse)
async def add_entity_secret(entity_id: int, data: schemas.ExternalEntitySecretBase, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ExternalEntity).filter(models.ExternalEntity.id == entity_id))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, "Entity not found")
    
    secret = models.ExternalEntitySecret(
        external_entity_id=entity_id,
        **data.model_dump()
    )
    db.add(secret)
    await db.commit()
    await db.refresh(secret)
    await log_audit(db, "CREATE", "external_entity_secrets", secret.id, f"Added credential for external entity: {obj.name}")
    return secret

@router.delete("/entities/{entity_id}/secrets/{secret_id}")
async def delete_entity_secret(entity_id: int, secret_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.ExternalEntitySecret).filter(
        models.ExternalEntitySecret.id == secret_id,
        models.ExternalEntitySecret.external_entity_id == entity_id
    ))
    secret = res.scalar_one_or_none()
    if not secret: raise HTTPException(404, "Secret not found")
    
    await db.delete(secret)
    await db.commit()
    await log_audit(db, "DELETE", "external_entity_secrets", secret_id, f"Revoked credential for external entity ID: {entity_id}")
    return {"status": "success"}

# --- External Links ---

@router.get("/links", response_model=List[schemas.ExternalLinkResponse])
async def get_links(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ExternalLink))
    items = result.scalars().all()
    
    res = []
    for item in items:
        resp = schemas.ExternalLinkResponse.model_validate(item)
        
        # Enrich names
        ent_res = await db.execute(select(models.ExternalEntity.name).filter(models.ExternalEntity.id == item.external_entity_id))
        resp.external_entity_name = ent_res.scalar_one_or_none()
        
        dev_res = await db.execute(select(models.Device.name).filter(models.Device.id == item.device_id))
        resp.device_name = dev_res.scalar_one_or_none()
        
        if item.service_id:
            svc_res = await db.execute(select(models.LogicalService.name).filter(models.LogicalService.id == item.service_id))
            resp.service_name = svc_res.scalar_one_or_none()
            
        res.append(resp)
    return res

@router.post("/links", response_model=schemas.ExternalLinkResponse)
async def create_link(data: schemas.ExternalLinkCreate, db: AsyncSession = Depends(get_db)):
    db_obj = models.ExternalLink(**data.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    await log_audit(db, "CREATE", "external_links", db_obj.id, f"Established external link to {db_obj.purpose}")
    return db_obj

@router.delete("/links/{link_id}")
async def delete_link(link_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ExternalLink).filter(models.ExternalLink.id == link_id))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, "Link not found")
    
    await db.delete(obj)
    await db.commit()
    await log_audit(db, "DELETE", "external_links", link_id, "Severed external link")
    return {"status": "success"}
