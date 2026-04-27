import os
import io
import json
import pandas as pd
import numpy as np
import sys
import datetime
import sqlalchemy as sa
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, desc
from ..database import get_db
from ..models import models
from ..core.config import settings as app_settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class EnvUpdate(BaseModel):
    # Core Engine Envs
    api_endpoint: str | None = None
    db_path: str | None = None
    storage_root: str | None = None
    image_path: str | None = None
    backup_path: str | None = None
    scripts_path: str | None = None
    user_pool_path: str | None = None
    log_level: str | None = None
    venv_path: str | None = None
    backend_port: int | None = None
    
    # Innovative Global Envs
    ui_timeout: int | None = None
    ui_backend_url: str | None = None
    ui_debug_logging: bool | None = None
    hot_reload_enabled: bool | None = None
    feature_flags: dict | None = None
    auth_secret: str | None = None
    session_expiry: int | None = None # Minutes

    # New Backend Management Envs
    max_upload_size: int | None = None
    worker_count: int | None = None
    cache_ttl: int | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    alert_email: str | None = None
    enable_audit_logs: bool | None = None
    db_backup_schedule: str | None = None
    token_algorithm: str | None = None
    request_timeout: int | None = None

    # New Frontend Management Envs
    app_title: str | None = None
    polling_interval: int | None = None
    enable_analytics: bool | None = None
    max_grid_rows: int | None = None
    theme_default: str | None = None
    maintenance_mode: bool | None = None
    support_url: str | None = None
    auto_logout_idle: int | None = None
    toast_duration: int | None = None
    enable_websockets: bool | None = None

class PoolSync(BaseModel):
    script: str

@router.get("/user/profile")
async def get_user_profile():
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown Operator"
    return {
        "username": username,
        "role": "Lead Systems Engineer",
        "avatar": None,
        "department": "Infrastructure Ops"
    }

def read_dotenv(path):
    env = {}
    if os.path.exists(path):
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        env[parts[0]] = parts[1].strip('"').strip("'")
    return env

