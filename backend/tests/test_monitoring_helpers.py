import pytest
from fastapi import HTTPException

from app.api import monitoring as monitoring_api


def test_monitoring_helper_normalization_and_history_summaries():
    assert monitoring_api.normalize_string("  Ops  ") == "Ops"
    assert monitoring_api.normalize_string("   ") is None
    assert monitoring_api.normalize_string_list(["Beta", " alpha ", None, "beta"]) == ["alpha", "Beta", "beta"]
    assert monitoring_api.split_owner_values("Ops,\nSec") == ["Ops", "Sec"]

    assert monitoring_api.normalize_recovery_docs([2, {"id": 1, "note": " restore ", "added_at": "2025-01-01"}]) == [
        {"id": 1, "note": "restore", "added_at": "2025-01-01"},
        {"id": 2, "note": None, "added_at": None},
    ]

    snapshot = monitoring_api.build_monitoring_snapshot_from_values(
        {
            "device_id": 5,
            "category": "Hardware",
            "status": "Existing",
            "title": "CPU Load",
            "platform": "Zabbix",
            "notification_recipients": [" ops@example.com ", "ops@example.com"],
            "monitored_services": [9, 4],
            "owner_team": "Ops, SRE",
            "recovery_docs": [{"id": 2, "note": "Runbook"}],
        },
        [{"operator_id": 7, "name": "Owner", "external_id": "op-7", "role": "Primary Support"}],
    )
    assert snapshot["notification_recipients"] == ["ops@example.com"]
    assert snapshot["monitored_services"] == [4, 9]
    assert snapshot["owner_team"] == "Ops, SRE"
    assert snapshot["owners"][0]["operator_id"] == 7

    delta = monitoring_api.build_monitoring_history_delta(
        {"title": "Old", "severity": "Warning"},
        {"title": "New", "severity": "Critical", "owners": [{"operator_id": 1}]},
    )
    assert {item["field"] for item in delta} == {"title", "severity", "owners"}

    assert monitoring_api.summarize_monitoring_snapshot_delta({}, snapshot, action_label="create") == "Created monitor"
    assert monitoring_api.summarize_monitoring_snapshot_delta(snapshot, {}, action_label="delete") == "Archived monitor"
    assert monitoring_api.summarize_monitoring_snapshot_delta(snapshot, snapshot, action_label="update") == "No semantic change"
    assert "Updated" in monitoring_api.summarize_monitoring_snapshot_delta(
        {"severity": "Warning"},
        {"severity": "Critical"},
        action_label="update",
    )

    assert monitoring_api.summarize_bulk_monitoring_action(action="update", changed_count=0, skipped_count=3) == "No semantic change"
    assert "fields: owners, severity" in monitoring_api.summarize_bulk_monitoring_action(
        action="update",
        changed_count=2,
        skipped_count=1,
        changed_fields={"severity", "owners"},
    )


def test_monitoring_url_validation_blocks_unsafe_and_invalid_values():
    assert monitoring_api.normalize_monitoring_url("https://example.com/path") == "https://example.com/path"
    assert monitoring_api.normalize_monitoring_url("   ") is None

    for bad_value, expected in [
        ("ftp://example.com", "http or https"),
        ("http://", "include a host"),
        ("https://example.com/<script>", "unsafe content"),
    ]:
        with pytest.raises(HTTPException) as exc:
            monitoring_api.normalize_monitoring_url(bad_value)
        assert exc.value.status_code == 400
        assert expected in exc.value.detail
