import json
import re

from app.runtime_diagnostics import build_readiness_payload


def test_build_readiness_payload_is_safe():
    payload = build_readiness_payload()
    serialized = json.dumps(payload)

    assert payload["status"] == "ready"
    assert payload["alive"] is True
    assert payload["api_prefix"] == "/api/v1"
    assert payload["import_export_contract"]["external_profile"] == "external_entities"
    assert payload["import_export_contract"]["external_schema_version"] == "2026-06-external-v1"
    assert "DATABASE_URL" not in payload
    assert "config_database_url" not in payload
    for pattern in (r"sqlite:///", r"postgres://", r"postgresql://", r"mysql://", r"mssql://", r"/Users/", r"/home/", r"C:\\\\", r"\.env"):
        assert re.search(pattern, serialized, flags=re.IGNORECASE) is None
