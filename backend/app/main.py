from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select, text
from .database import engine, Base
from .models import models
from .api import devices, import_engine, networks, security, dashboard, racks, audit, sites, maintenance, logical_services, settings as settings_api, monitoring, troubleshoot, data_flows, intelligence, rca, investigations, far, projects, vendors, knowledge, tenants

from .core.config import settings

async def run_migrations():
    import asyncio
    import os
    import sys
    print("AUTO-BOOT: Checking for pending database migrations...")
    try:
        # Determine the backend directory (where alembic.ini is)
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Run alembic upgrade head using sys.executable to ensure same venv
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "alembic", "upgrade", "head",
            cwd=backend_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            print(f"AUTO-BOOT: Migration failed: {stderr.decode()}")
        else:
            print("AUTO-BOOT: Database schema is up to date.")
    except Exception as e:
        print(f"AUTO-BOOT: Error running migrations: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize Master Config DB (Routing Brain)
    from .database import init_config_db
    await init_config_db()
    
    # 2. Ensure migrations are applied to Default DB first
    await run_migrations()
    
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
    # Capture full traceback for server-side logging
    tb = traceback.format_exc()
    error_msg = f"--- INTERNAL SERVER ERROR ---\nPath: {request.url.path}\nError: {str(exc)}\n{tb}\n----------------------------\n"
    
    # Write to file
    with open("critical_failures.log", "a") as f:
        f.write(error_msg)
        
    print(error_msg)
    
    # Do not expose raw stack traces to the client as per direction.md
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error. Please consult system logs.",
            "path": request.url.path,
            "error_type": exc.__class__.__name__
        }
    )

# Determine adaptive CORS credentials based on origins
# If '*' is in origins, credentials must be False per CORS spec.
origins = settings.cors_origins
print(f"CORS ORIGINS: {origins}")
allow_creds = False if "*" in origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tenants.router, prefix=settings.API_V1_STR)
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
