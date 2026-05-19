
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.models import models

async def check():
    engine = create_async_engine("sqlite+aiosqlite:///backend/system_grid.db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("--- ROLES ---")
        res = await session.execute(select(models.Role))
        roles = res.scalars().all()
        for r in roles:
            print(f"Role: {r.name}, Perms: {r.permissions}")
            
        print("\n--- OPERATORS ---")
        res = await session.execute(select(models.Operator))
        ops = res.scalars().all()
        for o in ops:
            print(f"Operator: {o.username}, Custom Perms: {o.custom_permissions}, Is Admin: {o.is_admin}")

if __name__ == "__main__":
    asyncio.run(check())
