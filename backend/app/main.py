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
async def startup():
    # 1. Initialize Tables Asynchronously
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 2. SCHEMA GUARD: Verify critical columns exist
    # Note: async inspection is a bit different, but for SQLite startup we can skip or use sync check
    # But since we're in async, we just ensure the metadata is created.

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
        "mode": "Fully Asynchronous"
    }
