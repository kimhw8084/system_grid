import pytest

from app.models import models
from conftest import TestingSessionLocal


@pytest.mark.anyio
async def test_network_connections_are_unique_and_edit_validation_is_enforced(client):
    source_res = await client.post("/api/v1/devices", json={
        "name": "NET-SRC-01",
        "system": "NET-QA",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-SRC-SN-01",
        "asset_tag": "NET-SRC-AT-01",
    })
    assert source_res.status_code == 200, source_res.text
    source = source_res.json()

    peer_res = await client.post("/api/v1/devices", json={
        "name": "NET-PEER-01",
        "system": "NET-QA",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-PEER-SN-01",
        "asset_tag": "NET-PEER-AT-01",
    })
    assert peer_res.status_code == 200, peer_res.text
    peer = peer_res.json()

    extra_res = await client.post("/api/v1/devices", json={
        "name": "NET-EXTRA-01",
        "system": "NET-QA",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-EXTRA-SN-01",
        "asset_tag": "NET-EXTRA-AT-01",
    })
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
    })
    assert create_res.status_code == 200, create_res.text
    connection = create_res.json()

    async with TestingSessionLocal() as session:
      session.add_all([
          models.DeviceLocation(device_id=source["id"], rack_id=None, start_unit=1, size_u=1),
          models.DeviceLocation(device_id=source["id"], rack_id=None, start_unit=2, size_u=1),
          models.DeviceLocation(device_id=peer["id"], rack_id=None, start_unit=3, size_u=1),
      ])
      await session.commit()

    list_res = await client.get("/api/v1/networks/connections")
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
    })
    assert other_res.status_code == 200, other_res.text
    other_connection = other_res.json()

    conflict_res = await client.put(f"/api/v1/networks/connections/{other_connection['id']}", json={
        "device_a_id": extra["id"],
        "port_a": "eth9",
        "device_b_id": source["id"],
        "port_b": "eth0",
    })
    assert conflict_res.status_code == 400
    assert "already physically cross-connected" in conflict_res.text

    self_link_res = await client.put(f"/api/v1/networks/connections/{other_connection['id']}", json={
        "device_a_id": source["id"],
        "port_a": "eth8",
        "device_b_id": source["id"],
        "port_b": "eth9",
    })
    assert self_link_res.status_code == 400
    assert "must be different" in self_link_res.text


@pytest.mark.anyio
async def test_network_edit_persists_unit_and_bulk_delete_is_atomic(client):
    source_res = await client.post("/api/v1/devices", json={
        "name": "NET-BULK-SRC-01",
        "system": "NET-BULK",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-BULK-SRC-SN-01",
        "asset_tag": "NET-BULK-SRC-AT-01",
    })
    target_res = await client.post("/api/v1/devices", json={
        "name": "NET-BULK-PEER-01",
        "system": "NET-BULK",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-BULK-PEER-SN-01",
        "asset_tag": "NET-BULK-PEER-AT-01",
    })
    third_res = await client.post("/api/v1/devices", json={
        "name": "NET-BULK-PEER-02",
        "system": "NET-BULK",
        "status": "Active",
        "type": "Physical",
        "serial_number": "NET-BULK-PEER-SN-02",
        "asset_tag": "NET-BULK-PEER-AT-02",
    })
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
    })
    conn_b_res = await client.post("/api/v1/networks/connections", json={
        "device_a_id": source["id"],
        "source_port": "eth12",
        "device_b_id": third["id"],
        "target_port": "eth13",
        "link_type": "Management",
        "speed_gbps": 1,
        "unit": "Gbps",
        "status": "Planned",
    })
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
    })
    assert update_res.status_code == 200, update_res.text

    list_res = await client.get("/api/v1/networks/connections")
    assert list_res.status_code == 200
    updated = next(row for row in list_res.json() if row["id"] == conn_a["id"])
    assert updated["unit"] == "Mbps"
    assert updated["speed"] == "100.0 Mbps"
    assert updated["status"] == "Maintenance"

    bulk_delete_res = await client.post("/api/v1/networks/connections/bulk-delete", json={
        "ids": [conn_a["id"], conn_b["id"]]
    })
    assert bulk_delete_res.status_code == 200, bulk_delete_res.text
    assert bulk_delete_res.json()["count"] == 2

    final_res = await client.get("/api/v1/networks/connections")
    remaining_ids = {row["id"] for row in final_res.json()}
    assert conn_a["id"] not in remaining_ids
    assert conn_b["id"] not in remaining_ids
