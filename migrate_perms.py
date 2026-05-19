
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.models import models

def map_perm(p):
    if p == 'manage' or p == 'edit': return 3
    if p == 'add': return 2
    if p == 'read': return 1
    return 0

async def migrate():
    engine = create_async_engine("sqlite+aiosqlite:///backend/system_grid.db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        res = await session.execute(select(models.Role))
        roles = res.scalars().all()
        for r in roles:
            new_perms = {k: map_perm(v) for k, v in r.permissions.items()}
            print(f"Migrating role {r.name}: {r.permissions} -> {new_perms}")
            r.permissions = new_perms
            
        res = await session.execute(select(models.Operator))
        ops = res.scalars().all()
        for o in ops:
            if o.custom_permissions:
                new_perms = {k: map_perm(v) if isinstance(v, str) else v for k, v in o.custom_permissions.items()}
                print(f"Migrating operator {o.username}: {o.custom_permissions} -> {new_perms}")
                o.custom_permissions = new_perms
                
        await session.commit()
        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
