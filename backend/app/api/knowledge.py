from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from ..database import get_db
from ..models import models
from ..schemas import schemas
from .utils import filter_valid_columns

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base & Q&A"])

@router.get("", response_model=List[schemas.KnowledgeEntryResponse])
async def get_entries(category: Optional[str] = None, search: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(models.KnowledgeEntry).filter(models.KnowledgeEntry.is_deleted == False).options(
        selectinload(models.KnowledgeEntry.qa_threads).selectinload(models.KnowledgeQA.replies)
    )
    
    if category:
        query = query.filter(models.KnowledgeEntry.category == category)
    
    if search:
        query = query.filter(or_(
            models.KnowledgeEntry.title.ilike(f"%{search}%"),
            models.KnowledgeEntry.content.ilike(f"%{search}%")
        ))
        
    result = await db.execute(query.order_by(models.KnowledgeEntry.updated_at.desc()))
    return result.scalars().all()

@router.get("/{entry_id}", response_model=schemas.KnowledgeEntryResponse)
async def get_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.KnowledgeEntry)
        .filter(models.KnowledgeEntry.id == entry_id)
        .options(selectinload(models.KnowledgeEntry.qa_threads).selectinload(models.KnowledgeQA.replies))
    )
    entry = result.scalar_one_or_none()
    if not entry: raise HTTPException(404, "Entry not found")
    return entry

@router.post("", response_model=schemas.KnowledgeEntryResponse)
async def create_entry(data: schemas.KnowledgeEntryCreate, db: AsyncSession = Depends(get_db)):
    entry = models.KnowledgeEntry(**data.model_dump())
    db.add(entry)
    try:
        await db.commit()
        # Re-fetch to ensure relationships are properly handled for the response model
        result = await db.execute(
            select(models.KnowledgeEntry)
            .filter(models.KnowledgeEntry.id == entry.id)
            .options(selectinload(models.KnowledgeEntry.qa_threads).selectinload(models.KnowledgeQA.replies))
        )
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, detail=str(e))

@router.put("/{entry_id}", response_model=schemas.KnowledgeEntryResponse)
async def update_entry(entry_id: int, data: schemas.KnowledgeEntryBase, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.KnowledgeEntry).filter(models.KnowledgeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry: raise HTTPException(404, "Entry not found")
    
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entry, k, v)
        
    await db.commit()
    
    # Re-fetch with relationships
    result = await db.execute(
        select(models.KnowledgeEntry)
        .filter(models.KnowledgeEntry.id == entry_id)
        .options(selectinload(models.KnowledgeEntry.qa_threads).selectinload(models.KnowledgeQA.replies))
    )
    return result.scalar_one()

@router.delete("/{entry_id}")
async def delete_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.KnowledgeEntry).filter(models.KnowledgeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry: raise HTTPException(404, "Entry not found")
    
    entry.is_deleted = True
    await db.commit()
    return {"status": "success"}

# --- QA Thread Routes ---

@router.post("/qa", response_model=schemas.KnowledgeQAResponse)
async def add_qa_entry(data: schemas.KnowledgeQACreate, db: AsyncSession = Depends(get_db)):
    qa = models.KnowledgeQA(**data.model_dump())
    db.add(qa)
    await db.commit()
    
    # Re-fetch with relationships
    result = await db.execute(
        select(models.KnowledgeQA)
        .filter(models.KnowledgeQA.id == qa.id)
        .options(selectinload(models.KnowledgeQA.replies))
    )
    return result.scalar_one()

@router.put("/qa/{qa_id}", response_model=schemas.KnowledgeQAResponse)
async def update_qa_entry(qa_id: int, data: schemas.KnowledgeQABase, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.KnowledgeQA).filter(models.KnowledgeQA.id == qa_id))
    qa = result.scalar_one_or_none()
    if not qa: raise HTTPException(404, "QA entry not found")
    
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(qa, k, v)
        
    await db.commit()
    
    # Re-fetch with relationships
    result = await db.execute(
        select(models.KnowledgeQA)
        .filter(models.KnowledgeQA.id == qa_id)
        .options(selectinload(models.KnowledgeQA.replies))
    )
    return result.scalar_one()

@router.delete("/qa/{qa_id}")
async def delete_qa_entry(qa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.KnowledgeQA).filter(models.KnowledgeQA.id == qa_id))
    qa = result.scalar_one_or_none()
    if not qa: raise HTTPException(404, "QA entry not found")
    
    qa.is_deleted = True
    await db.commit()
    return {"status": "success"}
