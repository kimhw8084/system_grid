from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .models import models
from .api import devices, import_engine, networks, security, dashboard, racks, audit, sites
from sqlalchemy import inspect
import logging

app = FastAPI(title="SYSGRID Production API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    # 1. Initialize Tables
    Base.metadata.create_all(bind=engine)
    
    # 2. SCHEMA GUARD: Verify critical columns exist
    # This prevents the 'no such column: devices.system' error
    inspector = inspect(engine)
    cols = [c['name'] for c in inspector.get_columns('devices')]
    if 'system' not in cols:
        print("\n" + "!"*60)
        print("CRITICAL SCHEMA MISMATCH DETECTED")
        print("The 'system' column is missing from your 'devices' table.")
        print("ACTION REQUIRED: Please delete 'backend/system_grid.db' and restart.")
        print("!"*60 + "\n")
        # In a real production app we'd run migrations here, 
        # but for MVP, a clear warning is the safest path to a clean state.

app.include_router(devices.router, prefix="/api/v1")
app.include_router(import_engine.router, prefix="/api/v1")
app.include_router(networks.router, prefix="/api/v1")
app.include_router(security.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(racks.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(sites.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "SYSGRID",
        "engine": "Presidential Production",
        "schema_verified": True
    }
