from contextlib import asynccontextmanager
from datetime import datetime, timezone
import asyncio
import logging
import os
import re
import sys
from uuid import uuid4

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .api import (
    audit, dashboard, data_flows, devices, far, import_engine, intelligence,
    investigations, knowledge, logical_services, maintenance, monitoring, networks,
    projects, racks, rca, security, settings as settings_api, sites, tenants,
    troubleshoot, vendors,
)
from .api.error_utils import standardize_validation_errors
from .api.import_engine import ROUND_TRIP_EXPOSE_HEADER_NAMES, ROUND_TRIP_EXPOSE_HEADERS
from .core.config import settings
from .database import config_engine, default_engine
from .runtime_diagnostics import build_readiness_payload

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("sysgrid.api")
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


async def run_migrations() -> None:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logger.info("Checking database migrations")
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "alembic",
        "upgrade",
        "head",
        cwd=backend_dir,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        error_text = stderr.decode(errors="replace").strip()
        raise RuntimeError(f"Database migration failed: {error_text}")
    logger.info("Database schema is current", extra={"migration_output": stdout.decode(errors="replace").strip()})


async def ping_engine(engine) -> tuple[bool, str | None]:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:  # readiness reports a safe summary only
        logger.warning("Readiness database check failed", exc_info=exc)
        return False, exc.__class__.__name__


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.assert_production_safe()

    from .database import init_config_db
    await init_config_db()
    await run_migrations()
    yield


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
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()
app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan, redirect_slashes=False)
standardize_validation_errors(app)
app.state.ws_manager = manager

EXPOSED_DOWNLOAD_HEADERS = list(ROUND_TRIP_EXPOSE_HEADER_NAMES)
origins = settings.cors_origins
allow_creds = False if "*" in origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=EXPOSED_DOWNLOAD_HEADERS + ["X-Request-ID"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)


@app.middleware("http")
async def request_context_and_export_headers(request: Request, call_next):
    incoming_request_id = request.headers.get("X-Request-ID", "")
    request_id = incoming_request_id if REQUEST_ID_PATTERN.fullmatch(incoming_request_id) else str(uuid4())
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    if response.status_code == 200:
        response_header_names = {key.lower() for key in response.headers.keys()}
        if {
            "content-disposition",
            "x-sysgrid-import-profile",
            "x-sysgrid-schema-version",
        }.issubset(response_header_names):
            response.headers["Access-Control-Expose-Headers"] = ROUND_TRIP_EXPOSE_HEADERS
    return response


def websocket_origin_allowed(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if "*" in settings.cors_origins:
        return not settings.is_production
    return bool(origin and origin in settings.cors_origins)


@app.websocket(f"{settings.API_V1_STR}/ws/sync")
async def websocket_endpoint(websocket: WebSocket):
    if not websocket_origin_allowed(websocket):
        await websocket.close(code=1008, reason="Origin is not allowed")
        return
    if settings.identity_mode == "trusted_proxy" and not websocket.headers.get(settings.TRUSTED_PROXY_USER_HEADER):
        await websocket.close(code=1008, reason="Authenticated proxy identity is missing")
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
        logger.exception("WebSocket sync connection failed")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid4()))
    logger.exception(
        "Unhandled request failure",
        extra={"request_id": request_id, "path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error. Please consult system logs.",
            "path": request.url.path,
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


for router in (
    tenants.router, devices.router, import_engine.router, networks.router, security.router,
    dashboard.router, racks.router, audit.router, sites.router, maintenance.router,
    logical_services.router, settings_api.router, monitoring.router, troubleshoot.router,
    data_flows.router, intelligence.router, rca.router, investigations.router, far.router,
    projects.router, vendors.router, knowledge.router,
):
    app.include_router(router, prefix=settings.API_V1_STR)


@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "online",
        "alive": True,
        "api_prefix": settings.API_V1_STR,
        "server_timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get(f"{settings.API_V1_STR}/readiness")
async def readiness_check():
    config_ok, config_error = await ping_engine(config_engine)
    default_ok, default_error = await ping_engine(default_engine)
    ready = config_ok and default_ok and not settings.production_guard_errors()
    payload = build_readiness_payload()
    payload.update({
        "status": "ready" if ready else "not_ready",
        "dependencies": {
            "config_database": {"ready": config_ok, "error_type": config_error},
            "default_database": {"ready": default_ok, "error_type": default_error},
            "production_guard": {
                "ready": not settings.production_guard_errors(),
                "error_count": len(settings.production_guard_errors()),
            },
        },
    })
    return JSONResponse(status_code=200 if ready else 503, content=payload)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "environment": settings.environment_name,
    }
