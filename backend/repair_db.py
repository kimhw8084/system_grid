import asyncio
from app.database import engine, Base
from app.models import models

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables synchronized.")

if __name__ == "__main__":
    asyncio.run(create())
