import pytest
from app.models import models
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from fastapi import Depends
from app.database import get_db, ConfigSessionLocal, get_tenant_engine
from app.models.config import Tenant

async def seed_device_locations(tenant_id: int, device_locations_data: list[models.DeviceLocation]):
    # Get the tenant's db_url from the config database
    async with ConfigSessionLocal() as config_db:
        tenant_res = await config_db.execute(select(Tenant).filter(Tenant.id == tenant_id))
        selected_tenant_obj = tenant_res.scalar_one_or_none()
        if not selected_tenant_obj:
            pytest.fail(f"Tenant with ID {tenant_id} not found in config DB for seeding device locations.")
        tenant_db_url = selected_tenant_obj.db_url
    
    # Create a session for the specific tenant database
    tenant_engine = get_tenant_engine(tenant_db_url)
    TenantSessionLocal = async_sessionmaker(
        bind=tenant_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=True,
        class_=AsyncSession
    )

    async with TenantSessionLocal() as session:
        session.add_all(device_locations_data)
        await session.commit()
    await tenant_engine.dispose() # Dispose the engine after use

@pytest.mark.anyio
async def test_network_connections_are_unique_and_edit_validation_is_enforced(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}

    source_res = await client.post("/api/v1/devices", json={
        "name": "NET-SRC-01",
        "system": "NET-QA",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-SRC-SN-01",
        "asset_tag": "NET-SRC-AT-01",
    }, headers=headers)
    assert source_res.status_code == 200, source_res.text
    source = source_res.json()

    peer_res = await client.post("/api/v1/devices", json={
        "name": "NET-PEER-01",
        "system": "NET-QA",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-PEER-SN-01",
        "asset_tag": "NET-PEER-AT-01",
    }, headers=headers)
    assert peer_res.status_code == 200, peer_res.text
    peer = peer_res.json()

    extra_res = await client.post("/api/v1/devices", json={
        "name": "NET-EXTRA-01",
        "system": "NET-QA",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-EXTRA-SN-01",
        "asset_tag": "NET-EXTRA-AT-01",
    }, headers=headers)
    assert extra_res.status_code == 200, extra_res.text
    extra = extra_res.json()

    create_res = await client.post("/api/v1/networks/connections", json={
        "device_a_id": source["id"],
        "source_port": "eth0",
        "device_b_id": peer["id"],
        "target_port": "eth1",
        "link_type": "Data",
        "speed_gbps": 10,
        "unit": "Gbps",
        "status": "Active",
    }, headers=headers)
    assert create_res.status_code == 200, create_res.text
    connection = create_res.json()

    await seed_device_locations(tenant_id, [
        models.DeviceLocation(device_id=source["id"], rack_id=None, start_unit=1, size_u=1),
        models.DeviceLocation(device_id=source["id"], rack_id=None, start_unit=2, size_u=1),
        models.DeviceLocation(device_id=peer["id"], rack_id=None, start_unit=3, size_u=1),
    ])

    list_res = await client.get("/api/v1/networks/connections", headers=headers)
    assert list_res.status_code == 200, list_res.text
    rows = [row for row in list_res.json() if row["id"] == connection["id"]]
    assert len(rows) == 1

    other_res = await client.post("/api/v1/networks/connections", json={
        "device_a_id": extra["id"],
        "source_port": "eth9",
        "device_b_id": source["id"],
        "target_port": "eth2",
        "link_type": "Management",
        "speed_gbps": 1,
        "unit": "Gbps",
        "status": "Active",
    }, headers=headers)
    assert other_res.status_code == 200, other_res.text
    other_connection = other_res.json()

    conflict_res = await client.put(f"/api/v1/networks/connections/{other_connection['id']}", json={
        "device_a_id": extra["id"],
        "port_a": "eth9",
        "device_b_id": source["id"],
        "port_b": "eth0",
    }, headers=headers)
    assert conflict_res.status_code == 400
    assert "already physically cross-connected" in conflict_res.text

    self_link_res = await client.put(f"/api/v1/networks/connections/{other_connection['id']}", json={
        "device_a_id": source["id"],
        "port_a": "eth8",
        "device_b_id": source["id"],
        "port_b": "eth9",
    }, headers=headers)
    assert self_link_res.status_code == 400
    assert "must be different" in self_link_res.text


@pytest.mark.anyio
async def test_network_edit_persists_unit_and_bulk_delete_is_atomic(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}

    source_res = await client.post("/api/v1/devices", json={
        "name": "NET-BULK-SRC-01",
        "system": "NET-BULK",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-BULK-SRC-SN-01",
        "asset_tag": "NET-BULK-SRC-AT-01",
    }, headers=headers)
    target_res = await client.post("/api/v1/devices", json={
        "name": "NET-BULK-PEER-01",
        "system": "NET-BULK",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-BULK-PEER-SN-01",
        "asset_tag": "NET-BULK-PEER-AT-01",
    }, headers=headers)
    third_res = await client.post("/api/v1/devices", json={
        "name": "NET-BULK-PEER-02",
        "system": "NET-BULK",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-BULK-PEER-SN-02",
        "asset_tag": "NET-BULK-PEER-AT-02",
    }, headers=headers)
    assert source_res.status_code == 200 and target_res.status_code == 200 and third_res.status_code == 200
    source = source_res.json()
    target = target_res.json()
    third = third_res.json()

    conn_a_res = await client.post("/api/v1/networks/connections", json={
        "device_a_id": source["id"],
        "source_port": "eth10",
        "device_b_id": target["id"],
        "target_port": "eth11",
        "link_type": "Data",
        "speed_gbps": 10,
        "unit": "Gbps",
        "status": "Active",
    }, headers=headers)
    conn_b_res = await client.post("/api/v1/networks/connections", json={
        "device_a_id": source["id"],
        "source_port": "eth12",
        "device_b_id": third["id"],
        "target_port": "eth13",
        "link_type": "Management",
        "speed_gbps": 1,
        "unit": "Gbps",
        "status": "Planned",
    }, headers=headers)
    assert conn_a_res.status_code == 200 and conn_b_res.status_code == 200
    conn_a = conn_a_res.json()
    conn_b = conn_b_res.json()

    update_res = await client.put(f"/api/v1/networks/connections/{conn_a['id']}", json={
        "device_a_id": source["id"],
        "port_a": "eth10",
        "device_b_id": target["id"],
        "port_b": "eth11",
        "speed_gbps": 100,
        "unit": "Mbps",
        "status": "Maintenance",
    }, headers=headers)
    assert update_res.status_code == 200, update_res.text

    list_res = await client.get("/api/v1/networks/connections", headers=headers)
    assert list_res.status_code == 200
    updated = next(row for row in list_res.json() if row["id"] == conn_a["id"])
    assert updated["unit"] == "Mbps"
    assert updated["speed"] == "100.0 Mbps"
    assert updated["status"] == "Maintenance"

    bulk_delete_res = await client.post("/api/v1/networks/connections/bulk-delete", json={
        "ids": [conn_a["id"], conn_b["id"]]
    }, headers=headers)
    assert bulk_delete_res.status_code == 200, bulk_delete_res.text
    assert bulk_delete_res.json()["count"] == 2

    final_res = await client.get("/api/v1/networks/connections", headers=headers)
    remaining_ids = {row["id"] for row in final_res.json()}
    assert conn_a["id"] not in remaining_ids
    assert conn_b["id"] not in remaining_ids
