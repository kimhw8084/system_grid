from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas import schemas
from app.services import far_service


def test_far_scoring_and_risk_boundaries_are_server_authoritative():
    assert far_service.calculate_rpn(1, 1, 1) == 1
    assert far_service.calculate_rpn(10, 10, 10) == 1000
    assert far_service.risk_band(99) == "Low"
    assert far_service.risk_band(100) == "Moderate"
    assert far_service.risk_band(199) == "Moderate"
    assert far_service.risk_band(200) == "High"
    assert far_service.risk_band(299) == "High"
    assert far_service.risk_band(300) == "Critical"
    with pytest.raises(HTTPException) as exc:
        far_service.calculate_rpn(0, 1, 1)
    assert exc.value.status_code == 422


def test_far_status_normalization_is_bounded_and_unknown_values_fail_closed():
    assert far_service.canonical_status("open") == "Analyzing"
    assert far_service.canonical_status("resolved") == "Resolution Identified"
    assert far_service.canonical_status("Eliminated") == "Eliminated"
    with pytest.raises(HTTPException) as exc:
        far_service.canonical_status("fictional-status")
    assert exc.value.detail["code"] == "FAR_UNKNOWN_STATUS"


def test_far_strict_schemas_reject_fictional_fields_and_inexact_versions():
    with pytest.raises(ValidationError):
        schemas.FarFailureModeCreate.model_validate({
            "system_name": "SYS",
            "title": "Mode",
            "severity": 5,
            "occurrence": 5,
            "detection": 5,
            "idempotency_key": "valid-key-123",
            "client_rpn": 999,
        })
    with pytest.raises(ValidationError):
        schemas.FarFailureModeCreate.model_validate({
            "system_name": "SYS",
            "title": "Mode",
            "severity": True,
            "occurrence": 5,
            "detection": 5,
            "idempotency_key": "valid-key-123",
        })
    with pytest.raises(ValidationError):
        schemas.FarRetirementPreviewRequest.model_validate({
            "ids": [1, 2],
            "expected_versions": {1: 1},
            "reason": "retire",
            "idempotency_key": "valid-key-123",
        })


def test_far_source_contains_no_hard_delete_implementation():
    source = Path(__file__).parent / "app" / "api" / "far.py"
    text = source.read_text()
    assert "FAR_LEGACY_DESTRUCTIVE_ROUTE_DISABLED" in text
    assert "retirement/preview" in text
    assert "nested/retirement/execute" in text
    assert text.count("@router.delete(") == 5
    assert text.count("return _legacy_mutation_response(") >= 5
    assert "await db.delete(" not in text
    assert "db.delete(" not in text