@router.get("/env")
async def get_env_vars():
    # Load from actual .env files to ensure synchronization
    backend_path = os.path.abspath(".env")
    frontend_path = os.path.abspath("../frontend/.env")
    
    backend_env = read_dotenv(backend_path)
    frontend_env = read_dotenv(frontend_path)
    
    # Define the mapping of internal keys to .env keys and files
    # This structure allows us to track exactly which parameter is being updated in which file
    mapping = {
        "api_endpoint": {"key": "API_ENDPOINT", "file": backend_path, "default": "http://localhost:8000"},
        "db_path": {"key": "DATABASE_URL", "file": backend_path, "default": "sqlite+aiosqlite:///./system_grid.db"},
        "storage_root": {"key": "STORAGE_ROOT", "file": backend_path, "default": "./storage"},
        "image_path": {"key": "IMAGE_PATH", "file": backend_path, "default": "./storage/images"},
        "backup_path": {"key": "BACKUP_PATH", "file": backend_path, "default": "./backups"},
        "scripts_path": {"key": "SCRIPTS_PATH", "file": backend_path, "default": "./scripts"},
        "user_pool_path": {"key": "USER_POOL_PATH", "file": backend_path, "default": "./storage/user_pool.json"},
        "log_level": {"key": "LOG_LEVEL", "file": backend_path, "default": "INFO"},
        "venv_path": {"key": "VENV_PATH", "file": backend_path, "default": "./venv"},
        "backend_port": {"key": "PORT", "file": backend_path, "default": "8000"},
        
        # Innovative Params (Cross-linked)
        "ui_timeout": {"key": "VITE_UI_TIMEOUT", "file": frontend_path, "alt_key": "UI_TIMEOUT", "alt_file": backend_path, "default": "30000"},
        "ui_backend_url": {"key": "VITE_API_BASE_URL", "file": frontend_path, "alt_key": "UI_BACKEND_URL", "alt_file": backend_path, "default": ""},
        "ui_debug_logging": {"key": "VITE_UI_DEBUG_LOGGING", "file": frontend_path, "alt_key": "UI_DEBUG_LOGGING", "alt_file": backend_path, "default": "false"},
        "hot_reload_enabled": {"key": "HOT_RELOAD_ENABLED", "file": backend_path, "default": "true"},
        "feature_flags": {"key": "FEATURE_FLAGS", "file": backend_path, "default": "{}"},
        "auth_secret": {"key": "AUTH_SECRET", "file": backend_path, "default": "change-me-immediately"},
        "session_expiry": {"key": "SESSION_EXPIRY", "file": backend_path, "default": "1440"},

        # Backend New
        "max_upload_size": {"key": "MAX_UPLOAD_SIZE", "file": backend_path, "default": "50"},
        "worker_count": {"key": "WORKER_COUNT", "file": backend_path, "default": "4"},
        "cache_ttl": {"key": "CACHE_TTL", "file": backend_path, "default": "3600"},
        "smtp_host": {"key": "SMTP_HOST", "file": backend_path, "default": "localhost"},
        "smtp_port": {"key": "SMTP_PORT", "file": backend_path, "default": "1025"},
        "alert_email": {"key": "ALERT_EMAIL", "file": backend_path, "default": "admin@sysgrid.local"},
        "enable_audit_logs": {"key": "ENABLE_AUDIT_LOGS", "file": backend_path, "default": "true"},
        "db_backup_schedule": {"key": "DB_BACKUP_SCHEDULE", "file": backend_path, "default": "0 0 * * *"},
        "token_algorithm": {"key": "TOKEN_ALGORITHM", "file": backend_path, "default": "HS256"},
        "request_timeout": {"key": "REQUEST_TIMEOUT", "file": backend_path, "default": "60"},

        # Frontend New
        "app_title": {"key": "VITE_APP_TITLE", "file": frontend_path, "default": "SYSGRID Tactical"},
        "polling_interval": {"key": "VITE_POLLING_INTERVAL", "file": frontend_path, "default": "5000"},
        "enable_analytics": {"key": "VITE_ENABLE_ANALYTICS", "file": frontend_path, "default": "false"},
        "max_grid_rows": {"key": "VITE_MAX_GRID_ROWS", "file": frontend_path, "default": "100"},
        "theme_default": {"key": "VITE_THEME_DEFAULT", "file": frontend_path, "default": "nordic-frost-v1"},
        "maintenance_mode": {"key": "VITE_MAINTENANCE_MODE", "file": frontend_path, "default": "false"},
        "support_url": {"key": "VITE_SUPPORT_URL", "file": frontend_path, "default": "https://support.sysgrid.local"},
        "auto_logout_idle": {"key": "VITE_AUTO_LOGOUT_IDLE", "file": frontend_path, "default": "3600"},
        "toast_duration": {"key": "VITE_TOAST_DURATION", "file": frontend_path, "default": "3000"},
        "enable_websockets": {"key": "VITE_ENABLE_WEBSOCKETS", "file": frontend_path, "default": "true"}
    }
    
    env_data = {}
    metadata = {}
    
    for field, cfg in mapping.items():
        val = None
        # Try primary file
        if cfg["file"] == backend_path:
            val = backend_env.get(cfg["key"])
        else:
            val = frontend_env.get(cfg["key"])
            
        # Try alternate file if missing
        if val is None and "alt_key" in cfg:
            if cfg["alt_file"] == backend_path:
                val = backend_env.get(cfg["alt_key"])
            else:
                val = frontend_env.get(cfg["alt_key"])
                
        # Final fallback to default
        final_val = val if val is not None else cfg["default"]
        
        # Type conversions
        if cfg["key"] in ["PORT", "UI_TIMEOUT", "VITE_UI_TIMEOUT", "SESSION_EXPIRY", "MAX_UPLOAD_SIZE", "WORKER_COUNT", "CACHE_TTL", "SMTP_PORT", "REQUEST_TIMEOUT", "VITE_POLLING_INTERVAL", "VITE_MAX_GRID_ROWS", "VITE_AUTO_LOGOUT_IDLE", "VITE_TOAST_DURATION"]:
            try: env_data[field] = int(final_val)
            except: env_data[field] = final_val
        elif final_val.lower() in ["true", "false"]:
            env_data[field] = final_val.lower() == "true"
        elif field == "feature_flags":
            try: env_data[field] = json.loads(final_val)
            except: env_data[field] = {}
        else:
            env_data[field] = final_val
            
        metadata[field] = {
            "param": cfg["key"],
            "file": cfg["file"],
            "is_backend": cfg["file"] == backend_path
        }
    
    # Outer Join: Add variables from .env files that are NOT in the mapping
    raw_env = {
        "backend": {k: {"value": v, "file": backend_path} for k, v in backend_env.items()},
        "frontend": {k: {"value": v, "file": frontend_path} for k, v in frontend_env.items()}
    }
    
    # Calculate Absolute Paths for specific filesystem pointers
    db_raw_path = env_data["db_path"].replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
    
    abs_paths = {
        "env_file": backend_path,
        "frontend_env": frontend_path,
        "db_path": os.path.abspath(db_raw_path),
        "storage_root": os.path.abspath(env_data["storage_root"]),
        "image_path": os.path.abspath(env_data["image_path"]),
        "backup_path": os.path.abspath(env_data["backup_path"]),
        "scripts_path": os.path.abspath(env_data["scripts_path"]),
        "user_pool_path": os.path.abspath(env_data["user_pool_path"]),
        "venv_path": os.path.abspath(env_data["venv_path"])
    }
    
    return {
        **env_data, 
        "_metadata": metadata, 
        "_abs_paths": abs_paths,
        "_raw_env": raw_env
    }

