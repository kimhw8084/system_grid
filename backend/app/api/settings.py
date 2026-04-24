import os
import io
import json
import pandas as pd
import numpy as np
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/settings", tags=["Settings"])

class EnvUpdate(BaseModel):
    api_endpoint: str | None = None
    db_path: str | None = None
    storage_root: str | None = None
    image_path: str | None = None
    backup_path: str | None = None
    scripts_path: str | None = None
    user_pool_path: str | None = None
    log_level: str | None = None
    venv_path: str | None = None

class PoolSync(BaseModel):
    script: str

@router.get("/user/profile")
async def get_user_profile():
    # Identify user by OS environment
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown Operator"
    return {
        "username": username,
        "role": "Lead Systems Engineer", # Simulated role
        "avatar": None,
        "department": "Infrastructure Ops"
    }

@router.get("/env")
async def get_env_vars():
    env_data = {
        "api_endpoint": os.getenv("API_ENDPOINT", "http://localhost:8000"),
        "db_path": os.getenv("DATABASE_URL", "./sysgrid.db"),
        "storage_root": os.getenv("STORAGE_ROOT", "./storage"),
        "image_path": os.getenv("IMAGE_PATH", "./storage/images"),
        "backup_path": os.getenv("BACKUP_PATH", "./backups"),
        "scripts_path": os.getenv("SCRIPTS_PATH", "./scripts"),
        "user_pool_path": os.getenv("USER_POOL_PATH", "./storage/user_pool.json"),
        "log_level": os.getenv("LOG_LEVEL", "INFO"),
        "venv_path": os.getenv("VENV_PATH", sys.prefix if hasattr(sys, 'prefix') else "./venv")
    }
    return env_data

import sys

from ..core.config import settings as app_settings

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
    mapping = {
        "api_endpoint": "API_ENDPOINT",
        "db_path": "DATABASE_URL",
        "storage_root": "STORAGE_ROOT",
        "image_path": "IMAGE_PATH",
        "backup_path": "BACKUP_PATH",
        "scripts_path": "SCRIPTS_PATH",
        "user_pool_path": "USER_POOL_PATH",
        "log_level": "LOG_LEVEL",
        "venv_path": "VENV_PATH"
    }
    
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "Unknown Operator"
    env_path = ".env"
    current_env = {}
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        current_env[parts[0]] = parts[1]

    update_dict = data.dict(exclude_unset=True)
    for feat, env_key in mapping.items():
        if feat in update_dict:
            new_val = str(update_dict[feat])
            old_val = current_env.get(env_key, os.environ.get(env_key, ""))
            
            if new_val != old_val:
                # Log the change
                history_entry = models.EnvHistory(
                    field=feat,
                    old_value=old_val,
                    new_value=new_val,
                    user=username
                )
                db.add(history_entry)
                
                # Update current process and .env data
                current_env[env_key] = new_val
                os.environ[env_key] = new_val
                
                # Hot Reload: Some libraries might need direct attribute update on the settings object
                # Only set if it's a real field, not a property (like DATABASE_URL)
                if hasattr(app_settings, env_key) and not isinstance(getattr(type(app_settings), env_key, None), property):
                    try:
                        setattr(app_settings, env_key, new_val)
                    except Exception:
                        pass # Ignore if not settable

    from ..database import refresh_engine
    engine_refreshed = refresh_engine()
    
    await db.commit()

    with open(env_path, "w") as f:
        f.write("# SYSGRID AUTO-GENERATED ENVIRONMENT CONFIG\n")
        f.write(f"# LAST_UPDATED_BY: {username}\n")
        for k, v in current_env.items():
            f.write(f"{k}={v}\n")
            
    return {"status": "success", "message": "Environment synchronized and Hot-Reloaded successfully"}

