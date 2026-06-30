from app.runtime_diagnostics import build_readiness_payload


def test_build_readiness_payload_is_safe():
    payload = build_readiness_payload()

    assert payload["status"] == "ready"
    assert payload["alive"] is True
    assert payload["api_prefix"] == "/api/v1"
    assert payload["import_export_contract"]["external_profile"] == "external_entities"
    assert payload["import_export_contract"]["external_schema_version"] == "2026-06-external-v1"
    assert "DATABASE_URL" not in payload
    assert "config_database_url" not in payload
