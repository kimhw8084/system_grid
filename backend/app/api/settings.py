import os
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from ..database import get_db
from ..models import models
from ..core.config import settings
from .utils import filter_valid_columns

router = APIRouter(prefix="/settings", tags=["Settings"])

def get_current_user_id():
    return os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown_Operator"

@router.get("/user/settings")
async def get_user_settings(db: AsyncSession = Depends(get_db)):
    user_id = get_current_user_id()
    res = await db.execute(select(models.UserPreference).filter(models.UserPreference.user_id == user_id))
    prefs = res.scalars().all()
    return {p.key: p.value for p in prefs}

@router.get("/user/profile")
async def get_user_profile(db: AsyncSession = Depends(get_db)):
    user_id = get_current_user_id()
    # Attempt to find the operator by username
    res = await db.execute(select(models.Operator).filter(models.Operator.username == user_id))
    operator = res.scalar_one_or_none()
    
    if not operator:
        # Return a synthetic profile if not found in DB
        return {
            "username": user_id,
            "full_name": user_id.replace("_", " ").title(),
            "role": "Unknown",
            "department": "Infrastructure",
            "is_external": True
        }
    
    return {
        "id": operator.id,
        "username": operator.username,
        "full_name": operator.full_name,
        "email": operator.email,
        "department": operator.department,
        "team": operator.team,
        "role": operator.role.name if operator.role else "No Role"
    }

@router.get("/user/env-vars")
async def get_user_env_vars():
    # Return user-specific environment context (mostly UI session flags)
    user_id = get_current_user_id()
    return {
        "USER_ID": user_id,
        "SESSION_TYPE": "PROXIED" if os.environ.get("HTTP_X_FORWARDED_FOR") else "DIRECT",
        "DEBUG_MODE": os.environ.get("VITE_UI_DEBUG_LOGGING", "false").lower() == "true",
        "WORKSPACE_ROOT": os.getcwd()
    }

@router.post("/user/settings")
@router.patch("/user/settings")
async def update_user_settings(data: dict, db: AsyncSession = Depends(get_db)):
    user_id = get_current_user_id()
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
async def get_options(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.SettingOption))
    return result.scalars().all()

@router.post("/options")
async def create_option(data: dict, db: AsyncSession = Depends(get_db)):
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
    result = await db.execute(select(models.SettingOption).filter(models.SettingOption.id == opt_id))
    opt = result.scalar_one_or_none()
    if not opt: raise HTTPException(404, "Option not found")
    
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
        
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete option that is currently in use")
        
    db.delete(opt)
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
async def update_ui_settings(data: dict, db: AsyncSession = Depends(get_db)):
    # Simple clear and set
    from sqlalchemy import delete
    await db.execute(delete(models.SettingOption).where(models.SettingOption.category == "UISettings"))
    
    if "status_badged" in data:
        db.add(models.SettingOption(category="UISettings", label="status_badged", value="true" if data["status_badged"] else "false"))
    
    if "status_colors" in data:
        for status_name, color in data["status_colors"].items():
            db.add(models.SettingOption(category="UISettings", label=f"color_{status_name}", value=color))
            
    await db.commit()
    return {"status": "success"}

@router.get("/global")
async def get_global_settings(db: AsyncSession = Depends(get_db)):
    """Fetch all settings from the unified GlobalSetting table."""
    res = await db.execute(select(models.GlobalSetting))
    settings_list = res.scalars().all()
    
    # Return as a simple key-value map for the UI, plus metadata if needed
    config = {s.key: s.value for s in settings_list}
    config["_metadata"] = {s.key: {"category": s.category, "description": s.description, "file": "Database", "param": s.key} for s in settings_list}
    
    # Inject Raw Environment Data for Analysis tab
    raw_env = {"backend": {}, "frontend": {}}
    
    # Helper to parse .env files
    def parse_env(path):
        if not os.path.exists(path): return {}
        data = {}
        with open(path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    data[k.strip()] = {"value": v.strip(), "file": path}
        return data

    # Backend .env
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    raw_env["backend"] = parse_env(os.path.join(base_dir, ".env"))
    
    # Frontend .env
    frontend_dir = os.path.join(os.path.dirname(base_dir), "frontend")
    raw_env["frontend"] = parse_env(os.path.join(frontend_dir, ".env"))
    
    config["_raw_env"] = raw_env
    return config

@router.post("/global")
async def update_global_settings(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    """Update unified settings and log to Audit Trail."""
    user_id = get_current_user_id()
    for key, value in data.items():
        if key.startswith("_"): continue # Skip metadata
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

    await db.commit()
    
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
    res = await db.execute(select(models.Operator).options(selectinload(models.Operator.role)))
    return res.scalars().all()

@router.get("/roles")
async def get_roles(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Role))
    return res.scalars().all()

@router.get("/user-pool/versions")
async def get_user_pool_versions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.UserPoolVersion).order_by(models.UserPoolVersion.created_at.desc()))
    return res.scalars().all()

