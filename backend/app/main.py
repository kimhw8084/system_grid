from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select, text
from .database import engine, Base, AsyncSessionLocal
from .models import models
from .api import devices, import_engine, networks, security, dashboard, racks, audit, sites, maintenance, logical_services, settings as settings_api, monitoring, troubleshoot, data_flows, intelligence, rca, investigations, far, projects, vendors, knowledge

async def _auto_seed():
    async with AsyncSessionLocal() as db:
        # 1. Verify Global Settings (App Brain)
        res_global = await db.execute(select(models.GlobalSetting))
        if not res_global.scalars().first():
            print("AUTO-BOOT: Seeding missing Global Settings...")
            global_defaults = [
                ("app_name", "SYSGRID ENGINE", "General", False),
                ("org_name", "Global Infrastructure Corp", "General", False),
                ("site_id", "HQ-01", "General", False),
                ("retention_days", "30", "Infrastructure", False),
                ("maintenance_mode", "false", "Infrastructure", False),
                ("default_timezone", "UTC", "General", False),
                ("dashboard_refresh_interval", "60", "UI", False),
                ("security_level", "Standard", "Infrastructure", False),
                ("audit_log_level", "Full", "Infrastructure", False),
                ("ui_primary_color", "#3b82f6", "UI", False),
                ("ui_accent_color", "#10b981", "UI", False),
                ("support_email", "admin@infra.local", "General", False),
                ("VITE_APP_TITLE", "SYSGRID Tactical", "General", True),
                ("VITE_POLLING_INTERVAL", "5000", "Infrastructure", True),
                ("VITE_ENABLE_WEBSOCKETS", "true", "Infrastructure", True),
                ("VITE_THEME_DEFAULT", "nordic-frost-v1", "UI", True),
                ("VITE_UI_TIMEOUT", "30000", "Infrastructure", True),
                ("VITE_MAX_GRID_ROWS", "100", "UI", True),
                ("PORT", "8000", "Infrastructure", True),
                ("API_ENDPOINT", "/api/v1", "Infrastructure", True)
            ]
            for key, val, cat, public in global_defaults:
                db.add(models.GlobalSetting(key=key, value=val, category=cat, is_public=public))
            await db.commit()

        # 2. Verify Setting Options (Metadata)
        res = await db.execute(select(models.SettingOption))
        if res.scalars().first():
            return  # Already seeded

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
            ("Environment", "Dev", "Development environment"),
            ("Environment", "DR", "Disaster Recovery Node"),
            ("Environment", "Lab", "Lab or sandbox environment"),
            # Business Units
            ("BusinessUnit", "Engineering", "Engineering & R&D"),
            ("BusinessUnit", "Operations", "IT Operations"),
            ("BusinessUnit", "Finance", "Finance & Accounting"),
            ("BusinessUnit", "HR", "Human Resources"),
            ("BusinessUnit", "Sales", "Sales & Business Development"),
            ("BusinessUnit", "Security", "Information Security"),
            # Vendor Countries
            ("VendorCountry", "South Korea", "Republic of Korea"),
            ("VendorCountry", "USA", "United States of America"),
        ]
        for cat, val, desc in defaults:
            db.add(models.SettingOption(category=cat, label=val, value=val, description=desc))

        service_types = [
            ("Database", ["engine", "instance_name", "port", "sid", "collation", "always_on", "data_path", "backup_policy"]),
            ("Web API", ["server_type", "url", "bindings", "app_pool", "ssl_expiry", "root_path"]),
            ("Auth Service", ["protocol", "domain", "key_rotation", "mfa_enabled"]),
            ("Middleware", ["platform", "queue_names", "max_consumers", "heartbeat_interval"]),
            ("Storage Hub", ["volume_id", "protocol", "iops", "encryption_status", "tier"]),
            ("Cache", ["engine", "port", "memory_limit", "eviction_policy", "clustered"])
        ]
        for val, keys in service_types:
            db.add(models.SettingOption(category="ServiceType", label=val, value=val, metadata_keys=keys))

        # 3. Ensure we have a default operator and role
        res = await db.execute(select(models.Role).filter(models.Role.name == "SuperAdmin"))
        admin_role = res.scalar_one_or_none()
        if not admin_role:
            admin_role = models.Role(name="SuperAdmin", permissions={"dashboard": 3, "settings": 3, "audit": 3})
            db.add(admin_role)
            await db.commit()
            await db.refresh(admin_role)
        
        res = await db.execute(select(models.Operator).filter(models.Operator.username == "admin_root"))
        if not res.scalar_one_or_none():
            db.add(models.Operator(
                external_id="1000",
                username="admin_root",
                full_name="System Administrator",
                email="admin@sysgrid.local",
                department="Infrastructure",
                role_id=admin_role.id,
                registration_status="Verified"
            ))
            
        await db.commit()
        print("Settings and Operators self-healed.")

from .core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _auto_seed()
    yield

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import traceback
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan, redirect_slashes=False)

# Make manager accessible to routers
app.state.ws_manager = manager

@app.websocket(f"{settings.API_V1_STR}/ws/sync")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Just keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Capture full traceback
    tb = traceback.format_exc()
    print(f"ERROR: {str(exc)}\n{tb}") # Still log to terminal
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "traceback": tb,
            "path": request.url.path
        }
    )

# Determine adaptive CORS credentials based on origins
# If '*' is in origins, credentials must be False per CORS spec.
origins = settings.BACKEND_CORS_ORIGINS
allow_creds = False if "*" in origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router, prefix=settings.API_V1_STR)
app.include_router(import_engine.router, prefix=settings.API_V1_STR)
app.include_router(networks.router, prefix=settings.API_V1_STR)
app.include_router(security.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(racks.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(sites.router, prefix=settings.API_V1_STR)
app.include_router(maintenance.router, prefix=settings.API_V1_STR)
app.include_router(logical_services.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)
app.include_router(monitoring.router, prefix=settings.API_V1_STR)
app.include_router(troubleshoot.router, prefix=settings.API_V1_STR)
app.include_router(data_flows.router, prefix=settings.API_V1_STR)
app.include_router(intelligence.router, prefix=settings.API_V1_STR)
app.include_router(rca.router, prefix=settings.API_V1_STR)
app.include_router(investigations.router, prefix=settings.API_V1_STR)
app.include_router(far.router, prefix=settings.API_V1_STR)
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(vendors.router, prefix=settings.API_V1_STR)
app.include_router(knowledge.router, prefix=settings.API_V1_STR)

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {"status": "online"}

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "engine": "Standard Production",
        "mode": "Fully Asynchronous"
    }
