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
from ..schemas import schemas
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
    frontend_backend_port: int | None = None
    
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

@router.get("/bootstrap")
async def get_bootstrap_config(db: AsyncSession = Depends(get_db)):
    """Public endpoint for frontend to discover API URL and critical settings."""
    res = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.is_public == True))
    settings = res.scalars().all()
    
    if not settings:
        await initialize_settings(db)
        res = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.is_public == True))
        settings = res.scalars().all()
        
    return {s.key: s.value for s in settings}

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
async def get_env_vars(db: AsyncSession = Depends(get_db)):
    # Prioritize DB but show .env diff for audit
    backend_path = os.path.abspath(".env")
    frontend_path = os.path.abspath("../frontend/.env")
    
    backend_env = read_dotenv(backend_path)
    frontend_env = read_dotenv(frontend_path)
    
    res = await db.execute(select(models.GlobalSetting))
    db_settings = {s.key: s.value for s in res.scalars().all()}
    
    # If DB is empty, seed it
    if not db_settings:
        await initialize_settings(db)
        res = await db.execute(select(models.GlobalSetting))
        db_settings = {s.key: s.value for s in res.scalars().all()}

    return {
        "db": db_settings,
        "backend_env": backend_env,
        "frontend_env": frontend_env
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
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown Operator"
    update_dict = data.dict(exclude_unset=True)
    
    # Mapping for cross-compatibility with legacy .env keys
    mapping = {
        "api_endpoint": "API_ENDPOINT",
        "db_path": "DATABASE_URL",
        "app_title": "VITE_APP_TITLE",
        "theme_default": "VITE_THEME_DEFAULT",
        "maintenance_mode": "VITE_MAINTENANCE_MODE",
        "support_url": "VITE_SUPPORT_URL"
    }

    for feat, val in update_dict.items():
        db_key = mapping.get(feat, feat.upper())
        res = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.key == db_key))
        setting = res.scalar_one_or_none()
        
        old_val = setting.value if setting else "INITIAL"
        new_val = str(val)
        
        if old_val != new_val:
            if setting:
                setting.value = new_val
            else:
                db.add(models.GlobalSetting(
                    key=db_key, 
                    value=new_val, 
                    category="System",
                    is_public=db_key.startswith("VITE_")
                ))
            
            db.add(models.EnvHistory(field=db_key, old_value=old_val, new_value=new_val, user=username))

    await db.commit()
    return {"status": "success", "message": "Global settings updated in database"}

@router.get("/user/settings")
async def get_user_settings(db: AsyncSession = Depends(get_db)):
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "default"
    res = await db.execute(select(models.UserPreference).filter(models.UserPreference.user_id == username))
    prefs = res.scalars().all()
    
    default_prefs = {"theme": "nordic-frost-v1", "sidebar_open": "true", "density": "compact"}
    
    if not prefs:
        settings_dir = "./storage/user_settings"
        settings_file = os.path.join(settings_dir, f"{username}.json")
        if os.path.exists(settings_file):
            try:
                with open(settings_file, "r") as f:
                    legacy = json.load(f)
                    for k, v in legacy.items():
                        db.add(models.UserPreference(user_id=username, key=k, value=str(v)))
                    await db.commit()
                    return legacy
            except: pass
        return default_prefs
        
    return {p.key: p.value for p in prefs}

@router.post("/user/settings")
async def update_user_settings(data: dict, db: AsyncSession = Depends(get_db)):
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "default"
    for k, v in data.items():
        res = await db.execute(
            select(models.UserPreference)
            .filter(models.UserPreference.user_id == username, models.UserPreference.key == k)
        )
        pref = res.scalar_one_or_none()
        if pref:
            pref.value = str(v)
        else:
            db.add(models.UserPreference(user_id=username, key=k, value=str(v)))
    
    await db.commit()
    return {"status": "success"}

@router.post("/user-pool/refresh")
async def refresh_user_pool(data: PoolSync, db: AsyncSession = Depends(get_db)):
    try:
        username = os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown Operator"
        exec_globals = {"pd": pd, "np": np, "os": os, "json": json, "__builtins__": __builtins__}
        exec(data.script, exec_globals)
        
        if "result_df" not in exec_globals: raise HTTPException(400, "Script must define 'result_df' variable")
        df = exec_globals["result_df"]
        new_users = df.to_dict(orient="records")
        
        # Snapshot and Diff
        version_label = f"v{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        version = models.UserPoolVersion(version_label=version_label, snapshot_data=new_users, created_by=username, is_active=True)
        await db.execute(update(models.UserPoolVersion).values(is_active=False))
        db.add(version)
        await db.commit()
        return {"status": "success", "count": len(df)}
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, f"Python Execution Error: {str(e)}")

@router.get("/operators")
async def get_operators(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Operator).options(sa.orm.joinedload(models.Operator.role)))
    return result.scalars().all()

@router.get("/global")
async def get_global_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.GlobalSetting))
    settings = res.scalars().all()
    if not settings:
        await initialize_settings(db)
        res = await db.execute(select(models.GlobalSetting))
        settings = res.scalars().all()
    return {s.key: s.value for s in settings}

@router.post("/global")
async def update_global_settings(data: dict, db: AsyncSession = Depends(get_db)):
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown Operator"
    for k, v in data.items():
        res = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.key == k))
        setting = res.scalar_one_or_none()
        if setting: setting.value = str(v)
        else: db.add(models.GlobalSetting(key=k, value=str(v), category="General", is_public=k.startswith("VITE_")))
    await db.commit()
    return {"status": "success"}

@router.get("/initialize")
async def initialize_settings(db: AsyncSession = Depends(get_db)):
    backend_path = os.path.abspath(".env")
    frontend_path = os.path.abspath("../frontend/.env")
    backend_env = read_dotenv(backend_path)
    frontend_env = read_dotenv(frontend_path)
    merged = {**backend_env, **frontend_env}
    
    count = 0
    for k, v in merged.items():
        res = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.key == k))
        if not res.scalar_one_or_none():
            is_public = k.startswith("VITE_") or k in ["API_ENDPOINT", "PORT"]
            db.add(models.GlobalSetting(key=k, value=str(v), category="System", is_public=is_public))
            count += 1
    await db.commit()
    return {"status": "success", "seeded_count": count}

@router.get("/user/env-vars")
async def get_linux_env_vars():
    important_keys = ["USER", "HOME", "PATH", "SHELL", "PWD", "LANG", "TERM", "HOSTNAME"]
    return {k: os.environ.get(k, "Not Set") for k in important_keys}