@router.post("/user-pool/refresh")
async def refresh_user_pool(data: dict, db: AsyncSession = Depends(get_db)):
    # Placeholder for Python script execution logic
    # In a real scenario, this would execute the provided script
    user_id = get_current_user_id()
    
    # Create a dummy version for now
    import datetime
    version_label = f"v{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Simple logic: create 5 dummy users
    dummy_users = [
        {"id": 101, "username": "admin_alpha", "full_name": "Alpha Admin", "email": "alpha@sysgrid.local", "department": "Infrastructure"},
        {"id": 102, "username": "dev_beta", "full_name": "Beta Developer", "email": "beta@sysgrid.local", "department": "R&D"},
        {"id": 103, "username": "sec_gamma", "full_name": "Gamma Security", "email": "gamma@sysgrid.local", "department": "Security"},
        {"id": 104, "username": "op_delta", "full_name": "Delta Operator", "email": "delta@sysgrid.local", "department": "Operations"},
        {"id": 105, "username": "guest_epsilon", "full_name": "Epsilon Guest", "email": "epsilon@sysgrid.local", "department": "External"}
    ]
    
    new_version = models.UserPoolVersion(
        version_label=version_label,
        snapshot_data=dummy_users,
        diff_summary={"added": 5, "removed": 0, "changed": 0},
        created_by=user_id,
        is_active=True
    )
    
    # Deactivate others
    await db.execute(update(models.UserPoolVersion).values(is_active=False))
    
    db.add(new_version)
    
    # Sync to Operators table
    for u in dummy_users:
        res = await db.execute(select(models.Operator).filter(models.Operator.external_id == str(u["id"])))
        op = res.scalar_one_or_none()
        if not op:
            db.add(models.Operator(
                external_id=str(u["id"]),
                username=u["username"],
                full_name=u["full_name"],
                email=u["email"],
                department=u["department"],
                registration_status="Verified"
            ))
        else:
            op.username = u["username"]
            op.full_name = u["full_name"]
            op.email = u["email"]
            op.department = u["department"]
            op.registration_status = "Verified"
            
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
        res = await db.execute(select(models.Operator).filter(models.Operator.external_id == str(u["id"])))
        op = res.scalar_one_or_none()
        if op:
             op.username = u["username"]
             op.full_name = u["full_name"]
             op.email = u["email"]
             op.department = u["department"]
             
    await db.commit()
    return {"status": "success"}

@router.get("/initialize")
async def initialize_settings(db: AsyncSession = Depends(get_db)):
    # Simple check if already initialized
    res = await db.execute(select(models.SettingOption))
    if res.scalars().first():
        # Even if initialized, check if AppGlobal exists in GlobalSetting, if not, add it
        res_global = await db.execute(select(models.GlobalSetting).filter(models.GlobalSetting.category == "AppGlobal"))
        if not res_global.scalars().first():
             global_defaults = [
                ("app_name", "SYSGRID ENGINE", "App Name", False),
                ("org_name", "Global Infrastructure Corp", "Organization", False),
                ("site_id", "HQ-01", "Primary Site ID", False),
                ("retention_days", "30", "Data Retention Days", False),
                ("maintenance_mode", "false", "Maintenance Mode Status", False),
                ("default_timezone", "UTC", "Default System Timezone", False),
                ("dashboard_refresh_interval", "60", "Refresh Rate (s)", False),
                ("security_level", "Standard", "Base Security Profile", False),
                ("audit_log_level", "Full", "Audit Detail Level", False),
                ("ui_primary_color", "#3b82f6", "Primary Branding Color", False),
                ("ui_accent_color", "#10b981", "Accent Branding Color", False),
                ("support_email", "admin@infra.local", "Admin Support Email", False),
                ("VITE_APP_TITLE", "SYSGRID Tactical", "UI Title", True),
                ("VITE_POLLING_INTERVAL", "5000", "Polling Interval (ms)", True),
                ("VITE_ENABLE_WEBSOCKETS", "true", "Enable WebSockets", True),
                ("VITE_THEME_DEFAULT", "nordic-frost-v1", "Default UI Theme", True),
                ("VITE_UI_TIMEOUT", "30000", "UI Request Timeout", True),
                ("VITE_MAX_GRID_ROWS", "100", "Max Rows in Grids", True),
                ("PORT", "8000", "Backend Port", True),
                ("API_ENDPOINT", "/api/v1", "API Prefix", True)
            ]
             for key, val, desc, public in global_defaults:
                db.add(models.GlobalSetting(key=key, value=val, category="AppGlobal", description=desc, is_public=public))
             await db.commit()
        return {"status": "already_initialized"}
        
    # Main initialization for first run
    global_defaults = [
        ("app_name", "SYSGRID ENGINE", "App Name", False),
        ("org_name", "Global Infrastructure Corp", "Organization", False),
        ("site_id", "HQ-01", "Primary Site ID", False),
        ("retention_days", "30", "Data Retention Days", False),
        ("maintenance_mode", "false", "Maintenance Mode Status", False),
        ("default_timezone", "UTC", "Default System Timezone", False),
        ("dashboard_refresh_interval", "60", "Refresh Rate (s)", False),
        ("security_level", "Standard", "Base Security Profile", False),
        ("audit_log_level", "Full", "Audit Detail Level", False),
        ("ui_primary_color", "#3b82f6", "Primary Branding Color", False),
        ("ui_accent_color", "#10b981", "Accent Branding Color", False),
        ("support_email", "admin@infra.local", "Admin Support Email", False),
        ("VITE_APP_TITLE", "SYSGRID Tactical", "UI Title", True),
        ("VITE_POLLING_INTERVAL", "5000", "Polling Interval (ms)", True),
        ("VITE_ENABLE_WEBSOCKETS", "true", "Enable WebSockets", True),
        ("VITE_THEME_DEFAULT", "nordic-frost-v1", "Default UI Theme", True),
        ("VITE_UI_TIMEOUT", "30000", "UI Request Timeout", True),
        ("VITE_MAX_GRID_ROWS", "100", "Max Rows in Grids", True),
        ("PORT", "8000", "Backend Port", True),
        ("API_ENDPOINT", "/api/v1", "API Prefix", True)
    ]
    for key, val, desc, public in global_defaults:
        db.add(models.GlobalSetting(key=key, value=val, category="AppGlobal", description=desc, is_public=public))
    
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
    ]
    for cat, val, desc in defaults:
        db.add(models.SettingOption(category=cat, label=val, value=val, description=desc))
        
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
        
    await db.commit()
    return {"status": "initialized"}
