import json

import pytest
from fastapi import HTTPException

from app.api import settings as settings_api
from app.models import models


def test_settings_helper_normalizers_and_serializers(tmp_path):
    env_path = tmp_path / "frontend.env"
    env_path.write_text(
        "\n".join(
            [
                "# comment",
                "API_URL=http://localhost:8000",
                "QUOTED=\"value\"",
                "SINGLE='value2'",
                "INVALID",
            ]
        ),
        encoding="utf-8",
    )

    assert settings_api.parse_env_file_to_map(str(env_path)) == {
        "API_URL": "http://localhost:8000",
        "QUOTED": "value",
        "SINGLE": "value2",
    }
    assert settings_api.parse_env_file_to_map(str(tmp_path / "missing.env")) == {}

    assert settings_api.normalize_api_origin(" https://example.com/api/v1/ ") == "https://example.com"
    assert settings_api.normalize_api_origin("https://example.com/") == "https://example.com"
    assert settings_api.normalize_api_origin(None) == ""

    assert settings_api.normalize_string("  value  ") == "value"
    assert settings_api.normalize_string("   ") is None
    assert set(settings_api.normalize_string_list(["Beta", " alpha ", "", "beta", None])) == {"alpha", "Beta", "beta"}
    assert settings_api.split_team_name_values("Ops,\nSec, Ops") == ["Ops", "Sec", "Ops"]
    assert settings_api.split_team_name_values(["Ops", " Sec "]) == ["Ops", "Sec"]

    assert settings_api.normalize_permission_map(
        {
            " devices ": "admin",
            "services": True,
            "vendors": 7,
            "projects": -1,
            "empty": "",
            "ignored": object(),
        }
    ) == {
        "devices": 3,
        "empty": 0,
        "ignored": 0,
        "projects": 0,
        "services": 1,
        "vendors": 3,
    }

    encoded = settings_api.serialize_user_preference_value({"theme": "dark"})
    assert json.loads(encoded) == {"theme": "dark"}
    assert settings_api.deserialize_user_preference_value(encoded) == {"theme": "dark"}
    assert settings_api.deserialize_user_preference_value("plain-text") == "plain-text"
    assert settings_api.deserialize_user_preference_value(None) is None

    with pytest.raises(HTTPException) as exc:
        settings_api.serialize_user_preference_value({1, 2, 3})
    assert exc.value.status_code == 400
    assert "not JSON serializable" in exc.value.detail


def test_settings_snapshot_delta_and_canonical_operator_state():
    role = models.Role(name="Admin", permissions={"devices": 3})
    operator = models.Operator(
        external_id="ext-1",
        username="user.one",
        full_name="User One",
        email="user.one@example.com",
        department="Ops",
        team="Core Ops",
        team_id=7,
        team_source="sync",
        teams=["Core Ops", "Secondary"],
        is_admin=True,
        custom_permissions={"projects": True},
        registration_status="Verified",
        role_id=role.id,
    )

    canonical = settings_api.canonical_operator_state(operator)
    assert canonical == {
        "external_id": "ext-1",
        "username": "user.one",
        "full_name": "User One",
        "email": "user.one@example.com",
        "department": "Ops",
        "team": "Core Ops",
        "team_id": 7,
        "team_source": "sync",
        "teams": ["Core Ops", "Secondary"],
        "is_admin": True,
        "custom_permissions": {"projects": 1},
        "registration_status": "Verified",
        "role_id": None,
    }

    summary = settings_api.summarize_user_pool_snapshot_delta(
        before_snapshot=[
            {"external_id": "A", "username": "alpha", "full_name": "Alpha"},
            {"external_id": "B", "username": "beta", "full_name": "Beta"},
        ],
        after_snapshot=[
            {"external_id": "A", "username": "alpha", "full_name": "Alpha Updated"},
            {"external_id": "C", "username": "gamma", "full_name": "Gamma"},
        ],
        extra_summary={"source": "unit-test"},
    )

    assert summary["added"] == 1
    assert summary["removed"] == 1
    assert summary["changed"] == 1
    assert summary["source"] == "unit-test"
    assert {item["mode"] for item in summary["changed_identities"]} == {"added", "removed", "changed"}
