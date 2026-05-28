from fastapi import Request
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event, MetaData, select
from .core.config import settings
import os
from .models.config import ConfigBase, Tenant, UserTenantAccess, MasterSystemSetting

# 1. Master Configuration Database (Always Local)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_DB_PATH = os.path.join(BASE_DIR, "config.db")
CONFIG_DATABASE_URL = f"sqlite+aiosqlite:///{CONFIG_DB_PATH}"

config_engine = create_async_engine(
    CONFIG_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

ConfigSessionLocal = async_sessionmaker(
    bind=config_engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=AsyncSession
)

# 2. Dynamic Tenant Database Management
# Engine cache to avoid recreating engines on every request
engine_cache = {}

def get_tenant_engine(db_url: str):
    if db_url not in engine_cache:
        engine_args = {
            "pool_pre_ping": True,
            "connect_args": {"check_same_thread": False, "timeout": 60}
        }
        new_engine = create_async_engine(db_url, **engine_args)
        
        # Enable WAL mode for production reliability on S3/Network mounts
        @event.listens_for(new_engine.sync_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
            
        engine_cache[db_url] = new_engine
    return engine_cache[db_url]

# Legacy/Default Session for internal use (seeding, etc)
default_engine = get_tenant_engine(settings.DATABASE_URL)
engine = default_engine # Restore global 'engine' for backward compatibility
AsyncSessionLocal = async_sessionmaker(
    bind=default_engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=AsyncSession
)

# 3. Standard Metadata and Base
naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=naming_convention)
Base = declarative_base(metadata=metadata)

# 4. Dependencies
async def get_config_db():
    async with ConfigSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_db(request: Request):
    """
    Dynamic DB dependency. Determines tenant DB based on USER_ID.
    """
    # 1. Get User ID from Header (prioritized) or Env
    user_id = request.headers.get("X-User-Id") or os.getenv("USER_ID", "admin_root")

    target_db_url = settings.DATABASE_URL # Default/Fallback

    # 2. Lookup active tenant for this user in config.db
    async with ConfigSessionLocal() as config_db:
        # Join UserTenantAccess with Tenant to get the URL
        stmt = (
            select(Tenant.db_url)
            .join(UserTenantAccess)
            .filter(UserTenantAccess.user_id == user_id)
            .filter(UserTenantAccess.is_selected == True)
        )
        result = await config_db.execute(stmt)
        tenant_url = result.scalar_one_or_none()
        
        if tenant_url:
            target_db_url = tenant_url

    # 3. Provide session for the target DB
    engine = get_tenant_engine(target_db_url)
    session_factory = async_sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=AsyncSession
    )
    
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_config_db():
    """Initializes the master configuration database."""
    async with config_engine.begin() as conn:
        await conn.run_sync(ConfigBase.metadata.create_all)
    
    # Seed default data
    async with ConfigSessionLocal() as db:
        # 1. Storage Root
        res = await db.execute(select(MasterSystemSetting).filter(MasterSystemSetting.key == "tenant_storage_root"))
        if not res.scalar_one_or_none():
            default_root = os.path.join(BASE_DIR, "tenants")
            if not os.path.exists(default_root):
                os.makedirs(default_root, exist_ok=True)
            
            db.add(MasterSystemSetting(
                key="tenant_storage_root",
                value=default_root,
                description="Parent folder on S3 mount where tenant DBs are created"
            ))
            await db.commit()

        # 2. Default Tenant (The existing system_grid.db)
        res = await db.execute(select(Tenant).filter(Tenant.name == "Default Engine"))
        default_tenant = res.scalar_one_or_none()
        if not default_tenant:
            default_tenant = Tenant(name="Default Engine", db_url=settings.DATABASE_URL)
            db.add(default_tenant)
            await db.commit()
            await db.refresh(default_tenant)

        # 3. Grant 'admin_root' access to Default Engine
        res = await db.execute(select(UserTenantAccess).filter(UserTenantAccess.user_id == "admin_root"))
        if not res.scalar_one_or_none():
            db.add(UserTenantAccess(
                user_id="admin_root",
                tenant_id=default_tenant.id,
                role="ADMIN",
                is_selected=True
            ))
            await db.commit()
