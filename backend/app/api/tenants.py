from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select, update, insert, func, text
from typing import List
import os
import subprocess
import sys
from ..database import get_config_db, get_db, ConfigSessionLocal, get_tenant_engine
from ..models.config import Tenant, UserTenantAccess, MasterSystemSetting
from ..schemas.config import TenantCreate, TenantResponse, MasterSettingBase, UserTenantSelection, UserTenantResponse, TenantAttach, PreflightRequest, PreflightResponse
from ..core.config import settings
from .utils import get_current_user_id

router = APIRouter(prefix="/tenants", tags=["Multi-Tenancy"])

@router.get("/admin/settings", response_model=List[MasterSettingBase])
async def get_master_settings(db: AsyncSession = Depends(get_config_db)):
    result = await db.execute(select(MasterSystemSetting))
    return result.scalars().all()

@router.post("/admin/settings", response_model=MasterSettingBase)
async def update_master_setting(setting: MasterSettingBase, db: AsyncSession = Depends(get_config_db)):
    # Verify path if key is tenant_storage_root
    if setting.key == "tenant_storage_root":
        if not os.path.exists(setting.value):
            try:
                os.makedirs(setting.value, exist_ok=True)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Cannot create or access storage path: {str(e)}")
        
        # Test write permission
        test_file = os.path.join(setting.value, ".write_test")
        try:
            with open(test_file, "w") as f:
                f.write("test")
            os.remove(test_file)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Storage path is not writable: {str(e)}")

    stmt = update(MasterSystemSetting).where(MasterSystemSetting.key == setting.key).values(value=setting.value)
    await db.execute(stmt)
    await db.commit()
    
    result = await db.execute(select(MasterSystemSetting).filter(MasterSystemSetting.key == setting.key))
    return result.scalar_one()

@router.post("/admin/backup/{tenant_id}")
async def backup_tenant(tenant_id: int, db: AsyncSession = Depends(get_config_db)):
    """Triggers a manual backup of the tenant database."""
    res = await db.execute(select(Tenant).filter(Tenant.id == tenant_id))
    tenant = res.scalar_one_or_none()
    if not tenant: raise HTTPException(404, "Tenant not found")
    
    # Get storage root
    res_root = await db.execute(select(MasterSystemSetting).filter(MasterSystemSetting.key == "tenant_storage_root"))
    storage_root = res_root.scalar_one().value
    
    backup_dir = os.path.join(storage_root, "backups", tenant.name.lower().replace(" ", "_"))
    os.makedirs(backup_dir, exist_ok=True)
    
    # Source path
    db_path = tenant.db_url.replace("sqlite+aiosqlite:///", "")
    if not os.path.exists(db_path):
        raise HTTPException(400, "Source database file not found")
        
    # Destination path
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"backup_{timestamp}.db")
    
    # We use VACUUM INTO for a safe, consistent online backup if possible
    # But since we are using aiosqlite, we can trigger this via a session
    tenant_engine = get_tenant_engine(tenant.db_url)
    session_factory = async_sessionmaker(bind=tenant_engine, class_=AsyncSession)
    
    try:
        async with session_factory() as tenant_db:
            # SQLite safe backup command
            await tenant_db.execute(text(f"VACUUM INTO '{backup_path}'"))
        return {"status": "success", "path": backup_path}
    except Exception as e:
        # Fallback to simple copy if VACUUM INTO fails (e.g. older sqlite)
        import shutil
        try:
            shutil.copy2(db_path, backup_path)
            return {"status": "success", "path": backup_path, "note": "fallback copy used"}
        except Exception as copy_err:
            raise HTTPException(500, detail=f"Backup failed: {str(e)} | Fallback failed: {str(copy_err)}")

@router.get("/admin/all", response_model=List[TenantResponse])
async def list_all_tenants(db: AsyncSession = Depends(get_config_db)):
    result = await db.execute(select(Tenant))
    tenants = result.scalars().all()
    
    # Get storage root to check for backups
    res_root = await db.execute(select(MasterSystemSetting).filter(MasterSystemSetting.key == "tenant_storage_root"))
    storage_root = res_root.scalar_one().value
    
    # Enrich with backup info and actual disk status
    enriched = []
    for t in tenants:
        db_path = t.db_url.replace("sqlite+aiosqlite:///", "")
        is_online = os.path.exists(db_path)
        
        # Check last backup
        last_backup = None
        backup_dir = os.path.join(storage_root, "backups", t.name.lower().replace(" ", "_"))
        if os.path.exists(backup_dir):
            backups = sorted([f for f in os.listdir(backup_dir) if f.endswith(".db")], reverse=True)
            if backups:
                # Extract timestamp from backup_YYYYMMDD_HHMMSS.db
                import datetime
                try:
                    ts_str = backups[0].replace("backup_", "").replace(".db", "")
                    last_backup = datetime.datetime.strptime(ts_str, "%Y%m%d_%H%M%S")
                except:
                    pass
        
        # We need to manually construct the response object because TenantResponse doesn't have is_online
        # Wait, TenantResponse has is_active but that's a DB field. Let's add is_online and last_backup to schema.
        enriched.append({
            "id": t.id,
            "name": t.name,
            "db_url": t.db_url,
            "is_active": t.is_active,
            "is_online": is_online,
            "last_backup": last_backup,
            "created_at": t.created_at
        })
    return enriched

