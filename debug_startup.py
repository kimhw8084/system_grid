import os
import sys
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.models.config import Tenant, UserTenantAccess
from app.models.models import Operator

async def debug():
    print("--- SysGrid Startup Debugger ---")
    
    config_db = "backend/config.local.db"
    tenant_db = "backend/tenants/local-demo/local_demo.db"
    
    if not os.path.exists(config_db):
        print(f"[FAIL] Config DB missing: {config_db}")
    else:
        print(f"[OK] Config DB found: {config_db}")
        engine = create_async_engine(f"sqlite+aiosqlite:///{config_db}")
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            tenants = await session.execute(select(Tenant))
            print("\nTenants in config.db:")
            for t in tenants.scalars().all():
                print(f"  - ID: {t.id}, Name: {t.name}, DB: {t.db_url}, Active: {t.is_active}")
            
            access = await session.execute(select(UserTenantAccess))
            print("\nUser Access in config.db:")
            for a in access.scalars().all():
                print(f"  - User: {a.user_id}, Tenant ID: {a.tenant_id}, Role: {a.role}, Selected: {a.is_selected}")
        await engine.dispose()

    if not os.path.exists(tenant_db):
        print(f"\n[FAIL] Tenant DB missing: {tenant_db}")
    else:
        print(f"\n[OK] Tenant DB found: {tenant_db}")
        engine = create_async_engine(f"sqlite+aiosqlite:///{tenant_db}")
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            try:
                operators = await session.execute(select(Operator))
                print("\nOperators in tenant DB:")
                for o in operators.scalars().all():
                    print(f"  - Username: {o.username}, Name: {o.full_name}, Admin: {o.is_admin}")
                
                # Check for "data"
                from app.models import models
                dev_count = await session.execute(select(models.Device))
                print(f"\nDevice Count: {len(dev_count.scalars().all())}")
            except Exception as e:
                print(f"\n[ERROR] Failed to query tenant DB: {e}")
        await engine.dispose()

    print("\n--- Environment Variables (from current shell) ---")
    for key in ["DATABASE_URL", "CONFIG_DATABASE_URL", "USER_ID", "DEFAULT_USER_ID", "AUTO_ADMIN_USER_IDS"]:
        print(f"{key}: {os.getenv(key, '<unset>')}")

if __name__ == "__main__":
    asyncio.run(debug())
