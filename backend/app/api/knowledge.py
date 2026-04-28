from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, or_
from typing import List, Optional
from ..database import get_db
from ..models import models
from .utils import filter_valid_columns

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base & Q&A"])

@router.get("")
async def get_entries(category: Optional[str] = None, search: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(models.KnowledgeEntry).filter(models.KnowledgeEntry.is_deleted == False)
    
    if category:
        query = query.filter(models.KnowledgeEntry.category == category)
    
    if search:
        query = query.filter(or_(
            models.KnowledgeEntry.title.ilike(f"%{search}%"),
            models.KnowledgeEntry.content.ilike(f"%{search}%")
        ))
        
    result = await db.execute(query.order_by(models.KnowledgeEntry.updated_at.desc()))
    return result.scalars().all()

@router.post("")
async def create_entry(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.KnowledgeEntry, data)
    entry = models.KnowledgeEntry(**clean_data)
    db.add(entry)
    try:
        await db.commit()
        await db.refresh(entry)
        return entry
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, detail=str(e))

@router.put("/{entry_id}")
async def update_entry(entry_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.KnowledgeEntry).filter(models.KnowledgeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry: raise HTTPException(404, "Entry not found")
    
    clean_data = filter_valid_columns(models.KnowledgeEntry, data)
    for k, v in clean_data.items():
        setattr(entry, k, v)
        
    await db.commit()
    await db.refresh(entry)
    return entry

@router.delete("/{entry_id}")
async def delete_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.KnowledgeEntry).filter(models.KnowledgeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry: raise HTTPException(404, "Entry not found")
    
    entry.is_deleted = True
    await db.commit()
    return {"status": "success"}
