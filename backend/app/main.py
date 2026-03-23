from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .models import models
from .api import devices, import_engine, networks, security, dashboard, racks, audit, sites

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
    # This will create tables if they don't exist. 
    # User must delete the .db file to apply new columns.
    Base.metadata.create_all(bind=engine)

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
        "engine": "Presidential Production"
    }