import asyncio

async def run_alembic_upgrade(db_url: str):
    """Runs alembic upgrade head on a specific database file non-blockingly."""
    # Convert async url to sync for alembic
    # sqlite+aiosqlite:///path -> sqlite:///path
    sync_url = db_url.replace("sqlite+aiosqlite", "sqlite")
    
    # CORRECT PATH: tenants.py is in backend/app/api/, so we need to go 3 levels up to reach backend/
    api_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(api_dir)
    backend_dir = os.path.dirname(app_dir)
    
    env = os.environ.copy()
    env["SQLALCHEMY_DATABASE_URL"] = sync_url
    
    process = await asyncio.create_subprocess_exec(
        sys.executable, "-m", "alembic", "upgrade", "head",
        cwd=backend_dir,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    
    if process.returncode != 0:
        error_msg = stderr.decode()
        print(f"ALEMBIC ERROR: {error_msg}")
        return False, error_msg
    return True, stdout.decode()

@router.post("/admin/create", response_model=TenantResponse)
async def create_tenant(tenant_in: TenantCreate, db: AsyncSession = Depends(get_config_db), request: Request = None):
    # 1. Get storage root
    res = await db.execute(select(MasterSystemSetting).filter(MasterSystemSetting.key == "tenant_storage_root"))
    storage_root = res.scalar_one().value
    
    # Ensure root exists
    if not os.path.exists(storage_root):
        try:
            os.makedirs(storage_root, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create storage root: {str(e)}")
    
    # Case-insensitive check and filename normalization
    import re
    tenant_name_clean = tenant_in.name.strip()
    if not tenant_name_clean:
        raise HTTPException(status_code=400, detail="Tenant name cannot be empty")
        
    # Sanitize for filesystem safety and prevent path traversal
    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '', tenant_name_clean.replace(' ', '_')).lower()
    if not safe_name:
        raise HTTPException(status_code=400, detail="Tenant name contains no valid characters for database identification")
        
    db_filename = f"{safe_name}.db"
    db_path = os.path.join(storage_root, db_filename)
    db_url = f"sqlite+aiosqlite:///{db_path}"

    # 2. Check if already exists (Case Insensitive)
    res = await db.execute(select(Tenant).filter(func.lower(Tenant.name) == tenant_name_clean.lower()))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant name already exists")
    
    if os.path.exists(db_path):
        raise HTTPException(status_code=400, detail="Database file already exists on disk. Please use a unique name.")

    # 3. Create file and run migrations
    success, error = await run_alembic_upgrade(db_url)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to initialize database: {error}")

    # 4. Seed the new database with default settings/roles
    from ..main import _auto_seed
    user_id = get_current_user_id(request)
    tenant_engine = get_tenant_engine(db_url)
    session_factory = async_sessionmaker(bind=tenant_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as tenant_db:
        await _auto_seed(tenant_db, creator_id=user_id)

    # 5. Register in config.db
    new_tenant = Tenant(name=tenant_name_clean, db_url=db_url)
    db.add(new_tenant)
    await db.commit()
    await db.refresh(new_tenant)

    # 6. Auto-grant access to the creator
    user_id = get_current_user_id(request)
    access = UserTenantAccess(user_id=user_id, tenant_id=new_tenant.id, role="ADMIN", is_selected=True)
    
    # Unselect others
    await db.execute(update(UserTenantAccess).where(UserTenantAccess.user_id == user_id).values(is_selected=False))
    
    db.add(access)
    await db.commit()

    return new_tenant

@router.post("/admin/preflight", response_model=PreflightResponse)
async def preflight_check(req: PreflightRequest):
    """
    Checks if a database file exists and validates its schema compatibility.
    """
    db_path = req.db_path.strip()
    if not os.path.isabs(db_path):
        # If relative, check in storage root
        # We'll just enforce absolute paths for preflight from UI for now
        pass
        
    if not os.path.exists(db_path):
        return {
            "status": "Error",
            "is_valid": False,
            "table_count": 0,
            "message": f"File not found: {db_path}"
        }
        
    db_url = f"sqlite+aiosqlite:///{db_path}"
    engine = get_tenant_engine(db_url)
    
    try:
        async with engine.connect() as conn:
            # 1. Check table count
            res = await conn.execute(text("SELECT count(*) FROM sqlite_master WHERE type='table'"))
            table_count = res.scalar()
            
            # 2. Check for alembic_version
            res = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version'"))
            has_alembic = res.scalar_one_or_none()
            
            schema_version = "Unknown"
            if has_alembic:
                res = await conn.execute(text("SELECT version_num FROM alembic_version"))
                schema_version = res.scalar()
            
            # 3. Check for core tables
            res = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='devices'"))
            has_devices = res.scalar_one_or_none()
            
            if not has_devices and table_count > 0:
                return {
                    "status": "Incompatible",
                    "is_valid": False,
                    "schema_version": schema_version,
                    "table_count": table_count,
                    "message": "Database exists but missing core SysGrid tables (e.g. 'devices')."
                }
                
            return {
                "status": "Healthy" if has_devices else "Empty",
                "is_valid": True,
                "schema_version": schema_version,
                "table_count": table_count,
                "message": "Database is compatible and ready to be linked." if has_devices else "Database is empty but valid for initialization."
            }
    except Exception as e:
        return {
            "status": "Corrupt",
            "is_valid": False,
            "table_count": 0,
            "message": f"Connection failed: {str(e)}"
        }

@router.post("/admin/attach", response_model=TenantResponse)
async def attach_tenant(tenant_in: TenantAttach, db: AsyncSession = Depends(get_config_db), request: Request = None):
    """
    Links an existing database file on disk to the registry.
    """
    db_path = tenant_in.db_path.strip()
    if not os.path.exists(db_path):
        raise HTTPException(status_code=400, detail=f"Database file not found: {db_path}")
        
    db_url = f"sqlite+aiosqlite:///{db_path}"
    
    # 1. Check if already exists in registry
    res = await db.execute(select(Tenant).filter(func.lower(Tenant.name) == tenant_in.name.lower()))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant name already exists in registry")
        
    res = await db.execute(select(Tenant).filter(Tenant.db_url == db_url))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This database path is already registered under a different name")

    # 2. Run migrations (idempotent) to ensure it's up to date
    success, error = await run_alembic_upgrade(db_url)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to synchronize schema: {error}")

    # 3. Seed if necessary (ensure default roles/settings exist)
    from ..main import _auto_seed
    user_id = get_current_user_id(request)
    tenant_engine = get_tenant_engine(db_url)
    session_factory = async_sessionmaker(bind=tenant_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as tenant_db:
        await _auto_seed(tenant_db, creator_id=user_id)

    # 4. Register
    new_tenant = Tenant(name=tenant_in.name, db_url=db_url)
    db.add(new_tenant)
    await db.commit()
    await db.refresh(new_tenant)

    # 5. Grant access
    access = UserTenantAccess(user_id=user_id, tenant_id=new_tenant.id, role="ADMIN", is_selected=True)
    await db.execute(update(UserTenantAccess).where(UserTenantAccess.user_id == user_id).values(is_selected=False))
    db.add(access)
    await db.commit()

    return new_tenant

@router.get("/me", response_model=List[UserTenantResponse])
async def get_my_tenants(db: AsyncSession = Depends(get_config_db), request: Request = None):
    user_id = get_current_user_id(request)
    
    # Check if user has ANY access. If not, auto-grant default engine access
    res = await db.execute(select(UserTenantAccess).filter(UserTenantAccess.user_id == user_id))
    if not res.scalars().first():
        # Get default tenant ID
        res_default = await db.execute(select(Tenant).filter(Tenant.name == "Default Engine"))
        default_tenant = res_default.scalar_one_or_none()
        if default_tenant:
            db.add(UserTenantAccess(user_id=user_id, tenant_id=default_tenant.id, role="ADMIN", is_selected=True))
            await db.commit()

    stmt = (
        select(Tenant.id, Tenant.name, UserTenantAccess.role, UserTenantAccess.is_selected, Tenant.db_url)
        .join(UserTenantAccess)
        .filter(UserTenantAccess.user_id == user_id)
    )
    result = await db.execute(stmt)
    
    my_tenants = []
    for r in result.all():
        db_path = r[4].replace("sqlite+aiosqlite:///", "")
        is_online = os.path.exists(db_path)
        my_tenants.append({
            "id": r[0], 
            "name": r[1], 
            "role": r[2], 
            "is_selected": r[3],
            "is_online": is_online
        })
    return my_tenants

@router.post("/select")
async def select_tenant(selection: UserTenantSelection, db: AsyncSession = Depends(get_config_db), request: Request = None):
    user_id = get_current_user_id(request)
    
    # Verify access
    res = await db.execute(
        select(UserTenantAccess)
        .filter(UserTenantAccess.user_id == user_id, UserTenantAccess.tenant_id == selection.tenant_id)
    )
    access = res.scalar_one_or_none()
    if not access:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")

    # Update selection
    await db.execute(
        update(UserTenantAccess)
        .where(UserTenantAccess.user_id == user_id)
        .values(is_selected=False)
    )
    
    access.is_selected = True
    await db.commit()
    
    return {"status": "success", "tenant_id": selection.tenant_id}
