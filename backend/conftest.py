import pytest_asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select # Import select here

from app.database import Base, get_db, get_config_db, ConfigSessionLocal, build_engine, get_tenant_engine
from app.models.config import ConfigBase, Tenant, UserTenantAccess
from app.main import app
from app.models import models  # noqa: F401
from fastapi import Request

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
    ConfigSessionLocal = async_sessionmaker(
        bind=_test_config_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=True,
        class_=AsyncSession
    )

    # Patch app.database.config_engine and app.database.ConfigSessionLocal
    # to point to the test-specific instances
    monkeypatch.setattr("app.database.config_engine", _test_config_engine)
    monkeypatch.setattr("app.database.ConfigSessionLocal", ConfigSessionLocal)

    # Override the app's get_db and get_config_db dependencies for testing
    async def override_get_config_db():
        async with ConfigSessionLocal() as session:
            yield session

    async def override_get_db(request: Request):
        from app.api.utils import get_current_user_id
        from app.models.config import Tenant, UserTenantAccess
        from fastapi import HTTPException, status # Import these for use in the override

        user_id = get_current_user_id(request)
        tenant_url = None
        current_tenant_id = None
        selected_tenant = None # Initialize selected_tenant here

        # Prioritize X-Tenant-Id header if present
        x_tenant_id = request.headers.get("X-Tenant-Id")
        if x_tenant_id:
            try:
                x_tenant_id_int = int(x_tenant_id)
                async with ConfigSessionLocal() as config_db:
                    stmt = select(Tenant).join(UserTenantAccess).filter(
                        UserTenantAccess.user_id == user_id,
                        Tenant.id == x_tenant_id_int,
                        Tenant.is_active == True
                    )
                    tenant_result = await config_db.execute(stmt)
                    selected_tenant = tenant_result.scalar_one_or_none()

                    if selected_tenant:
                        tenant_url = selected_tenant.db_url
                        current_tenant_id = selected_tenant.id
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid X-Tenant-Id header.")

        if not selected_tenant: # If not found via X-Tenant-Id or X-Tenant-Id was not present
            # Use the *test-specific* current_ConfigSessionLocal for all config_db interactions
            async with ConfigSessionLocal() as config_db:
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
    
    yield _test_config_engine, ConfigSessionLocal
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

