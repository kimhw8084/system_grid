import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
import asyncio

from app.main import app
from app.database import Base, get_db
from app.models import models

# 1. ASYNC TEST PROTOCOL
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./test_system_grid.db"
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="module", autouse=True)
async def setup_db():
    if os.path.exists("./test_system_grid.db"): os.remove("./test_system_grid.db")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    if os.path.exists("./test_system_grid.db"): os.remove("./test_system_grid.db")

@pytest.mark.anyio
async def test_read_main():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200

@pytest.mark.anyio
async def test_provision_asset_full_flow():
    payload = {
        "name": "SRV-ASYNC-01",
        "system": "GRID-ASYNC",
        "status": "active",
        "model": "R740",
        "type": "physical",
        "serial_number": "SN-ASYNC-01",
        "asset_tag": "AT-ASYNC-01"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/devices/", json=payload)
    assert response.status_code == 200
    assert response.json()["system"] == "GRID-ASYNC"

@pytest.mark.anyio
async def test_create_site_and_audit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/sites/", json={"name": "ASYNC-SITE", "address": "Cloud"})
        logs_res = await ac.get("/api/v1/audit/")
    logs = logs_res.json()
    assert any(l["table_name"] == "sites" for l in logs)
