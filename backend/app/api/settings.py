import os
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from ..database import get_db
from ..models import models
from ..core.config import settings
from .utils import filter_valid_columns, get_current_user_id, build_default_operator_profile

router = APIRouter(prefix="/settings", tags=["Settings"])
LOCKED_MONITORING_OPTION_CATEGORIES = {"MonitoringSeverity", "MonitoringOwnerRole"}

async def ensure_admin_operator(db: AsyncSession, user_id: str):
    res_op = await db.execute(select(models.Operator).filter(models.Operator.username == user_id))
    operator = res_op.scalar_one_or_none()
    if not operator and settings.is_auto_admin_user(user_id):
        operator = models.Operator(**build_default_operator_profile(user_id))
        db.add(operator)
        await db.commit()
        await db.refresh(operator)
    elif operator and settings.is_auto_admin_user(user_id) and not operator.is_admin:
        operator.is_admin = True
        operator.custom_permissions = {"all": 3}
        await db.commit()
        await db.refresh(operator)
    return operator

async def record_team_audit(db: AsyncSession, team_id: int | None, action: str, actor: str, details: dict | None = None):
    db.add(models.TeamAudit(
        team_id=team_id,
        action=action,
        actor=actor,
        details=details or {}
    ))

async def resolve_team_assignment(
    db: AsyncSession,
    *,
    team_id: int | None = None,
    team_name: str | None = None,
    source: str = "manual",
    create_missing: bool = False,
):
    normalized_name = team_name.strip() if isinstance(team_name, str) and team_name.strip() else None
    team = None
    if team_id:
        res = await db.execute(select(models.Team).filter(models.Team.id == team_id))
        team = res.scalar_one_or_none()
    elif normalized_name:
        res = await db.execute(select(models.Team).filter(models.Team.name == normalized_name))
        team = res.scalar_one_or_none()

    if not team and normalized_name and create_missing:
        team = models.Team(name=normalized_name, source=source)
        db.add(team)
        await db.flush()
    elif not team and (team_id or normalized_name):
        raise HTTPException(status_code=400, detail="Team not found")

    return team