@router.get("/env/history")
async def get_env_history(field: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.EnvHistory)
        .filter(models.EnvHistory.field == field)
        .order_by(models.EnvHistory.timestamp.desc())
        .limit(20)
    )
    history = result.scalars().all()
    return [{
        "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "old_value": h.old_value,
        "new_value": h.new_value,
        "user": h.user
    } for h in history]

@router.post("/env")
async def update_env_vars(data: EnvUpdate, db: AsyncSession = Depends(get_db)):
    # Mapping for backend .env
    backend_mapping = {
        "api_endpoint": "API_ENDPOINT",
        "db_path": "DATABASE_URL",
        "storage_root": "STORAGE_ROOT",
        "image_path": "IMAGE_PATH",
        "backup_path": "BACKUP_PATH",
        "scripts_path": "SCRIPTS_PATH",
        "user_pool_path": "USER_POOL_PATH",
        "log_level": "LOG_LEVEL",
        "venv_path": "VENV_PATH",
        "backend_port": "PORT",
        "ui_timeout": "UI_TIMEOUT",
        "ui_backend_url": "UI_BACKEND_URL",
        "ui_debug_logging": "UI_DEBUG_LOGGING",
        "hot_reload_enabled": "HOT_RELOAD_ENABLED",
        "feature_flags": "FEATURE_FLAGS",
        "auth_secret": "AUTH_SECRET",
        "session_expiry": "SESSION_EXPIRY",
        "max_upload_size": "MAX_UPLOAD_SIZE",
        "worker_count": "WORKER_COUNT",
        "cache_ttl": "CACHE_TTL",
        "smtp_host": "SMTP_HOST",
        "smtp_port": "SMTP_PORT",
        "alert_email": "ALERT_EMAIL",
        "enable_audit_logs": "ENABLE_AUDIT_LOGS",
        "db_backup_schedule": "DB_BACKUP_SCHEDULE",
        "token_algorithm": "TOKEN_ALGORITHM",
        "request_timeout": "REQUEST_TIMEOUT"
    }

    # Mapping for frontend .env
    frontend_mapping = {
        "ui_backend_url": "VITE_API_BASE_URL",
        "backend_port": "VITE_BACKEND_PORT",
        "ui_timeout": "VITE_UI_TIMEOUT",
        "ui_debug_logging": "VITE_UI_DEBUG_LOGGING",
        "app_title": "VITE_APP_TITLE",
        "polling_interval": "VITE_POLLING_INTERVAL",
        "enable_analytics": "VITE_ENABLE_ANALYTICS",
        "max_grid_rows": "VITE_MAX_GRID_ROWS",
        "theme_default": "VITE_THEME_DEFAULT",
        "maintenance_mode": "VITE_MAINTENANCE_MODE",
        "support_url": "VITE_SUPPORT_URL",
        "auto_logout_idle": "VITE_AUTO_LOGOUT_IDLE",
        "toast_duration": "VITE_TOAST_DURATION",
        "enable_websockets": "VITE_ENABLE_WEBSOCKETS"
    }
    
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown Operator"
    backend_env_path = ".env"
    frontend_env_path = "../frontend/.env"
    
    current_backend = read_dotenv(backend_env_path)
    current_frontend = read_dotenv(frontend_env_path)
    
    update_dict = data.dict(exclude_unset=True)
    
    # Process updates
    for feat, val in update_dict.items():
        # Backend updates
        if feat in backend_mapping:
            env_key = backend_mapping[feat]
            new_val = val
            
            # Special Handling for DB Path
            if feat == "db_path" and new_val:
                if not new_val.startswith("sqlite"):
                    new_val = f"sqlite+aiosqlite:///{new_val}"
            
            # Convert to string
            if isinstance(new_val, (dict, list)):
                new_val_str = json.dumps(new_val)
            elif isinstance(new_val, bool):
                new_val_str = str(new_val).lower()
            else:
                new_val_str = str(new_val)
            
            old_val = current_backend.get(env_key, "")
            if new_val_str != old_val:
                db.add(models.EnvHistory(field=feat, old_value=old_val or "INITIAL", new_value=new_val_str, user=username))
                current_backend[env_key] = new_val_str
                os.environ[env_key] = new_val_str
                
                # Hot Reload in-memory settings
                if hasattr(app_settings, env_key):
                    try: setattr(app_settings, env_key, new_val)
                    except: pass

        # Frontend updates
        if feat in frontend_mapping:
            env_key = frontend_mapping[feat]
            new_val_str = str(val).lower() if isinstance(val, bool) else str(val)
            if val is None: new_val_str = "" # Support empty URL for proxying
            current_frontend[env_key] = new_val_str

    # Refresh DB engine if path changed
    if "db_path" in update_dict:
        from ..database import refresh_engine
        refresh_engine()
    
    await db.commit()

    # Write Backend .env with atomic safety
    temp_backend = backend_env_path + ".tmp"
    with open(temp_backend, "w") as f:
        f.write("# SYSGRID AUTO-GENERATED BACKEND CONFIG\n")
        f.write(f"# UPDATED_BY: {username} AT {datetime.datetime.now().isoformat()}\n")
        # Preserve original keys that might not be in our mapping but are in the file
        for k, v in sorted(current_backend.items()):
            f.write(f"{k}={v}\n")
    os.replace(temp_backend, backend_env_path)
            
    # Write Frontend .env with atomic safety
    if os.path.exists(os.path.dirname(frontend_env_path)):
        temp_frontend = frontend_env_path + ".tmp"
        with open(temp_frontend, "w") as f:
            f.write("# SYSGRID AUTO-GENERATED FRONTEND CONFIG\n")
            f.write(f"# UPDATED_BY: {username} AT {datetime.datetime.now().isoformat()}\n")
            for k, v in sorted(current_frontend.items()):
                f.write(f"{k}={v}\n")
        os.replace(temp_frontend, frontend_env_path)
            
    return {"status": "success", "message": "Environment synchronized successfully"}
            
    return {"status": "success", "message": "Environment synchronized successfully"}

