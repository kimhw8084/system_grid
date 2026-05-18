import asyncio
from app.database import AsyncSessionLocal
from app.models import models
from sqlalchemy import select

async def run():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(models.SettingOption))
        opts = res.scalars().all()
        for o in opts:
            print(f"Category: {o.category}, Label: {o.label}")

if __name__ == "__main__":
    asyncio.run(run())
