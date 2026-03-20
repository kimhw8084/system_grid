from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .models import models
from .api import devices, import_engine

app = FastAPI(title="System System Grid API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend IP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    # Automatically create the 16-table schema on first run
    Base.metadata.create_all(bind=engine)

# Include Presidential Routers
app.include_router(devices.router, prefix="/api/v1")
app.include_router(import_engine.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "System System Grid",
        "engine": "Presidential Level",
        "tables_initialized": 16,
        "intelligence_engine": "ready",
        "nexus_sync": "active"
    }