@router.post("/user-pool/refresh")
async def refresh_user_pool(data: PoolSync, db: AsyncSession = Depends(get_db)):
    try:
        username = os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown Operator"
        
        # Ensure pandas and numpy are available
        exec_globals = {
            "pd": pd, 
            "np": np,
            "os": os,
            "json": json,
            "__builtins__": __builtins__
        }
            
        exec(data.script, exec_globals)
        
        if "result_df" not in exec_globals:
            raise HTTPException(400, "Script must define 'result_df' variable")
            
        df = exec_globals["result_df"]
        if not isinstance(df, pd.DataFrame):
            raise HTTPException(400, "'result_df' must be a Pandas DataFrame")
            
        required = ["id", "username", "email", "department", "registration_status"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(400, f"DataFrame missing required columns: {missing}")
            
        new_users = df.to_dict(orient="records")
        
        # Sync to Operator table
        added, removed, changed = [], [], []
        
        # Load current active users for diff
        pool_file = os.getenv("USER_POOL_PATH", "./storage/user_pool.json")
        current_users = []
        if os.path.exists(pool_file):
            try:
                current_users = pd.read_json(pool_file).to_dict(orient="records")
            except:
                pass

        curr_ids = {str(u['id']): u for u in current_users}
        new_ids = {str(u['id']): u for u in new_users}
        
        for uid, u in new_ids.items():
            stmt = select(models.Operator).filter(models.Operator.external_id == uid)
            res = await db.execute(stmt)
            op = res.scalar_one_or_none()
            
            if op:
                has_changes = False
                if op.username != u['username']: has_changes = True
                if op.email != u['email']: has_changes = True
                
                op.username = u['username']
                op.email = u['email']
                op.department = u['department']
                op.registration_status = u['registration_status']
                op.full_name = u.get('full_name', u['username'])
                if has_changes: changed.append(u['username'])
            else:
                new_op = models.Operator(
                    external_id=uid,
                    username=u['username'],
                    email=u['email'],
                    department=u['department'],
                    registration_status=u['registration_status'],
                    full_name=u.get('full_name', u['username'])
                )
                db.add(new_op)
                added.append(u['username'])

        removed_list = [u['username'] for uid, u in curr_ids.items() if uid not in new_ids]

        # Create Version Snapshot
        version_label = f"v{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        version = models.UserPoolVersion(
            version_label=version_label,
            snapshot_data=new_users,
            diff_summary={
                "added": len(added), 
                "removed": len(removed_list), 
                "changed": len(changed), 
                "script": data.script
            },
            created_by=username,
            is_active=True
        )
        
        # Deactivate old versions
        await db.execute(update(models.UserPoolVersion).values(is_active=False))
        db.add(version)

        # Persist to disk for current usage
        os.makedirs(os.path.dirname(pool_file), exist_ok=True)
        df.to_json(pool_file, orient="records")
        
        await db.commit()
        
        return {
            "status": "success", 
            "count": len(df), 
            "version": version.version_label,
            "diff": version.diff_summary
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, f"Python Execution Error: {str(e)}")

