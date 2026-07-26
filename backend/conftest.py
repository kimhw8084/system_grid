import hashlib
import os
from pathlib import Path
import sys

# Test mode must be selected before importing the application settings singleton.
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("ENVIRONMENT", "test")

import pytest_asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select # Import select here

from app.database import (
    Base,
    get_db,
    get_config_db,
    ConfigSessionLocal as ProductionConfigSessionLocal,
    build_engine,
    get_tenant_engine,
)
from app.models.config import ConfigBase, Tenant, UserTenantAccess
from app.main import app
from app.core.config import settings
from app.models import models  # noqa: F401
from fastapi import Request


def _sqlite_file_from_url(db_url: str) -> Path | None:
    for prefix in ("sqlite+aiosqlite:///", "sqlite:///"):
        if db_url.startswith(prefix):
            raw = db_url[len(prefix):]
            if not raw or raw == ":memory:":
                return None
            return Path(raw).expanduser().resolve()
    return None


def _sha256_if_file(path: Path | None) -> str | None:
    if path is None or not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@pytest.fixture(scope="session", autouse=True)
def protect_live_config_registry():
    """Fail the test session if any test mutates the configured live registry."""
    live_config_path = _sqlite_file_from_url(settings.CONFIG_DATABASE_URL)
    before = _sha256_if_file(live_config_path)
    yield
    after = _sha256_if_file(live_config_path)
    assert before == after, (
        "Backend tests modified the configured live SysGrid config database. "
        "All config sessions must use the per-test temporary registry."
    )

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db(tmp_path_factory, monkeypatch, tmp_path):
    # Create unique SQLite database files for this test module
    config_db_path = tmp_path_factory.mktemp("config_db") / "test_config.db"
    tenant_a_db_path = tmp_path_factory.mktemp("tenant_a_db") / "test_tenant_a.db"
    tenant_b_db_path = tmp_path_factory.mktemp("tenant_b_db") / "test_tenant_b.db"

    test_config_db_url = f"sqlite+aiosqlite:///{config_db_path}"
    test_tenant_a_db_url = f"sqlite+aiosqlite:///{tenant_a_db_path}"
    test_tenant_b_db_url = f"sqlite+aiosqlite:///{tenant_b_db_path}"

    monkeypatch.setenv("TESTING", "1") # Set testing environment variable

    # Rebuild config_engine and ConfigSessionLocal with unique URL
    global _test_config_engine # Declare as global to be accessible later

    _test_config_engine = build_engine(test_config_db_url) # Assign to global variable
    test_config_session_local = async_sessionmaker(
        bind=_test_config_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=True,
        class_=AsyncSession
    )

    # Patch app.database.config_engine and app.database.ConfigSessionLocal
    # to point to the test-specific instances
    monkeypatch.setattr("app.database.config_engine", _test_config_engine)
    monkeypatch.setattr("app.database.ConfigSessionLocal", test_config_session_local)

    # Test modules historically imported ConfigSessionLocal directly at module
    # import time. Rebind every such alias to the temporary registry so no
    # backend test can write through a stale production sessionmaker reference.
    for module in list(sys.modules.values()):
        if module is None:
            continue
        if getattr(module, "ConfigSessionLocal", None) is ProductionConfigSessionLocal:
            monkeypatch.setattr(module, "ConfigSessionLocal", test_config_session_local, raising=False)

    # Override the app's get_db and get_config_db dependencies for testing
    async def override_get_config_db():
        async with test_config_session_local() as session:
            yield session

    async def override_get_db(request: Request):
        from app.api.utils import get_current_user_id
        from app.models.config import Tenant, UserTenantAccess
        from fastapi import HTTPException, status # Import these for use in the override

        user_id = get_current_user_id(request)
        tenant_url = None
        current_tenant_id = None
        selected_tenant = None # Initialize selected_tenant here

        # Prioritize X-Tenant-Id exactly as the production dependency does.
        # A supplied but inactive/missing tenant must not fall through to another
        # accessible tenant, because that would hide routing and isolation bugs.
        x_tenant_id = request.headers.get("X-Tenant-Id")
        if x_tenant_id:
            async with test_config_session_local() as config_db:
                try:
                    tenant_identifier = int(x_tenant_id)
                    tenant_stmt = select(Tenant).filter(
                        Tenant.id == tenant_identifier,
                        Tenant.is_active == True,
                    )
                except ValueError:
                    tenant_stmt = select(Tenant).filter(
                        Tenant.name == x_tenant_id,
                        Tenant.is_active == True,
                    )

                tenant_result = await config_db.execute(tenant_stmt)
                selected_tenant = tenant_result.scalar_one_or_none()

                if not selected_tenant:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Tenant '{x_tenant_id}' not found.",
                    )

                access_stmt = select(UserTenantAccess).filter(
                    UserTenantAccess.user_id == user_id,
                    UserTenantAccess.tenant_id == selected_tenant.id,
                )
                access_result = await config_db.execute(access_stmt)
                user_access = access_result.scalar_one_or_none()

                if not user_access:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"User '{user_id}' does not have access to tenant '{x_tenant_id}'.",
                    )

                tenant_url = selected_tenant.db_url
                current_tenant_id = selected_tenant.id

        if not x_tenant_id and not selected_tenant:
            # Use the *test-specific* current_ConfigSessionLocal for all config_db interactions
            async with test_config_session_local() as config_db:
                # Simplified tenant selection logic for tests
                # Try to find a tenant where the current user is an admin
                # For simplicity in testing, we'll auto-select the first active tenant the user has access to.
                user_access_stmt = select(Tenant).join(UserTenantAccess).filter(
                    UserTenantAccess.user_id == user_id,
                    UserTenantAccess.role == "ADMIN",
                    Tenant.is_active == True # Assuming active tenants are preferable
                ).order_by(Tenant.id.asc()) # Order by ID to get a deterministic "first" tenant

                tenant_result = await config_db.execute(user_access_stmt)
                selected_tenant = tenant_result.scalar_one_or_none()

                if not selected_tenant:
                    # Fallback: if no admin tenant, get any tenant the user has access to
                    user_access_stmt = select(Tenant).join(UserTenantAccess).filter(
                        UserTenantAccess.user_id == user_id,
                        Tenant.is_active == True
                    ).order_by(Tenant.id.asc())
                    tenant_result = await config_db.execute(user_access_stmt)
                    selected_tenant = tenant_result.scalar_one_or_none()


                if not selected_tenant:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"User '{user_id}' has no access to any tenant in test environment."
                    )
                
                tenant_url = selected_tenant.db_url
                current_tenant_id = selected_tenant.id

        # Now, provide session for the target DB (tenant DB)
        # This will call app.database.get_tenant_engine, which is now cache-bypassing in TESTING mode
        engine = get_tenant_engine(tenant_url)
        session_factory = async_sessionmaker(
            bind=engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            class_=AsyncSession
        )
        
        async with session_factory() as session:
            try:
                request.state.sysgrid_access_role = "ADMIN" # For simplicity in test
                request.state.tenant_id = current_tenant_id # Store tenant ID
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    async with _test_config_engine.begin() as conn:
        # These are for the config models (ConfigBase)
        await conn.run_sync(ConfigBase.metadata.drop_all)
        await conn.run_sync(ConfigBase.metadata.create_all)
    
    app.dependency_overrides[get_config_db] = override_get_config_db

    yield _test_config_engine, test_config_session_local
    # Teardown
    app.dependency_overrides.clear()
    
    # Dispose of the global test_config_engine
    if _test_config_engine:
        await _test_config_engine.dispose()
        # _test_config_engine = None # Clear reference, not strictly necessary as it's reassigned next time


