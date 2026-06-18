import types
from datetime import datetime, timezone

from app.api import utils
from app.models import models


class DummyHeaders:
    def __init__(self, values=None):
        self._values = values or {}

    def get(self, key):
        return self._values.get(key)


class DummyRequest:
    def __init__(self, headers=None):
        self.headers = DummyHeaders(headers)


def test_normalize_json_helpers_and_audit_builder():
    class CustomValue:
        def __str__(self):
            return "custom-value"

    normalized = utils.normalize_json_object(
        {
            "b": [1, {"z": True, 9: "drop-me"}],
            "A": CustomValue(),
            5: "skip-non-string-key",
        }
    )
    assert normalized == {
        "A": "custom-value",
        "b": [1, {"z": True}],
    }
    assert utils.normalize_json_object("not-a-dict") == {}
    assert utils.normalize_json_list("not-a-list") == []

    log = utils.build_audit_log(
        request=DummyRequest({"X-User-Id": "header-user"}),
        action="CREATE",
        target_table="devices",
        target_id="17",
        description="Created device",
        changes={"b": 2, "a": 1},
    )
    assert isinstance(log, models.AuditLog)
    assert log.user_id == "header-user"
    assert log.target_id == "17"
    assert log.changes == {"a": 1, "b": 2}


def test_get_current_user_id_precedence(monkeypatch):
    request = DummyRequest({"X-User-Id": "request-user"})

    monkeypatch.setattr(utils.settings, "USER_ID_ENV_VAR", "CONFIGURED_USER_ID")
    monkeypatch.setenv("CONFIGURED_USER_ID", "configured-user")
    monkeypatch.setenv("user_name", "legacy-user")
    monkeypatch.setenv("USER_ID", "legacy-id")
    assert utils.get_current_user_id(request) == "configured-user"

    monkeypatch.delenv("CONFIGURED_USER_ID", raising=False)
    assert utils.get_current_user_id(request) == "request-user"

    request_without_header = DummyRequest()
    monkeypatch.setenv("user_name", "legacy-user")
    assert utils.get_current_user_id(request_without_header) == "legacy-user"

    monkeypatch.delenv("user_name", raising=False)
    monkeypatch.setenv("USER_ID", "legacy-id")
    assert utils.get_current_user_id(request_without_header) == "legacy-id"

    monkeypatch.delenv("USER_ID", raising=False)
    assert utils.get_audit_actor(request_without_header, fallback="fallback-user") == "admin_root"
    monkeypatch.setattr(utils.settings, "DEFAULT_USER_ID", "")
    assert utils.get_audit_actor(request_without_header, fallback="fallback-user") == "fallback-user"


def test_filter_valid_columns_and_parse_iso_date():
    filtered = utils.filter_valid_columns(
        models.Device,
        {
            "name": "db-01",
            "system": "Payments",
            "not_a_column": "ignore-me",
            "owner": "ops",
        },
        exclude={"owner"},
    )
    assert filtered == {"name": "db-01", "system": "Payments"}

    parsed_zulu = utils.parse_iso_date("2025-06-01T12:34:56Z")
    assert parsed_zulu == datetime(2025, 6, 1, 12, 34, 56, tzinfo=timezone.utc)

    parsed_offset = utils.parse_iso_date("2025-06-01T12:34:56+00:00")
    assert parsed_offset == datetime(2025, 6, 1, 12, 34, 56, tzinfo=timezone.utc)

    assert utils.parse_iso_date("") is None
    assert utils.parse_iso_date("not-a-date") is None
    assert utils.parse_iso_date(types.SimpleNamespace()) is None