@router.get("/user-pool/versions")
async def get_user_pool_versions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.UserPoolVersion).order_by(desc(models.UserPoolVersion.created_at)).limit(50))
    return result.scalars().all()

@router.post("/user-pool/restore/{version_id}")
async def restore_user_pool(version_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.UserPoolVersion).filter(models.UserPoolVersion.id == version_id))
    version = result.scalar_one_or_none()
    if not version: raise HTTPException(404, "Version not found")
    
    # Restore Operators from snapshot_data
    for u in version.snapshot_data:
        stmt = select(models.Operator).filter(models.Operator.external_id == str(u['id']))
        res = await db.execute(stmt)
        op = res.scalar_one_or_none()
        if op:
            op.username = u['username']
            op.email = u['email']
            op.department = u['department']
            op.registration_status = u['registration_status']
            op.full_name = u.get('full_name', u['username'])
        else:
            new_op = models.Operator(
                external_id=str(u['id']),
                username=u['username'],
                email=u['email'],
                department=u['department'],
                registration_status=u['registration_status'],
                full_name=u.get('full_name', u['username'])
            )
            db.add(new_op)
    
    # Save back to JSON
    pool_file = os.getenv("USER_POOL_PATH", "./storage/user_pool.json")
    os.makedirs(os.path.dirname(pool_file), exist_ok=True)
    pd.DataFrame(version.snapshot_data).to_json(pool_file, orient="records")

    await db.execute(update(models.UserPoolVersion).values(is_active=False))
    version.is_active = True
    await db.commit()
    return {"status": "success"}

@router.get("/operators")
async def get_operators(db: AsyncSession = Depends(get_db)):
    # FIXED: Use sa.orm.joinedload since sa is now imported
    result = await db.execute(select(models.Operator).options(sa.orm.joinedload(models.Operator.role)))
    return result.scalars().all()

@router.put("/operators/{op_id}")
async def update_operator(op_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    stmt = select(models.Operator).filter(models.Operator.id == op_id)
    res = await db.execute(stmt)
    op = res.scalar_one_or_none()
    if not op: raise HTTPException(404, "Operator not found")
    
    for k, v in data.items():
        if hasattr(op, k):
            setattr(op, k, v)
    
    await db.commit()
    return op

@router.get("/roles")
async def get_roles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Role))
    return result.scalars().all()

@router.post("/roles")
async def create_role(data: dict, db: AsyncSession = Depends(get_db)):
    role = models.Role(name=data["name"], permissions=data.get("permissions", {}))
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role

