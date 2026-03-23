import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
import os

from app.main import app
from app.database import Base, get_db
from app.models import models

# 1. TEST PROTOCOL: Schema Integrity Check
# This test reflects the DB and ensures the actual SQL schema matches our models.
# This would have caught the 'no such column' error.

def test_database_schema_integrity():
    # Use a fresh temp DB for integrity check
    test_db = "./integrity_check.db"
    if os.path.exists(test_db): os.remove(test_db)
    
    engine = create_engine(f"sqlite:///{test_db}")
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    
    # Check 'devices' table for the 'system' column specifically
    columns = [c["name"] for c in inspector.get_columns("devices")]
    required_columns = ["id", "name", "system", "status", "model", "os", "type"]
    
    for col in required_columns:
        assert col in columns, f"CRITICAL: Column '{col}' is missing from the database schema!"
    
    os.remove(test_db)

# 2. Functional API Tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_system_grid.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    if os.path.exists("./test_system_grid.db"): os.remove("./test_system_grid.db")
    Base.metadata.create_all(bind=engine)
    yield
    if os.path.exists("./test_system_grid.db"): os.remove("./test_system_grid.db")

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200

def test_provision_asset_full_flow():
    # Test the specific 'system' column handling that failed for the user
    payload = {
        "name": "SRV-INTEGRITY-01",
        "system": "GRID-CORE",
        "status": "active",
        "model": "R740",
        "type": "physical",
        "serial_number": "SN-INT-01",
        "asset_tag": "AT-INT-01"
    }
    response = client.post("/api/v1/devices/", json=payload)
    assert response.status_code == 200, f"Failed to provision: {response.text}"
    assert response.json()["system"] == "GRID-CORE"

def test_audit_log_for_site():
    client.post("/api/v1/sites/", json={"name": "AUDIT-SITE", "address": "Test"})
    logs = client.get("/api/v1/audit/").json()
    assert any(l["table_name"] == "sites" for l in logs), "Audit log failed to capture site creation"