@router.post("/user-pool/refresh")
async def refresh_user_pool(data: PoolSync):
    try:
        # Ensure pandas and numpy are available in the execution namespace
        exec_globals = {
            "pd": pd, 
            "np": np,
            "os": os,
            "json": json,
            "__builtins__": __builtins__
        }
            
        # Execute the user provided script
        # Using exec_globals for both globals and locals ensures 'pd' is available
        exec(data.script, exec_globals)
        
        if "result_df" not in exec_globals:
            raise HTTPException(400, "Script must define 'result_df' variable")
            
        df = exec_globals["result_df"]
        if not isinstance(df, pd.DataFrame):
            raise HTTPException(400, "'result_df' must be a Pandas DataFrame")
            
        # Validate columns
        required = ["id", "username", "email", "department", "registration_status"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(400, f"DataFrame missing required columns: {missing}")
            
        pool_file = os.getenv("USER_POOL_PATH", "./storage/user_pool.json")
        os.makedirs(os.path.dirname(pool_file), exist_ok=True)
        
        df.to_json(pool_file, orient="records")
        
        return {"status": "success", "count": len(df), "path": pool_file}
    except Exception as e:
        raise HTTPException(400, f"Python Execution Error: {str(e)}")


@router.get("/user/settings")
async def get_user_settings():
    username = os.environ.get("USER") or os.environ.get("USERNAME") or "default"
    settings_dir = "./storage/user_settings"
    os.makedirs(settings_dir, exist_ok=True)
    settings_file = os.path.join(settings_dir, f"{username}.json")
    
    if os.path.exists(settings_file):
        with open(settings_file, "r") as f:
            return json.load(f)
    
    # Defaults
    return {"theme": "dark", "sidebar_open": True}

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

@router.get("/user-pool")
async def get_user_pool():
    pool_file = os.getenv("USER_POOL_PATH", "./storage/user_pool.json")
    if not os.path.exists(pool_file):
        return []
    return pd.read_json(pool_file).to_dict(orient="records")

@router.get("/user/env-vars")
async def get_linux_env_vars():
    # Return a set of interesting/important Linux environment variables
    important_keys = [
        "USER", "HOME", "PATH", "SHELL", "PWD", "LANG", "TERM", 
        "LOGNAME", "HOSTNAME", "PYTHONPATH", "LD_LIBRARY_PATH", 
        "EDITOR", "TZ", "DISPLAY", "XDG_RUNTIME_DIR", "SSH_AUTH_SOCK",
        "VSCODE_GIT_IPC_HANDLE", "TERM_PROGRAM", "TERM_PROGRAM_VERSION"
    ]
    
    # Also include some system info
    import platform
    system_info = {
        "OS_SYSTEM": platform.system(),
        "OS_RELEASE": platform.release(),
        "OS_VERSION": platform.version(),
        "OS_MACHINE": platform.machine(),
        "PYTHON_VERSION": sys.version.split()[0]
    }
    
    env_vars = {k: os.environ.get(k, "Not Set") for k in important_keys}
    return {**env_vars, **system_info}

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    exclude = {"id", "created_at", "updated_at", "created_by_user_id"}
    return {k: v for k, v in data.items() if k in valid_keys and k not in exclude}

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
    
    # Template Protection: If category is ServiceType or ExternalType, check if removing keys that are in use
    if opt.category in ["ServiceType", "ExternalType"] and 'metadata_keys' in data:
        new_keys = set(data.get('metadata_keys', []))
        old_keys = set(opt.metadata_keys or [])
        removed_keys = old_keys - new_keys
        
        if removed_keys:
            # Check if any LogicalService or ExternalEntity of this type uses these keys
            if opt.category == "ServiceType":
                usage_query = select(models.LogicalService).filter(models.LogicalService.service_type == opt.value)
                usage_res = await db.execute(usage_query)
                in_use_items = usage_res.scalars().all()
            else:
                usage_query = select(models.ExternalEntity).filter(models.ExternalEntity.type == opt.value)
                usage_res = await db.execute(usage_query)
                in_use_items = usage_res.scalars().all()

            for item in in_use_items:
                config = item.config_json if opt.category == "ServiceType" else item.metadata_json
                config = config or {}
                for rk in removed_keys:
                    if rk in config and config[rk]: # If key exists and has a value
                        raise HTTPException(status_code=400, detail=f"Cannot remove metadata key '{rk}' because it is in use by {opt.category.replace('Type', '')} '{item.name}'")

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
        res_dev = await db.execute(select(models.Device).filter(models.Device.status == opt.value, models.Device.is_deleted == False))
        res_svc = await db.execute(select(models.LogicalService).filter(models.LogicalService.status == opt.value, models.LogicalService.is_deleted == False))
        if res_dev.scalars().first() or res_svc.scalars().first(): in_use = True
    elif opt.category == "Environment":
        res_dev = await db.execute(select(models.Device).filter(models.Device.environment == opt.value, models.Device.is_deleted == False))
        res_svc = await db.execute(select(models.LogicalService).filter(models.LogicalService.environment == opt.value, models.LogicalService.is_deleted == False))
        if res_dev.scalars().first() or res_svc.scalars().first(): in_use = True
    elif opt.category == "DeviceType":
        res = await db.execute(select(models.Device).filter(models.Device.type == opt.value, models.Device.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "LogicalSystem":
        res_dev = await db.execute(select(models.Device).filter(models.Device.system == opt.value, models.Device.is_deleted == False))
        res_rca = await db.execute(select(models.RcaRecord).filter(models.RcaRecord.target_systems.contains(opt.value), models.RcaRecord.is_deleted == False))
        res_inv = await db.execute(select(models.Investigation).filter(models.Investigation.systems.contains(opt.value), models.Investigation.is_deleted == False))
        if res_dev.scalars().first() or res_rca.scalars().first() or res_inv.scalars().first(): in_use = True
    elif opt.category == "ResearchCategory":
        res = await db.execute(select(models.Investigation).filter(models.Investigation.research_domain == opt.value, models.Investigation.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "FailureCategory":
        res = await db.execute(select(models.Investigation).filter(models.Investigation.failure_domain == opt.value, models.Investigation.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "IncidentType":
        res = await db.execute(select(models.RcaRecord).filter(models.RcaRecord.incident_type == opt.value, models.RcaRecord.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "DetectionType":
        res = await db.execute(select(models.RcaRecord).filter(models.RcaRecord.detection_type == opt.value, models.RcaRecord.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "ImpactType":
        res = await db.execute(select(models.RcaRecord).filter(models.RcaRecord.impact_type == opt.value, models.RcaRecord.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "EventType":
        res_timeline = await db.execute(select(models.RcaTimelineEvent).filter(models.RcaTimelineEvent.event_type == opt.value))
        res_log = await db.execute(select(models.InvestigationProgress).filter(models.InvestigationProgress.entry_type == opt.value))
        if res_timeline.scalars().first() or res_log.scalars().first(): in_use = True
    elif opt.category == "Manufacturer":
        res = await db.execute(select(models.Device).filter(models.Device.manufacturer == opt.value, models.Device.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "Model":
        res = await db.execute(select(models.Device).filter(models.Device.model == opt.value, models.Device.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "Owner":
        res = await db.execute(select(models.Device).filter(models.Device.owner == opt.value, models.Device.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "BusinessUnit":
        res = await db.execute(select(models.Device).filter(models.Device.business_unit == opt.value, models.Device.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "Vendor":
        res_dev = await db.execute(select(models.Device).filter(models.Device.vendor == opt.value, models.Device.is_deleted == False))
        res_svc = await db.execute(select(models.LogicalService).filter(models.LogicalService.vendor == opt.value, models.LogicalService.is_deleted == False))
        if res_dev.scalars().first() or res_svc.scalars().first(): in_use = True
    elif opt.category == "ServiceType":
        res = await db.execute(select(models.LogicalService).filter(models.LogicalService.service_type == opt.value, models.LogicalService.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "MonitoringCategory":
        res = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.category == opt.value, models.MonitoringItem.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "MonitoringSeverity":
        res = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.severity == opt.value, models.MonitoringItem.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "NotificationMethod":
        res = await db.execute(select(models.MonitoringItem).filter(models.MonitoringItem.notification_method == opt.value, models.MonitoringItem.is_deleted == False))
        if res.scalars().first(): in_use = True
    elif opt.category == "MonitoringOwnerRole":
        res = await db.execute(select(models.MonitoringOwner).filter(models.MonitoringOwner.role == opt.value))
        if res.scalars().first(): in_use = True
    elif opt.category == "ExternalType":
        res = await db.execute(select(models.ExternalEntity).filter(models.ExternalEntity.type == opt.value))
        if res.scalars().first(): in_use = True
        
    if in_use:
        raise HTTPException(status_code=400, detail=f"Cannot delete '{opt.label}' because it is currently assigned to one or more assets or services.")
        
    await db.delete(opt)
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
    res = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == "AppGlobal"))
    opts = res.scalars().all()
    
    settings = {
        "app_name": "SYSGRID ENGINE",
        "org_name": "Global Infrastructure Corp",
        "site_id": "HQ-01",
        "retention_days": "30",
        "maintenance_mode": "false",
        "default_timezone": "UTC",
        "dashboard_refresh_interval": "60",
        "security_level": "Standard",
        "audit_log_level": "Full",
        "ui_primary_color": "#3b82f6",
        "ui_accent_color": "#10b981",
        "support_email": "admin@infra.local"
    }
    
    for o in opts:
        settings[o.label] = o.value
            
    return settings

@router.post("/global")
async def update_global_settings(data: dict, db: AsyncSession = Depends(get_db)):
    for key, value in data.items():
        res = await db.execute(select(models.SettingOption).filter(
            models.SettingOption.category == "AppGlobal",
            models.SettingOption.label == key
        ))
        opt = res.scalar_one_or_none()
        if opt:
            opt.value = str(value)
        else:
            db.add(models.SettingOption(category="AppGlobal", label=key, value=str(value)))
            
    await db.commit()
    return {"status": "success"}

@router.get("/initialize")
async def initialize_settings(db: AsyncSession = Depends(get_db)):
    # Simple check if already initialized
    res = await db.execute(select(models.SettingOption))
    if res.scalars().first():
        # Even if initialized, check if AppGlobal exists, if not, add it
        res_global = await db.execute(select(models.SettingOption).filter(models.SettingOption.category == "AppGlobal"))
        if not res_global.scalars().first():
             global_defaults = [
                ("AppGlobal", "app_name", "SYSGRID ENGINE"),
                ("AppGlobal", "org_name", "Global Infrastructure Corp"),
                ("AppGlobal", "site_id", "HQ-01"),
                ("AppGlobal", "retention_days", "30"),
                ("AppGlobal", "maintenance_mode", "false"),
                ("AppGlobal", "default_timezone", "UTC"),
                ("AppGlobal", "dashboard_refresh_interval", "60"),
                ("AppGlobal", "security_level", "Standard"),
                ("AppGlobal", "audit_log_level", "Full"),
                ("AppGlobal", "ui_primary_color", "#3b82f6"),
                ("AppGlobal", "ui_accent_color", "#10b981"),
                ("AppGlobal", "support_email", "admin@infra.local")
            ]
             for cat, key, val in global_defaults:
                db.add(models.SettingOption(category=cat, label=key, value=val))
             await db.commit()
        return {"status": "already_initialized"}
        
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
        # Monitoring
        ("MonitoringCategory", "Infrastructure", "Hardware and OS level monitoring"),
        ("MonitoringCategory", "Log", "Log pattern and regex monitoring"),
        ("MonitoringCategory", "Network", "Connectivity and latency monitoring"),
        ("MonitoringCategory", "Application", "Application health and metrics monitoring"),
        ("MonitoringCategory", "Synthetic", "Synthetic transactions and availability"),
        ("MonitoringSeverity", "Critical", "Immediate action required"),
        ("MonitoringSeverity", "Warning", "Needs attention soon"),
        ("MonitoringSeverity", "Info", "Purely informational"),
        ("NotificationMethod", "Email", "Standard email alerts"),
        ("NotificationMethod", "Slack", "Instant message alerts"),
        ("NotificationMethod", "Teams", "Instant message alerts"),
        ("NotificationMethod", "PagerDuty", "High-priority on-call alerts"),
        ("NotificationMethod", "Webhook", "Custom automation triggers"),
        ("MonitoringOwnerRole", "Primary Support", "Main POC for alerts"),
        ("MonitoringOwnerRole", "Secondary Support", "Backup POC for alerts"),
        ("MonitoringOwnerRole", "Business Owner", "Responsible for business impact"),
        ("MonitoringOwnerRole", "Notification Subscriber", "CC only for information"),
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
        
    global_defaults = [
        ("AppGlobal", "app_name", "SYSGRID ENGINE"),
        ("AppGlobal", "org_name", "Global Infrastructure Corp"),
        ("AppGlobal", "site_id", "HQ-01"),
        ("AppGlobal", "retention_days", "30"),
        ("AppGlobal", "maintenance_mode", "false"),
        ("AppGlobal", "default_timezone", "UTC"),
        ("AppGlobal", "dashboard_refresh_interval", "60"),
        ("AppGlobal", "security_level", "Standard"),
        ("AppGlobal", "audit_log_level", "Full"),
        ("AppGlobal", "ui_primary_color", "#3b82f6"),
        ("AppGlobal", "ui_accent_color", "#10b981"),
        ("AppGlobal", "support_email", "admin@infra.local")
    ]
    for cat, key, val in global_defaults:
        db.add(models.SettingOption(category=cat, label=key, value=val))
        
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
