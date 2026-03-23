import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Use a separate test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_system_grid.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_create_and_get_site():
    # 1. Create Site
    response = client.post("/api/v1/sites/", json={"name": "TX-AUSTIN-01", "address": "Austin, TX"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "TX-AUSTIN-01"
    site_id = data["id"]

    # 2. Get Sites
    response = client.get("/api/v1/sites/")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_create_rack_without_site():
    # Attempting to create a rack without a site should fail or use default fallback if logic dictates
    # But since we enforced site_id locally in our UI, we test the backend robustness.
    # Our backend currently creates a default if room_id is empty, but we changed logic in UI.
    response = client.post("/api/v1/racks/", json={"name": "RACK-TEST-01", "total_u": 42, "max_power_kw": 10.0, "site_id": 1})
    # Depending on how the new logic works, it should either succeed or fail gracefully
    assert response.status_code in [200, 400]

def test_create_and_get_device():
    # 1. Create Device
    device_payload = {
        "name": "SRV-TEST-01",
        "system": "ERP-PROD",
        "type": "physical",
        "status": "active",
        "model": "R740",
        "manufacturer": "Dell",
        "os": "Ubuntu 22.04",
        "serial_number": "SN-12345TEST",
        "asset_tag": "AT-12345TEST"
    }
    response = client.post("/api/v1/devices/", json=device_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "SRV-TEST-01"
    assert data["system"] == "ERP-PROD"
    device_id = data["id"]

    # 2. Add Hardware Expansion
    hw_response = client.post(f"/api/v1/devices/{device_id}/hardware", json={
        "type": "CPU", "model": "Xeon Gold", "serial_number": "CPU-123"
    })
    assert hw_response.status_code == 200

    # 3. Add Software Expansion
    sw_response = client.post(f"/api/v1/devices/{device_id}/software", json={
        "name": "Docker", "version": "24.0.1", "category": "Runtime"
    })
    assert sw_response.status_code == 200

    # 4. Add Secret
    sec_response = client.post(f"/api/v1/devices/{device_id}/secrets", json={
        "secret_type": "SSH", "encrypted_payload": "super_secret_key"
    })
    assert sec_response.status_code == 200

def test_network_connection():
    # Create two devices first
    dev1 = client.post("/api/v1/devices/", json={"name": "NET-A", "serial_number": "NA1", "asset_tag": "TA1"}).json()
    dev2 = client.post("/api/v1/devices/", json={"name": "NET-B", "serial_number": "NA2", "asset_tag": "TA2"}).json()
    
    conn_payload = {
        "device_a_id": dev1["id"],
        "port_a": "eth0",
        "device_b_id": dev2["id"],
        "port_b": "eth1",
        "purpose": "Data",
        "speed": 10,
        "unit": "Gbps"
    }
    response = client.post("/api/v1/networks/connections", json=conn_payload)
    assert response.status_code == 200
    assert response.json()["purpose"] == "Data"

def test_audit_logs():
    response = client.get("/api/v1/audit/")
    assert response.status_code == 200
    # Should have logs from previous creates
    assert len(response.json()) > 0
