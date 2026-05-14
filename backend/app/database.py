from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event, MetaData
from .core.config import settings

# SQLite async URL
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# High-concurrency engine configuration
engine_args = {
    "pool_pre_ping": True,
}

# Add sqlite-specific args if needed
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {
        "check_same_thread": False,
        "timeout": 60
    }

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    **engine_args
)

@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA cache_size=-64000")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=AsyncSession
)

def refresh_engine():
    global engine, AsyncSessionLocal, SQLALCHEMY_DATABASE_URL
    new_url = settings.DATABASE_URL
    if new_url != SQLALCHEMY_DATABASE_URL:
        SQLALCHEMY_DATABASE_URL = new_url
        new_engine_args = {
            "pool_pre_ping": True,
        }
        if new_url.startswith("sqlite"):
            new_engine_args["connect_args"] = {
                "check_same_thread": False,
                "timeout": 60
            }
        
        engine = create_async_engine(new_url, **new_engine_args)
        
        # Re-attach event listeners
        @event.listens_for(engine.sync_engine, "connect")
        def set_sqlite_pragma_new(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            class_=AsyncSession
        )
        return True
    return False

# Define naming convention to fix SQLite batch migration issues
# (Unnamed constraints cause "Constraint must have a name" in Alembic)
naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=naming_convention)
Base = declarative_base(metadata=metadata)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
