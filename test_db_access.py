import asyncio
from sqlalchemy import select
from backend.app.database import AsyncSessionLocal
from backend.app.models import models

async def test():
    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(select(models.LogicalService).limit(1))
            svc = res.scalar_one_or_none()
            if svc:
                print(f"Success! Name: {svc.name}, License Type: {svc.license_type}")
            else:
                print("No services found.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
