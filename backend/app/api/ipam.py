from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/ipam", tags=["IPAM Engine"])

@router.get("/subnets")
async def get_subnets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Subnet))
    return result.scalars().all()

@router.post("/subnets")
async def create_subnet(data: dict, db: AsyncSession = Depends(get_db)):
    sb = models.Subnet(**data)
    db.add(sb)
    await db.commit()
    await db.refresh(sb)
    return sb

@router.delete("/subnets/{id}")
async def delete_subnet(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Subnet).filter(models.Subnet.id == id))
    sb = result.scalar_one_or_none()
    if sb:
        db.delete(sb)
        await db.commit()
    return {"status": "success"}
