import pytest
from tests.payload_generator import PayloadGenerator
from app.schemas.schemas import DeviceCreate

@pytest.mark.anyio
async def test_device_creation_negative_payloads(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(seeded_admin_tenant["tenant_id"])}

    # Test Missing Fields
    payload = PayloadGenerator.get_missing_field_payload(DeviceCreate)
    res = await client.post("/api/v1/devices", json=payload, headers=headers)
    assert res.status_code in [400, 422], f"Expected 400/422 for missing fields, got {res.status_code}: {res.text}"

    # Test Invalid Types
    payload = PayloadGenerator.get_invalid_type_payload(DeviceCreate)
    res = await client.post("/api/v1/devices", json=payload, headers=headers)
    assert res.status_code in [400, 422], f"Expected 400/422 for invalid types, got {res.status_code}: {res.text}"