@router.get("/user/settings")
async def get_user_settings(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_current_user_id(request)
    res = await db.execute(select(models.UserPreference).filter(models.UserPreference.user_id == user_id))
    prefs = res.scalars().all()
    return {p.key: p.value for p in prefs}

@router.get("/user/profile")
async def get_user_profile(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_current_user_id(request)
    # Attempt to find the operator by username
    from sqlalchemy.orm import selectinload
    res = await db.execute(select(models.Operator).options(selectinload(models.Operator.role)).filter(models.Operator.username == user_id))
    operator = res.scalar_one_or_none()
    
    if not operator:
        operator = models.Operator(**build_default_operator_profile(user_id))
        db.add(operator)
        await db.commit()
        await db.refresh(operator)
    elif settings.is_auto_admin_user(user_id) and not operator.is_admin:
        operator.is_admin = True
        operator.custom_permissions = {"all": 3}
        await db.commit()
        await db.refresh(operator)
    
    # Merge permissions: role permissions + custom overrides
    permissions = (operator.role.permissions if operator.role else {}).copy()
    if operator.custom_permissions:
        permissions.update(operator.custom_permissions)

    return {
        "id": operator.id,
        "username": operator.username,
        "full_name": operator.full_name,
        "email": operator.email,
        "department": operator.department,
        "team": operator.team,
        "role": operator.role.name if operator.role else "No Role",
        "is_admin": operator.is_admin,
        "permissions": permissions
    }

@router.get("/user/env-vars")
async def get_user_env_vars(request: Request):
    # Return user-specific environment context (Mostly OS-level forensics)
    user_id = get_current_user_id(request)
    
    # Sensitive patterns to redact
    redact_patterns = ["KEY", "SECRET", "PASSWORD", "TOKEN", "AUTH", "CREDENTIAL"]
    
    env_data = {}
    for key, value in os.environ.items():
        # Check if the key is sensitive
        is_sensitive = any(pattern in key.upper() for pattern in redact_patterns)
        
        if is_sensitive:
            env_data[key] = "********"
        else:
            env_data[key] = value
            
    # Add some calculated fields
    env_data["USER_ID"] = user_id
    env_data["SESSION_TYPE"] = "PROXIED" if os.environ.get("HTTP_X_FORWARDED_FOR") else "DIRECT"
    env_data["DEBUG_MODE"] = str(os.environ.get("VITE_UI_DEBUG_LOGGING", "false").lower() == "true")
    env_data["WORKSPACE_ROOT"] = os.getcwd()
    
    return env_data

@router.post("/user/settings")
@router.patch("/user/settings")
async def update_user_settings(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_current_user_id(request)
    for key, value in data.items():
        res = await db.execute(select(models.UserPreference).filter(
            models.UserPreference.user_id == user_id,
            models.UserPreference.key == key
        ))
        pref = res.scalar_one_or_none()
        if pref:
            pref.value = str(value)
        else:
            db.add(models.UserPreference(user_id=user_id, key=key, value=str(value)))
    await db.commit()
    return {"status": "success"}

@router.get("/bootstrap")
async def get_bootstrap_config(db: AsyncSession = Depends(get_db)):
    """Public endpoint for frontend to discover API URL and critical settings. No authentication required."""
    try:
        # 1. Fetch from Database
        res = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.is_public == True))
        db_settings = {s.key: s.value for s in res.scalars().all()}
        
        # 2. Extract from Environment/Config (as fallback)
        env_settings = {
            "API_ENDPOINT": settings.API_V1_STR,
            "PORT": str(settings.PORT),
            "VITE_API_BASE_URL": "", # Frontend usually handles this via proxy
        }
        
        # Merge, DB takes priority
        final_config = {**env_settings, **db_settings}
        
        return final_config
    except Exception as e:
        print(f"BOOTSTRAP ERROR: {e}")
        # Return at least basic settings so UI can try to render
        return {
            "PORT": str(settings.PORT),
            "API_ENDPOINT": settings.API_V1_STR
        }

@router.get("/options")
async def get_options(category: str = None, db: AsyncSession = Depends(get_db)):
    query = select(models.SettingOption)
    if category:
        query = query.filter(models.SettingOption.category == category)
    result = await db.execute(query.order_by(models.SettingOption.label))
    return result.scalars().all()

@router.post("/options")
async def create_option(data: dict, db: AsyncSession = Depends(get_db)):
    if data.get("category") in LOCKED_MONITORING_OPTION_CATEGORIES:
        raise HTTPException(status_code=400, detail="This monitoring category is code-managed and cannot be edited in settings")
    clean_data = filter_valid_columns(models.SettingOption, data)
    if 'id' in clean_data and not clean_data['id']:
        del clean_data['id']
    opt = models.SettingOption(**clean_data)
    db.add(opt)
    await db.commit()
    await db.refresh(opt)
    return opt

@router.put("/options/{opt_id}")
async def update_option(opt_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    result = await db.execute(select(models.SettingOption).filter(models.SettingOption.id == opt_id))
    opt = result.scalar_one_or_none()
    if not opt: raise HTTPException(404, "Option not found")
    if opt.category in LOCKED_MONITORING_OPTION_CATEGORIES:
        raise HTTPException(status_code=400, detail="This monitoring category is code-managed and cannot be edited in settings")
    
    old_value = opt.value
    new_value = data.get('value', opt.value)
    new_label = data.get('label', opt.label)
    
    # Update associated models if value changed
    if old_value != new_value:
        if opt.category == "Status":
            await db.execute(update(models.Device).where(models.Device.status == old_value).values(status=new_value))
            await db.execute(update(models.LogicalService).where(models.LogicalService.status == old_value).values(status=new_value))
            await db.execute(update(models.MaintenanceWindow).where(models.MaintenanceWindow.status == old_value).values(status=new_value))
        elif opt.category == "Environment":
            await db.execute(update(models.Device).where(models.Device.environment == old_value).values(environment=new_value))
            await db.execute(update(models.LogicalService).where(models.LogicalService.environment == old_value).values(environment=new_value))
        elif opt.category == "DeviceType":
            await db.execute(update(models.Device).where(models.Device.type == old_value).values(type=new_value))
        elif opt.category == "LogicalSystem":
            await db.execute(update(models.Device).where(models.Device.system == old_value).values(system=new_value))
            # Note: updating covered_systems in VendorContract is complex because it's a JSON array. 
            # We'll skip complex JSON path updates for now and let the user re-select if needed, 
            # or handle it via a specialized script if critical.
        elif opt.category == "VendorCountry":
            await db.execute(update(models.Vendor).where(models.Vendor.country == old_value).values(country=new_value))
    
    opt.value = new_value
    opt.label = new_label
    opt.description = data.get('description', opt.description)
    
    # Template Protection: If category is ServiceType, check if removing keys that are in use
    if opt.category == "ServiceType" and 'metadata_keys' in data:
        new_keys = set(data.get('metadata_keys', []))
        old_keys = set(opt.metadata_keys or [])
        removed_keys = old_keys - new_keys
        
        if removed_keys:
            # Check if any LogicalService of this type uses these keys
            from sqlalchemy import and_
            usage_query = select(models.LogicalService).filter(models.LogicalService.service_type == opt.value)
            usage_res = await db.execute(usage_query)
            in_use_services = usage_res.scalars().all()
            
            for svc in in_use_services:
                config = svc.config_json or {}
                for rk in removed_keys:
                    if rk in config and config[rk]: # If key exists and has a value
                        raise HTTPException(status_code=400, detail=f"Cannot remove metadata key '{rk}' because it is in use by service '{svc.name}'")
        
        opt.metadata_keys = list(new_keys)
    elif 'metadata_keys' in data:
        opt.metadata_keys = data.get('metadata_keys')
    
    await db.commit()
    await db.refresh(opt)
    return opt

@router.delete("/options/{opt_id}")
async def delete_option(opt_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption).filter(models.SettingOption.id == opt_id))
    opt = result.scalar_one_or_none()
    if not opt: raise HTTPException(404, "Option not found")
    if opt.category in LOCKED_MONITORING_OPTION_CATEGORIES:
        raise HTTPException(status_code=400, detail="This monitoring category is code-managed and cannot be edited in settings")
    
    # Check usage
    in_use = False
    if opt.category == "Status":
        res = await db.execute(select(models.Device).filter(models.Device.status == opt.value))
        if res.scalars().first(): in_use = True
        res = await db.execute(select(models.LogicalService).filter(models.LogicalService.status == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "Environment":
        res = await db.execute(select(models.Device).filter(models.Device.environment == opt.value))
        if res.scalars().first(): in_use = True
        res = await db.execute(select(models.LogicalService).filter(models.LogicalService.environment == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "DeviceType":
        res = await db.execute(select(models.Device).filter(models.Device.type == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "LogicalSystem":
        res = await db.execute(select(models.Device).filter(models.Device.system == opt.value))
        if res.scalars().first(): in_use = True
        # Check Vendor Contracts (covered_systems is a JSON list)
        if not in_use:
            from sqlalchemy import func
            # Check if opt.value exists in the covered_systems JSON array
            # Using contains([val]) for SQLAlchemy JSON compatibility
            res = await db.execute(select(models.VendorContract).filter(models.VendorContract.covered_systems.contains([opt.value])))
            if res.scalars().first(): in_use = True
    elif opt.category == "VendorCountry":
        res = await db.execute(select(models.Vendor).filter(models.Vendor.country == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "VendorDeviceType":
        # Check in VendorPersonnel pcs JSON
        res = await db.execute(select(models.VendorPersonnel).filter(models.VendorPersonnel.pcs.contains([{"type": opt.value}])))
        if res.scalars().first(): in_use = True
    elif opt.category == "LinkPurpose":
        res = await db.execute(select(models.PortConnection).filter(models.PortConnection.link_type == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "Manufacturer":
        res = await db.execute(select(models.Device).filter(models.Device.manufacturer == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "Model":
        res = await db.execute(select(models.Device).filter(models.Device.model == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "Owner":
        res = await db.execute(select(models.Device).filter(models.Device.owner == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "BusinessUnit":
        res = await db.execute(select(models.Device).filter(models.Device.business_unit == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "Vendor":
        res = await db.execute(select(models.Device).filter(models.Device.vendor == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "ServiceType":
        res = await db.execute(select(models.LogicalService).filter(models.LogicalService.service_type == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "MonitoringCategory":
        res = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.category == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "MonitoringPlatform":
        res = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.platform == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "MonitoringTeam":
        res = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.owner_team == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "VendorDeviceType":
        # Check in VendorPersonnel pcs JSON
        from sqlalchemy import func
        res = await db.execute(select(models.VendorPersonnel).filter(models.VendorPersonnel.pcs.contains([{"type": opt.value}])))
        if res.scalars().first(): in_use = True
        
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete option that is currently in use")
        
    await db.execute(delete(models.SettingOption).where(models.SettingOption.id == opt_id))
    await db.commit()
    return {"status": "success"}

@router.get("/ui")
async def get_ui_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == "UISettings"))
    opts = res.scalars().all()
    
    settings = {
        "status_badged": True,
        "status_colors": {
            "Active": "#10b981",
            "Maintenance": "#f59e0b",
            "Decommissioned": "#f43f5e",
            "Planned": "#3b82f6"
        }
    }
    
    for o in opts:
        if o.label == "status_badged":
            settings["status_badged"] = (o.value == "true")
        elif o.label.startswith("color_"):
            status_name = o.label.replace("color_", "")
            settings["status_colors"][status_name] = o.value
            
    return settings

@router.post("/ui")
async def update_ui_settings(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    # Simple clear and set
    from sqlalchemy import delete
    user_id = get_current_user_id(request)
    
    # Security Check
    res_op = await db.execute(select(models.Operator).filter(models.Operator.username == user_id))
    operator = res_op.scalar_one_or_none()
    if not operator or not operator.is_admin:
        raise HTTPException(status_code=403, detail="Privileged Access Required: UI customization restricted to administrators.")

    await db.execute(delete(models.SettingOption).where(models.SettingOption.category == "UISettings"))
    
    if "status_badged" in data:
        db.add(models.SettingOption(category="UISettings", label="status_badged", value="true" if data["status_badged"] else "false"))
    
    if "status_colors" in data:
        for status_name, color in data["status_colors"].items():
            db.add(models.SettingOption(category="UISettings", label=f"color_{status_name}", value=color))
            
    await db.commit()
    return {"status": "success"}

@router.get("/global")
async def get_global_settings(request: Request, db: AsyncSession = Depends(get_db)):
    """Fetch all settings from the unified GlobalSetting table."""
    user_id = get_current_user_id(request)
    # Security: Verify if user is admin before exposing raw env
    operator = await ensure_admin_operator(db, user_id)
    if not operator or not operator.is_admin:
        raise HTTPException(status_code=403, detail="Privileged Access Required: Raw configuration analysis restricted to administrators.")

    res = await db.execute(select(models.GlobalSetting))
    settings_list = res.scalars().all()
    
    # Return as a simple key-value map for the UI, plus metadata if needed
    config = {s.key: s.value for s in settings_list}
    config["_metadata"] = {s.key: {"category": s.category, "description": s.description, "file": "Database", "param": s.key} for s in settings_list}
    config["_deployment"] = {
        "database_url": settings.DATABASE_URL,
        "config_database_url": settings.CONFIG_DATABASE_URL,
        "tenant_storage_root": settings.TENANT_STORAGE_ROOT,
        "backend_env_file_path": settings.BACKEND_ENV_FILE_PATH,
        "frontend_env_file_path": settings.FRONTEND_ENV_FILE_PATH,
        "default_tenant_name": settings.DEFAULT_TENANT_NAME,
        "default_user_id": settings.DEFAULT_USER_ID,
        "auto_admin_user_ids": sorted(settings.auto_admin_user_ids),
        "default_email_domain": settings.DEFAULT_EMAIL_DOMAIN,
        "project_name": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }
    
    # Inject Raw Environment Data for Analysis tab
    raw_env = {"backend": {}, "frontend": {}}
    
    # Helper to parse .env files with redaction
    def parse_env(path):
        if not os.path.exists(path): return {}
        data = {}
        redact_patterns = ["KEY", "SECRET", "PASSWORD", "TOKEN", "AUTH", "CREDENTIAL"]
        with open(path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip()
                    is_sensitive = any(p in k.upper() for p in redact_patterns)
                    data[k] = {"value": "********" if is_sensitive else v, "file": path}
        return data

    # Backend .env
    raw_env["backend"] = parse_env(settings.BACKEND_ENV_FILE_PATH)
    
    # Frontend .env
    raw_env["frontend"] = parse_env(settings.FRONTEND_ENV_FILE_PATH)
    
    config["_raw_env"] = raw_env
    return config

@router.post("/global")
async def update_global_settings(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    """Update unified settings and log to Audit Trail."""
    from sqlalchemy.exc import IntegrityError
    user_id = get_current_user_id(request)
    
    # Security: Verify if user is admin
    operator = await ensure_admin_operator(db, user_id)
    if not operator or not operator.is_admin:
        raise HTTPException(status_code=403, detail="Privileged Access Required: Configuration updates restricted to administrators.")

    protected_keys = {
        "DATABASE_URL",
        "CONFIG_DATABASE_URL",
        "TENANT_STORAGE_ROOT",
        "BACKEND_ENV_FILE_PATH",
        "FRONTEND_ENV_FILE_PATH",
        "DEFAULT_TENANT_NAME",
        "DEFAULT_USER_ID",
        "AUTO_ADMIN_USER_IDS",
        "DEFAULT_EMAIL_DOMAIN"
    }

    for key, value in data.items():
        if key.startswith("_"): continue # Skip metadata
        if key in protected_keys:
            raise HTTPException(status_code=400, detail=f"{key} is a deploy-time setting and must be changed through environment/bootstrap configuration, not runtime global settings.")
        res = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.key == key))
        setting = res.scalar_one_or_none()
        old_value = setting.value if setting else "None"
        
        if setting:
            setting.value = str(value)
            # Hot-reload in-memory config if attribute exists
            if hasattr(settings, key):
                try:
                    # Attempt type conversion if needed
                    current_val = getattr(settings, key)
                    if isinstance(current_val, bool):
                        new_val = str(value).lower() in ("true", "1", "yes")
                    elif isinstance(current_val, int):
                        new_val = int(value)
                    else:
                        new_val = str(value)
                    setattr(settings, key, new_val)
                except Exception as e:
                    print(f"Failed to hot-reload {key}: {e}")
        else:
            # Auto-detect if it should be public (Frontend usually needs VITE_ prefixed vars)
            is_public = key.startswith("VITE_") or key in ["PORT", "API_ENDPOINT"]
            db.add(models.GlobalSetting(
                key=key, 
                value=str(value), 
                is_public=is_public,
                category="Infrastructure"
            ))
        
        # Add to Audit Log
        db.add(models.AuditLog(
            user_id=user_id,
            action="UPDATE_SETTING",
            target_table="GLOBAL_SETTING",
            target_id=key,
            changes={"old": old_value, "new": str(value)},
            description=f"Configuration parameter '{key}' updated via Admin Dashboard."
        ))
        
        # Also add to EnvHistory for specialized history view
        db.add(models.EnvHistory(
            field=key,
            old_value=old_value,
            new_value=str(value),
            user=user_id
        ))

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        # If we hit a race condition, try one more time or just report the conflict
        print(f"IntegrityError during global settings update: {e}")
        raise HTTPException(status_code=409, detail=f"Configuration conflict detected: {str(e.orig)}")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")
    
    # Notify all connected clients via WebSocket
    if hasattr(request.app.state, 'ws_manager'):
        await request.app.state.ws_manager.broadcast("CONFIG_UPDATED")
        
    return {"status": "success"}

@router.get("/env/history")
async def get_env_history(field: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.EnvHistory).filter(models.EnvHistory.field == field).order_by(models.EnvHistory.timestamp.desc()))
    return res.scalars().all()

@router.get("/operators")
async def get_operators(db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    res = await db.execute(select(models.Operator).options(selectinload(models.Operator.role), selectinload(models.Operator.team_rel)))
    return res.scalars().all()

@router.get("/teams")
async def get_teams(db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    res = await db.execute(
        select(models.Team)
        .options(selectinload(models.Team.operators))
        .order_by(models.Team.is_archived.asc(), models.Team.name.asc())
    )
    teams = res.scalars().all()
    return [
        {
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "source": team.source,
            "is_archived": team.is_archived,
            "metadata_json": team.metadata_json or {},
            "created_at": team.created_at,
            "updated_at": team.updated_at,
            "operators": [
                {
                    "id": operator.id,
                    "external_id": operator.external_id,
                    "username": operator.username,
                    "full_name": operator.full_name,
                    "team_id": operator.team_id,
                    "team": operator.team,
                    "team_source": operator.team_source,
                }
                for operator in team.operators
            ],
        }
        for team in teams
    ]

@router.get("/teams/{team_id}/audit")
async def get_team_audit(team_id: int, db: AsyncSession = Depends(get_db)):
    team_res = await db.execute(select(models.Team).filter(models.Team.id == team_id))
    team = team_res.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")
    audit_res = await db.execute(
        select(models.TeamAudit)
        .filter(models.TeamAudit.team_id == team_id)
        .order_by(models.TeamAudit.created_at.desc())
    )
    return audit_res.scalars().all()

@router.post("/teams")
async def create_team(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team name is required")
    existing_res = await db.execute(select(models.Team).filter(models.Team.name == name))
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Team already exists")
    team = models.Team(
        name=name,
        description=(data.get("description") or "").strip() or None,
        source=data.get("source") or "manual",
        is_archived=bool(data.get("is_archived", False)),
        metadata_json=data.get("metadata_json") or {}
    )
    db.add(team)
    await db.flush()
    await record_team_audit(db, team.id, "team_created", get_current_user_id(request), {"name": team.name})
    await db.commit()
    await db.refresh(team)
    return team

@router.patch("/teams/{team_id}")
async def update_team(team_id: int, data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    team_res = await db.execute(select(models.Team).filter(models.Team.id == team_id))
    team = team_res.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")

    old_name = team.name
    next_name = (data.get("name") or team.name).strip()
    if not next_name:
        raise HTTPException(status_code=400, detail="Team name is required")
    if next_name != old_name:
        dupe_res = await db.execute(select(models.Team).filter(models.Team.name == next_name, models.Team.id != team_id))
        if dupe_res.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Team already exists")
        team.name = next_name
        await db.execute(update(models.Operator).where(models.Operator.team_id == team_id).values(team=next_name))

    if "description" in data:
        team.description = (data.get("description") or "").strip() or None
    if "is_archived" in data:
        team.is_archived = bool(data.get("is_archived"))
    if "metadata_json" in data:
        team.metadata_json = data.get("metadata_json") or {}

    await record_team_audit(db, team.id, "team_updated", get_current_user_id(request), {"from": old_name, "to": team.name})
    await db.commit()
    await db.refresh(team)
    return team

@router.delete("/teams/{team_id}")
async def delete_team(team_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    team_res = await db.execute(select(models.Team).filter(models.Team.id == team_id))
    team = team_res.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")
    members_res = await db.execute(select(models.Operator).filter(models.Operator.team_id == team_id))
    members = members_res.scalars().all()
    if members:
        raise HTTPException(status_code=400, detail="Cannot delete team with assigned operators")
    await record_team_audit(db, team.id, "team_deleted", get_current_user_id(request), {"name": team.name})
    await db.execute(delete(models.Team).where(models.Team.id == team_id))
    await db.commit()
    return {"status": "success"}

@router.post("/operators")
async def create_operator(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    # Simple create or update logic for manual addition
    from sqlalchemy.exc import IntegrityError
    external_id = str(data.get("external_id"))
    res = await db.execute(select(models.Operator).filter(models.Operator.external_id == external_id))
    op = res.scalar_one_or_none()
    
    # Allowed fields for direct update
    allowed_fields = ["full_name", "email", "department", "registration_status", "is_admin", "custom_permissions", "role_id"]
    team = await resolve_team_assignment(
        db,
        team_id=data.get("team_id"),
        team_name=data.get("team"),
        source=data.get("team_source") or "manual",
        create_missing=bool(data.get("team"))
    )

    if op:
        for key, value in data.items():
            if key in allowed_fields:
                setattr(op, key, value)
        op.team_id = team.id if team else None
        op.team = team.name if team else None
        op.team_source = data.get("team_source") or ("manual" if team else op.team_source)
    else:
        # For new operators, we take what we have
        # But we filter it just in case
        clean_data = {k: v for k, v in data.items() if hasattr(models.Operator, k) and k not in ["id", "created_at", "updated_at"]}
        clean_data["team_id"] = team.id if team else None
        clean_data["team"] = team.name if team else None
        clean_data["team_source"] = data.get("team_source") or ("manual" if team else "manual")
        op = models.Operator(**clean_data)
        db.add(op)
    
    try:
        if team:
            await record_team_audit(db, team.id, "member_added", get_current_user_id(request), {"external_id": external_id, "username": op.username})
        await db.commit()
        await db.refresh(op)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Operator with this ID or Username already exists.")
    return op

@router.patch("/operators/{op_id}")
async def update_operator(op_id: int, data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Operator).filter(models.Operator.id == op_id))
    op = res.scalar_one_or_none()
    if not op: raise HTTPException(404, "Operator not found")
    old_team_id = op.team_id
    old_team_name = op.team
    
    # Allowed fields for direct update
    allowed_fields = ["full_name", "email", "department", "registration_status", "is_admin", "custom_permissions", "role_id"]
    team = None
    if "team_id" in data or "team" in data:
        team = await resolve_team_assignment(
            db,
            team_id=data.get("team_id"),
            team_name=data.get("team"),
            source=data.get("team_source") or "manual_override",
            create_missing=bool(data.get("team"))
        )
    
    for key, value in data.items():
        if key in allowed_fields:
            setattr(op, key, value)
    if "team_id" in data or "team" in data:
        op.team_id = team.id if team else None
        op.team = team.name if team else None
        op.team_source = data.get("team_source") or ("manual_override" if team else "manual")
        if old_team_id and old_team_id != op.team_id:
            await record_team_audit(db, old_team_id, "member_removed", get_current_user_id(request), {"external_id": op.external_id, "username": op.username, "from": old_team_name})
        if op.team_id and old_team_id != op.team_id:
            await record_team_audit(db, op.team_id, "member_added", get_current_user_id(request), {"external_id": op.external_id, "username": op.username, "to": op.team})
            
    await db.commit()
    await db.refresh(op)
    return op

@router.delete("/operators/{op_id}")
async def delete_operator(op_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_current_user_id(request)
    
    # Check if user is trying to delete themselves
    res = await db.execute(select(models.Operator).filter(models.Operator.id == op_id))
    op = res.scalar_one_or_none()
    if not op: raise HTTPException(404, "Operator not found")
    
    if op.username == user_id:
        raise HTTPException(status_code=400, detail="Identity Protection: You cannot terminate your own active session.")
        
    await db.execute(delete(models.Operator).where(models.Operator.id == op_id))
    await db.commit()
    return {"status": "success"}

@router.get("/roles")
async def get_roles(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Role))
    return res.scalars().all()

@router.get("/user-pool/versions")
async def get_user_pool_versions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.UserPoolVersion).order_by(models.UserPoolVersion.created_at.desc()))
    return res.scalars().all()

@router.post("/user-pool/refresh")
async def refresh_user_pool(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    preview = data.get("preview", False)
    user_id = get_current_user_id(request)
    
    # Create a dummy version label
    import datetime
    version_label = f"v{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Dynamic dummy users for testing variety
    dummy_users = [
        {"id": 101, "username": "admin_alpha", "full_name": "Alpha Admin", "email": f"alpha@{settings.DEFAULT_EMAIL_DOMAIN}", "department": "Infrastructure", "team": "Platform Ops"},
        {"id": 102, "username": "dev_beta", "full_name": "Beta Developer (Updated)", "email": f"beta@{settings.DEFAULT_EMAIL_DOMAIN}", "department": "R&D", "team": "App Engineering"},
        {"id": 103, "username": "sec_gamma", "full_name": "Gamma Security", "email": f"gamma@{settings.DEFAULT_EMAIL_DOMAIN}", "department": "Security", "team": "Security Response"},
        {"id": 104, "username": "op_delta", "full_name": "Delta Operator", "email": f"delta@{settings.DEFAULT_EMAIL_DOMAIN}", "department": "Operations", "team": "Platform Ops"},
        {"id": 105, "username": "guest_epsilon", "full_name": "Epsilon Guest", "email": f"epsilon@{settings.DEFAULT_EMAIL_DOMAIN}", "department": "External"},
        {"id": 106, "username": "new_user_z", "full_name": "Z-New User", "email": f"new_z@{settings.DEFAULT_EMAIL_DOMAIN}", "department": "Infrastructure", "team": "Platform Ops"}
    ]
    
    diff_summary = {"added": 0, "removed": 0, "changed": 0, "script": data.get("script"), "team_conflicts": [], "team_updates": []}
    preview_items = []
    
    # Sync logic
    for u in dummy_users:
        res = await db.execute(select(models.Operator).filter(models.Operator.external_id == str(u["id"])))
        op = res.scalar_one_or_none()
        
        item_status = "unchanged"
        item_changes = {}
        
        if not op:
            item_status = "new"
            diff_summary["added"] += 1
            preview_items.append({
                "id": u["id"],
                "username": u["username"],
                "full_name": u["full_name"],
                "email": u["email"],
                "department": u["department"],
                "team": u["team"],
                "status": "new",
                "changes": {}
            })
            
            if not preview:
                team = await resolve_team_assignment(
                    db,
                    team_name=u.get("team"),
                    source="synced",
                    create_missing=bool(u.get("team"))
                ) if u.get("team") else None
                
                db.add(models.Operator(
                    external_id=str(u["id"]),
                    username=u["username"],
                    full_name=u["full_name"],
                    email=u["email"],
                    department=u["department"],
                    registration_status="Verified",
                    team=team.name if team else None,
                    team_id=team.id if team else None,
                    team_source="synced" if team else "manual"
                ))
                if team:
                    diff_summary["team_updates"].append({"external_id": str(u["id"]), "team": team.name, "mode": "created"})
                    await record_team_audit(db, team.id, "member_added_via_sync", user_id, {"external_id": str(u["id"]), "username": u["username"]})
        else:
            # Check for changes
            fields = ["username", "full_name", "email", "department", "team"]
            has_changes = False
            for f in fields:
                old_val = getattr(op, f)
                new_val = u.get(f)
                if str(old_val) != str(new_val):
                    item_changes[f] = {"old": old_val, "new": new_val}
                    has_changes = True
            
            if has_changes:
                item_status = "changed"
                diff_summary["changed"] += 1
            
            preview_items.append({
                "id": u["id"],
                "username": u["username"],
                "full_name": u["full_name"],
                "email": u["email"],
                "department": u["department"],
                "team": u["team"],
                "status": item_status,
                "changes": item_changes
            })
            
            if not preview and has_changes:
                op.username = u["username"]
                op.full_name = u["full_name"]
                op.email = u["email"]
                op.department = u["department"]
                op.registration_status = "Verified"
                
                team = await resolve_team_assignment(
                    db,
                    team_name=u.get("team"),
                    source="synced",
                    create_missing=bool(u.get("team"))
                ) if u.get("team") else None
                
                if team:
                    if op.team_source == "manual_override" and op.team and op.team != team.name:
                        diff_summary["team_conflicts"].append({
                            "external_id": op.external_id,
                            "local_team": op.team,
                            "synced_team": team.name
                        })
                    else:
                        if op.team_id != team.id:
                            if op.team_id:
                                await record_team_audit(db, op.team_id, "member_removed_via_sync", user_id, {"external_id": op.external_id, "username": op.username})
                            await record_team_audit(db, team.id, "member_added_via_sync", user_id, {"external_id": op.external_id, "username": op.username})
                            diff_summary["team_updates"].append({"external_id": op.external_id, "team": team.name, "mode": "updated"})
                        op.team = team.name
                        op.team_id = team.id
                        op.team_source = "synced"

    if preview:
        return {
            "status": "success", 
            "preview": preview_items, 
            "summary": diff_summary,
            "version_label": version_label
        }

    # Save the actual version
    new_version = models.UserPoolVersion(
        version_label=version_label,
        snapshot_data=dummy_users,
        diff_summary=diff_summary,
        created_by=user_id,
        is_active=True
    )
    
    # Deactivate others
    await db.execute(update(models.UserPoolVersion).values(is_active=False))
    db.add(new_version)
    
    await db.commit()
    return {"status": "success", "version": version_label}

@router.post("/user-pool/restore/{version_id}")
async def restore_user_pool(version_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.UserPoolVersion).filter(models.UserPoolVersion.id == version_id))
    version = res.scalar_one_or_none()
    if not version: raise HTTPException(404, "Version not found")
    
    await db.execute(update(models.UserPoolVersion).values(is_active=False))
    version.is_active = True
    
    # Sync version data back to operators (Simplified)
    for u in version.snapshot_data:
        team = await resolve_team_assignment(
            db,
            team_name=u.get("team"),
            source="synced",
            create_missing=bool(u.get("team"))
        ) if u.get("team") else None
        res = await db.execute(select(models.Operator).filter(models.Operator.external_id == str(u["id"])))
        op = res.scalar_one_or_none()
        if op:
             op.username = u["username"]
             op.full_name = u["full_name"]
             op.email = u["email"]
             op.department = u["department"]
             op.team = team.name if team else None
             op.team_id = team.id if team else None
             op.team_source = "synced" if team else op.team_source
             
    await db.commit()
    return {"status": "success"}

@router.get("/initialize")
async def initialize_settings(db: AsyncSession = Depends(get_db)):
    """Initialize system with default settings and metadata."""
    from sqlalchemy.exc import IntegrityError
    # Global Defaults list
    global_defaults = [
        ("app_name", settings.DEFAULT_APP_NAME, "App Name", False),
        ("org_name", settings.DEFAULT_ORG_NAME, "Organization", False),
        ("site_id", settings.DEFAULT_SITE_ID, "Primary Site ID", False),
        ("retention_days", "30", "Data Retention Days", False),
        ("maintenance_mode", "false", "Maintenance Mode Status", False),
        ("default_timezone", "UTC", "Default System Timezone", False),
        ("dashboard_refresh_interval", "60", "Refresh Rate (s)", False),
        ("security_level", "Standard", "Base Security Profile", False),
        ("audit_log_level", "Full", "Audit Detail Level", False),
        ("ui_primary_color", "#3b82f6", "Primary Branding Color", False),
        ("ui_accent_color", "#10b981", "Accent Branding Color", False),
        ("support_email", settings.DEFAULT_SUPPORT_EMAIL, "Admin Support Email", False),
        ("VITE_APP_TITLE", settings.DEFAULT_UI_TITLE, "UI Title", True),
        ("VITE_POLLING_INTERVAL", "5000", "Polling Interval (ms)", True),
        ("VITE_ENABLE_WEBSOCKETS", "true", "Enable WebSockets", True),
        ("VITE_THEME_DEFAULT", "nordic-frost-v1", "Default UI Theme", True),
        ("VITE_UI_TIMEOUT", "30000", "UI Request Timeout", True),
        ("VITE_MAX_GRID_ROWS", "100", "Max Rows in Grids", True),
        ("PORT", "8000", "Backend Port", True),
        ("API_ENDPOINT", "/api/v1", "API Prefix", True)
    ]

    # 1. Idempotent check for GlobalSettings
    for key, val, desc, public in global_defaults:
        res = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.key == key))
        if not res.scalar_one_or_none():
            try:
                db.add(models.GlobalSetting(key=key, value=val, category="AppGlobal", description=desc, is_public=public))
                await db.flush() # Flush each one to catch conflicts early
            except IntegrityError:
                await db.rollback() # If already exists due to race, just skip
                continue
    
    # 2. Idempotent check for SettingOptions (Metadata)
    await db.execute(delete(models.SettingOption).where(models.SettingOption.category.in_(LOCKED_MONITORING_OPTION_CATEGORIES)))
    res_opt = await db.execute(select(models.SettingOption))
    if not res_opt.scalars().first():
        # Main initialization for first run
        defaults = [
            # Logical Systems
            ("LogicalSystem", "SAP ERP", "Enterprise Resource Planning"),
            ("LogicalSystem", "HR-Core", "Human Resources Core System"),
            ("LogicalSystem", "Sales-B2B", "B2B Sales Portal"),
            ("LogicalSystem", "IT-Infra", "IT Infrastructure"),
            ("LogicalSystem", "DevOps", "DevOps Platform"),
            # Device Types
            ("DeviceType", "Physical", "Bare metal hardware"),
            ("DeviceType", "Virtual", "Virtual machine or instance"),
            ("DeviceType", "Storage", "Storage array or appliance"),
            ("DeviceType", "Switch", "Network switch or router"),
            ("DeviceType", "Firewall", "Network firewall appliance"),
            ("DeviceType", "Load Balancer", "Load balancer appliance"),
            # Operational Status
            ("Status", "Planned", "Scheduled for deployment"),
            ("Status", "Active", "Operational and healthy"),
            ("Status", "Maintenance", "Undergoing scheduled maintenance"),
            ("Status", "Standby", "Powered on, not serving traffic"),
            ("Status", "Offline", "Powered off or unreachable"),
            ("Status", "Decommissioned", "Retired from service"),
            # Environments
            ("Environment", "Production", "Live user traffic"),
            ("Environment", "Staging", "Pre-production staging"),
            ("Environment", "QA", "Quality Assurance and Testing"),
            ("Environment", "Dev", "Development and Staging"),
            ("Environment", "DR", "Disaster Recovery Node"),
            ("Environment", "Lab", "Lab or sandbox environment"),
            # Business Units
            ("BusinessUnit", "Engineering", "Engineering & R&D"),
            ("BusinessUnit", "Operations", "IT Operations"),
            ("BusinessUnit", "Finance", "Finance & Accounting"),
            ("BusinessUnit", "HR", "Human Resources"),
            ("BusinessUnit", "Sales", "Sales & Business Development"),
            ("BusinessUnit", "Security", "Information Security"),
            # Semiconductor Impact Categories
            ("ImpactCategory", "Wafer Loss / Scrap", "Direct production material loss"),
            ("ImpactCategory", "Yield Degradation", "Reduced output quality"),
            ("ImpactCategory", "Tool Blockage (Down)", "Manufacturing equipment stop"),
            ("ImpactCategory", "Throughput Slow-down", "Bottleneck in production flow"),
            ("ImpactCategory", "MES Connectivity Gap", "Data loss between factory and server"),
            ("ImpactCategory", "Recipe Desync", "Incorrect process parameters"),
            ("ImpactCategory", "SPC Violation", "Statistical Process Control outlier"),
            ("ImpactCategory", "Cleanroom Violation", "Environmental spec breach"),
            ("ImpactCategory", "Robot / OHT Stalled", "Automated material handling failure"),
            ("ImpactCategory", "Data Integrity Risk", "Traceability or history data at risk"),
            ("MonitoringCategory", "Infrastructure", "Base host, VM, and platform health checks"),
            ("MonitoringCategory", "Application", "App-tier, API, and business transaction checks"),
            ("MonitoringCategory", "Database", "Database performance and integrity checks"),
            ("MonitoringCategory", "Network", "Network reachability and traffic checks"),
            ("MonitoringCategory", "Security", "Authentication and threat-detection checks"),
            ("MonitoringPlatform", "Zabbix", "Managed monitor defined in Zabbix"),
            ("MonitoringPlatform", "Prometheus", "Managed monitor defined in Prometheus"),
            ("MonitoringPlatform", "Datadog", "Managed monitor defined in Datadog"),
            ("MonitoringPlatform", "Grafana", "Managed monitor defined in Grafana"),
            ("MonitoringPlatform", "PagerDuty", "Managed monitor defined in PagerDuty"),
            ("MonitoringTeam", "Operations", "Primary operations ownership"),
            ("MonitoringTeam", "SRE", "Site reliability ownership"),
            ("MonitoringTeam", "Security", "Security response ownership"),
        ]
        for cat, val, desc in defaults:
            db.add(models.SettingOption(category=cat, label=val, value=val, description=desc))
            
        # Add Vendor specific enums
        vendor_defaults = [
            ("VendorDeviceType", "PC", "Personal Computer"),
            ("VendorDeviceType", "VDI", "Virtual Desktop Infrastructure"),
            ("VendorDeviceType", "Laptop", "Portable Computer"),
            ("VendorDeviceType", "Workstation", "High-performance Computer"),
            ("VendorCountry", "South Korea", "Republic of Korea"),
            ("VendorCountry", "USA", "United States of America"),
            ("VendorCountry", "Taiwan", "Taiwan"),
            ("VendorCountry", "Germany", "Germany"),
            ("VendorCountry", "Japan", "Japan"),
        ]
        for cat, val, desc in vendor_defaults:
            # Check if exists first to be safe
            res = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == cat, models.SettingOption.value == val))
            if not res.scalar_one_or_none():
                try:
                    db.add(models.SettingOption(category=cat, label=val, value=val, description=desc))
                    await db.flush()
                except IntegrityError:
                    await db.rollback()
                    continue

        service_types = [
            ("Database", ["Engine", "Port", "DBName", "Collation", "StorageType", "ReplicaMode"]),
            ("Web Server", ["ServerType", "Port", "RootPath", "SSLExpiry", "AppPool", "Bindings"]),
            ("Container", ["Runtime", "Image", "Tag", "Namespace", "CPURequest", "MemRequest"]),
            ("Middleware", ["Vendor", "Instance", "QueueDepth", "JVMHeap", "JMXPort"]),
            ("Message Queue", ["Engine", "VHost", "Port", "ClusterMode", "Persistence"]),
            ("Cache", ["Engine", "Port", "MemoryLimit", "EvictionPolicy", "Clustered"]),
            ("OS", ["Distribution", "Kernel", "Architecture", "Patch Level", "EOL Date"]),
            ("Vendor Software", ["Vendor", "Support Contact", "Support Level", "Install Path", "License Tier"]),
            ("Internal App", ["Repository", "Framework", "Primary Dev", "CI/CD Pipeline", "Build Version"]),
            ("External App", ["Vendor Support URL", "Account Manager", "Support Tier", "Installation Manual", "Update Frequency"])
        ]
        for val, keys in service_types:
            db.add(models.SettingOption(category="ServiceType", label=val, value=val, metadata_keys=keys))

        # Hardware Port Templates (Model-based)
        # Format in metadata_keys: "PortName:PortType[:Category]"
        hardware_profiles = [
            ("Dell PowerEdge R740", ["eth0:RJ45", "eth1:RJ45", "eth2:RJ45", "eth3:RJ45", "idrac:RJ45:Management"]),
            ("Cisco C9300-48T", [f"Gi1/0/{i}:RJ45" for i in range(1, 49)] + [f"Te1/1/{i}:SFP+" for i in range(1, 5)]),
            ("Generic 1U Server", ["eth0:RJ45", "eth1:RJ45", "mgmt0:RJ45:Management"])
        ]
        for val, keys in hardware_profiles:
            db.add(models.SettingOption(category="HardwareProfile", label=val, value=val, metadata_keys=keys))

    monitoring_defaults = [
        ("MonitoringCategory", "Infrastructure", "Base host, VM, and platform health checks", None),
        ("MonitoringCategory", "Application", "App-tier, API, and business transaction checks", None),
        ("MonitoringCategory", "Database", "Database performance and integrity checks", None),
        ("MonitoringCategory", "Network", "Network reachability and traffic checks", None),
        ("MonitoringCategory", "Security", "Authentication and threat-detection checks", None),
        ("MonitoringPlatform", "Zabbix", "Managed monitor defined in Zabbix", None),
        ("MonitoringPlatform", "Prometheus", "Managed monitor defined in Prometheus", None),
        ("MonitoringPlatform", "Datadog", "Managed monitor defined in Datadog", None),
        ("MonitoringPlatform", "Grafana", "Managed monitor defined in Grafana", None),
        ("MonitoringPlatform", "PagerDuty", "Managed monitor defined in PagerDuty", None),
        ("MonitoringTeam", "Operations", "Primary operations ownership", []),
        ("MonitoringTeam", "SRE", "Site reliability ownership", []),
        ("MonitoringTeam", "Security", "Security response ownership", []),
    ]
    for cat, val, desc, metadata_keys in monitoring_defaults:
        res = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == cat, models.SettingOption.value == val))
        if not res.scalar_one_or_none():
            db.add(models.SettingOption(category=cat, label=val, value=val, description=desc, metadata_keys=metadata_keys or []))

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # If we hit a race during final commit, just return success as it's already initialized
        pass
        
    return {"status": "initialized"}
