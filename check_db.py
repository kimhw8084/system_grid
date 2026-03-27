import asyncio
from sqlalchemy import inspect
from backend.app.database import engine
from backend.app.models import models

async def check():
    async with engine.connect() as conn:
        inspector = await conn.run_sync(inspect)
        columns = await conn.run_sync(lambda sync_conn: inspector.get_columns("logical_services"))
        print("Columns in logical_services:")
        for col in columns:
            print(f" - {col['name']}")

if __name__ == "__main__":
    asyncio.run(check())
