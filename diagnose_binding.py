import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text
# Assuming we are running from the project root.
# Need to add backend to sys.path
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.models.models import Team

async def main():
    db_path = "/Users/haewonkim/home/development/sysgrid/backend/tenants/local-demo/local_demo.db"
    url = f"sqlite+aiosqlite:///{db_path}"
    print(f"DEBUG: Testing engine binding for URL: {url}")
    
    engine = create_async_engine(url)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession)
    
    try:
        async with session_factory() as session:
            # Check if table exists
            try:
                await session.execute(text("SELECT 1 FROM teams LIMIT 1"))
                print("DEBUG: Table 'teams' exists.")
            except Exception as e:
                print(f"DEBUG: Table 'teams' query failed: {e}")
            
            # Check model binding
            stmt = select(Team)
            res = await session.execute(stmt)
            print("Query successful: Team model correctly bound and queried.")
    except Exception as e:
        print(f"DEBUG: Binding/Query failed: {e}")
    finally:
        await engine.dispose()

asyncio.run(main())
