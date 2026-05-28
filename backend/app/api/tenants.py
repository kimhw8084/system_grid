from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert
from typing import List
import os
import subprocess
import sys
from ..database import get_config_db, get_db, ConfigSessionLocal
from ..models.config import Tenant, UserTenantAccess, MasterSystemSetting
from ..schemas.config import TenantCreate, TenantResponse, MasterSettingBase, UserTenantSelection, UserTenantResponse
from ..core.config import settings

router = APIRouter(prefix="/tenants", tags=["Multi-Tenancy"])

def get_current_user_id():
    # As per user directive: simple environment-based auth
    return os.getenv("USER_ID", "admin_root")

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

@router.get("/admin/all", response_model=List[TenantResponse])
async def list_all_tenants(db: AsyncSession = Depends(get_config_db)):
    result = await db.execute(select(Tenant))
    return result.scalars().all()

async def run_alembic_upgrade(db_url: str):
    """Runs alembic upgrade head on a specific database file."""
    # Convert async url to sync for alembic
    sync_url = db_url.replace("aiosqlite", "sqlite")
    
    # CORRECT PATH: tenants.py is in backend/app/api/, so we need to go 3 levels up to reach backend/
    api_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(api_dir)
    backend_dir = os.path.dirname(app_dir)
    
    # We use subprocess to run alembic to avoid conflicts with current async loop
    env = os.environ.copy()
    env["SQLALCHEMY_DATABASE_URL"] = sync_url
    
    process = subprocess.Popen(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_dir,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate()
    
    if process.returncode != 0:
        print(f"ALEMBIC ERROR: {stderr}")
        return False, stderr
    return True, stdout

@router.post("/admin/create", response_model=TenantResponse)
async def create_tenant(tenant_in: TenantCreate, db: AsyncSession = Depends(get_config_db)):
    # 1. Get storage root
    res = await db.execute(select(MasterSystemSetting).filter(MasterSystemSetting.key == "tenant_storage_root"))
    storage_root = res.scalar_one().value
    
    # Ensure root exists
    if not os.path.exists(storage_root):
        try:
            os.makedirs(storage_root, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create storage root: {str(e)}")
    
    db_filename = f"{tenant_in.name.lower().replace(' ', '_')}.sqlite"
    db_path = os.path.join(storage_root, db_filename)
    db_url = f"sqlite+aiosqlite:///{db_path}"

    # 2. Check if already exists
    res = await db.execute(select(Tenant).filter(Tenant.name == tenant_in.name))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant name already exists")

    # 3. Create file and run migrations
    success, error = await run_alembic_upgrade(db_url)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to initialize database: {error}")

    # 4. Register in config.db
    new_tenant = Tenant(name=tenant_in.name, db_url=db_url)
    db.add(new_tenant)
    await db.commit()
    await db.refresh(new_tenant)

    # 5. Auto-grant access to the creator
    user_id = get_current_user_id()
    access = UserTenantAccess(user_id=user_id, tenant_id=new_tenant.id, role="ADMIN", is_selected=True)
    
    # Unselect others
    await db.execute(update(UserTenantAccess).where(UserTenantAccess.user_id == user_id).values(is_selected=False))
    
    db.add(access)
    await db.commit()

    return new_tenant

@router.get("/me", response_model=List[UserTenantResponse])
async def get_my_tenants(db: AsyncSession = Depends(get_config_db)):
    user_id = get_current_user_id()
    
    # Check if this is the first time for the user and if they are an admin, maybe grant them default access?
    # For now, just return what's in the table
    stmt = (
        select(Tenant.id, Tenant.name, UserTenantAccess.role, UserTenantAccess.is_selected)
        .join(UserTenantAccess)
        .filter(UserTenantAccess.user_id == user_id)
    )
    result = await db.execute(stmt)
    return [
        {"id": r[0], "name": r[1], "role": r[2], "is_selected": r[3]}
        for r in result.all()
    ]

@router.post("/select")
async def select_tenant(selection: UserTenantSelection, db: AsyncSession = Depends(get_config_db)):
    user_id = get_current_user_id()
    
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
