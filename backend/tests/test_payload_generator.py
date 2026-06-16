import pytest
from tests.payload_generator import PayloadGenerator
from app.schemas.schemas import DeviceCreate

def test_missing_field_payload():
    # DeviceCreate has 'name', 'serial_number', 'asset_tag' as required
    payload = PayloadGenerator.get_missing_field_payload(DeviceCreate)
    
    # Check if a field was removed
    fields = DeviceCreate.model_fields
    required_fields = [k for k, v in fields.items() if v.is_required()]
    
    assert len(payload) < len(required_fields) + (len(fields) - len(required_fields))
    # Ensure at least one required field is missing
    missing = [f for f in required_fields if f not in payload]
    assert len(missing) >= 1

def test_invalid_type_payload():
    payload = PayloadGenerator.get_invalid_type_payload(DeviceCreate)
    
    # Check if a field value was replaced with a dictionary
    assert isinstance(payload, dict)
    # The generator replaces one value with {"invalid": "object"}
    found_invalid = False
    for val in payload.values():
        if isinstance(val, dict) and "invalid" in val:
            found_invalid = True
            break
    assert found_invalid