@pytest_asyncio.fixture(scope="module")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(scope="function")
async def seeded_admin_tenant(client, tmp_path, tmp_path_factory, setup_db):
    _test_config_engine, ConfigSessionLocal = setup_db
    """
    Fixture to create and seed a unique tenant for the 'admin_root' user.
    Tests requiring a pre-existing tenant can depend on this fixture.
    """
    from app.models.config import Tenant, UserTenantAccess
    from app.database import Base # Keep Base for potential future use, though not used directly for schema creation here
    from app.api.tenants import run_alembic_upgrade # Import the migration function

    tenant_name = f"Admin Root Tenant {tmp_path.name}"
    tenant_db_path = tmp_path_factory.mktemp(f"seeded_tenant_db_{tmp_path.name}") / f"admin_root_tenant_{tmp_path.name}.db"
    tenant_db_url = f"sqlite+aiosqlite:///{tenant_db_path}"

    # Use the test-specific ConfigSessionLocal for seeding
    async with ConfigSessionLocal() as config_session:
        # Create a test tenant
        new_tenant = Tenant(name=tenant_name, db_url=tenant_db_url, is_active=True)
        config_session.add(new_tenant)
        await config_session.flush() # Flush to get tenant.id

        # IMPORTANT: Access attributes BEFORE committing the session,
        # otherwise the object will be detached.
        tenant_id = new_tenant.id 
        tenant_name = new_tenant.name

        # Grant admin_root access to this tenant
        config_session.add(UserTenantAccess(user_id="admin_root", tenant_id=tenant_id, role="ADMIN", is_selected=True))
        await config_session.commit()

    # Now, run alembic migrations on this newly created tenant's database
    success, error_msg = run_alembic_upgrade(tenant_db_url)
    if not success:
        pytest.fail(f"Alembic migration failed for seeded tenant {tenant_name}: {error_msg}")
    
    # We don't need to dispose the engine here as run_alembic_upgrade uses subprocess.
    
    return {"tenant_id": tenant_id, "tenant_name": tenant_name, "client": client}

