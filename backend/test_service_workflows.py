import pytest


@pytest.mark.anyio
async def test_service_payload_preserves_license_key_and_bulk_os_sync(client):
    device_res = await client.post("/api/v1/devices", json={
        "name": "SVC-OS-HOST",
        "system": "SVC-GRID",
        "status": "Active",
        "type": "Physical",
        "serial_number": "SVC-OS-SN",
        "asset_tag": "SVC-OS-AT",
        "owner": "OPS",
        "business_unit": "ENG"
    })
    assert device_res.status_code == 200, device_res.text
    device_id = device_res.json()["id"]

    service_res = await client.post("/api/v1/logical-services", json={
        "name": "Ubuntu 24.04",
        "service_type": "OS",
        "status": "Active",
        "environment": "Production",
        "version": "24.04",
        "device_id": device_id,
        "license_key": "LIC-1234-ABCD"
    })
    assert service_res.status_code == 200, service_res.text
    service_id = service_res.json()["id"]

    list_res = await client.get("/api/v1/logical-services")
    assert list_res.status_code == 200
    listed_service = next(s for s in list_res.json() if s["id"] == service_id)
    assert listed_service["license_key"] == "LIC-1234-ABCD"

    await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [service_id],
        "action": "update",
        "payload": {"version": "24.10"}
    })

    devices_after_update = await client.get("/api/v1/devices")
    assert devices_after_update.status_code == 200
    device_after_update = next(device for device in devices_after_update.json() if device["id"] == device_id)
    assert device_after_update["os_name"] == "Ubuntu 24.04"
    assert device_after_update["os_version"] == "24.10"

    await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [service_id],
        "action": "delete"
    })

    devices_after_delete = await client.get("/api/v1/devices")
    assert devices_after_delete.status_code == 200
    device_after_delete = next(device for device in devices_after_delete.json() if device["id"] == device_id)
    assert device_after_delete["os_name"] is None
    assert device_after_delete["os_version"] is None


@pytest.mark.anyio
async def test_service_bulk_action_rejects_unsupported_operations(client):
    response = await client.post("/api/v1/logical-services/bulk-action", json={
        "ids": [99999],
        "action": "purge"
    })
    assert response.status_code == 400
    assert "Unsupported bulk action" in response.json()["detail"]