@router.put("/roles/{role_id}")
async def update_role(role_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    stmt = select(models.Role).filter(models.Role.id == role_id)
    res = await db.execute(stmt)
    role = res.scalar_one_or_none()
    if not role: raise HTTPException(404, "Role not found")
    
    if "name" in data: role.name = data["name"]
    if "permissions" in data: role.permissions = data["permissions"]
    
    await db.commit()
    return role

@router.get("/user-pool")
async def get_user_pool():
    pool_file = os.getenv("USER_POOL_PATH", "./storage/user_pool.json")
    if not os.path.exists(pool_file):
        return []
    try:
        return pd.read_json(pool_file).to_dict(orient="records")
    except:
        return []

@router.get("/user/settings")
async def get_user_settings():
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "default"
    settings_dir = "./storage/user_settings"
    os.makedirs(settings_dir, exist_ok=True)
    settings_file = os.path.join(settings_dir, f"{username}.json")
    
    if os.path.exists(settings_file):
        with open(settings_file, "r") as f:
            return json.load(f)
    return {"theme": "nordic-frost-v1", "sidebar_open": True}

@router.post("/user/settings")
async def update_user_settings(data: dict):
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "default"
    settings_dir = "./storage/user_settings"
    os.makedirs(settings_dir, exist_ok=True)
    settings_file = os.path.join(settings_dir, f"{username}.json")
    
    current = {}
    if os.path.exists(settings_file):
        with open(settings_file, "r") as f:
            current = json.load(f)
            
    current.update(data)
    with open(settings_file, "w") as f:
        json.dump(current, f)
    return {"status": "success"}

@router.get("/user/env-vars")
async def get_linux_env_vars():
    important_keys = [
        "USER", "HOME", "PATH", "SHELL", "PWD", "LANG", "TERM", 
        "LOGNAME", "HOSTNAME", "PYTHONPATH", "LD_LIBRARY_PATH", 
        "EDITOR", "TZ", "DISPLAY", "XDG_RUNTIME_DIR", "SSH_AUTH_SOCK"
    ]
    import platform
    system_info = {
        "OS_SYSTEM": platform.system(),
        "OS_RELEASE": platform.release(),
        "PYTHON_VERSION": sys.version.split()[0]
    }
    env_vars = {k: os.environ.get(k, "Not Set") for k in important_keys}
    return {**env_vars, **system_info}

@router.get("/options")
async def get_options(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption))
    return result.scalars().all()

@router.post("/options")
async def create_option(data: dict, db: AsyncSession = Depends(get_db)):
    valid_keys = {c.name for c in models.SettingOption.__table__.columns}
    clean_data = {k: v for k, v in data.items() if k in valid_keys and k not in {"id", "created_at", "updated_at"}}
    opt = models.SettingOption(**clean_data)
    db.add(opt)
    await db.commit()
    await db.refresh(opt)
    return opt

@router.put("/options/{opt_id}")
async def update_option(opt_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption).filter(models.SettingOption.id == opt_id))
    opt = result.scalar_one_or_none()
    if not opt: raise HTTPException(404, "Option not found")
    
    for key, value in data.items():
        if hasattr(opt, key):
            setattr(opt, key, value)
            
    await db.commit()
    await db.refresh(opt)
    return opt

@router.delete("/options/{opt_id}")
async def delete_option(opt_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption).filter(models.SettingOption.id == opt_id))
    opt = result.scalar_one_or_none()
    if not opt: raise HTTPException(404, "Option not found")
    await db.delete(opt)
    await db.commit()
    return {"status": "success"}

@router.get("/ui")
async def get_ui_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == "UISettings"))
    opts = res.scalars().all()
    settings = {"status_badged": True, "status_colors": {}}
    for o in opts:
        if o.label == "status_badged": settings["status_badged"] = (o.value == "true")
        elif o.label.startswith("color_"): settings["status_colors"][o.label.replace("color_", "")] = o.value
    return settings

@router.post("/ui")
async def update_ui_settings(data: dict, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(models.SettingOption).where(models.SettingOption.category == "UISettings"))
    if "status_badged" in data:
        db.add(models.SettingOption(category="UISettings", label="status_badged", value="true" if data["status_badged"] else "false"))
    if "status_colors" in data:
        for k, v in data["status_colors"].items():
            db.add(models.SettingOption(category="UISettings", label=f"color_{k}", value=v))
    await db.commit()
    return {"status": "success"}

@router.get("/global")
async def get_global_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == "AppGlobal"))
    opts = res.scalars().all()
    settings = {
        "app_name": "SYSGRID ENGINE", "org_name": "Global Infrastructure Corp",
        "maintenance_mode": "false", "dashboard_refresh_interval": "60"
    }
    for o in opts: settings[o.label] = o.value
    return settings

@router.post("/global")
async def update_global_settings(data: dict, db: AsyncSession = Depends(get_db)):
    for k, v in data.items():
        res = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == "AppGlobal", models.SettingOption.label == k))
        opt = res.scalar_one_or_none()
        if opt: opt.value = str(v)
        else: db.add(models.SettingOption(category="AppGlobal", label=k, value=str(v)))
    await db.commit()
    return {"status": "success"}

@router.get("/initialize")
async def initialize_settings(db: AsyncSession = Depends(get_db)):
    return {"status": "already_initialized"}
