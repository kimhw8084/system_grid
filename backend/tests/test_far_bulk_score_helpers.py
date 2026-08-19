import ast
from pathlib import Path
from types import SimpleNamespace

import pytest


SOURCE = Path(__file__).resolve().parents[1] / "app" / "api" / "far.py"
MODULE = ast.parse(SOURCE.read_text(encoding="utf-8"), filename=str(SOURCE))
FUNCTIONS = {
    node.name: node
    for node in MODULE.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}

HELPER_NAMES = {
    "normalize_far_bulk_score_request",
    "collect_far_bulk_score_preconditions",
    "apply_far_bulk_score_value",
}
HELPER_MODULE = ast.Module(
    body=[
        node
        for node in MODULE.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "FAR_BULK_SCORE_FIELDS"
            for target in node.targets
        )
        or isinstance(node, ast.FunctionDef) and node.name in HELPER_NAMES
    ],
    type_ignores=[],
)
namespace = {}
exec(compile(ast.fix_missing_locations(HELPER_MODULE), str(SOURCE), "exec"), namespace)

normalize_request = namespace["normalize_far_bulk_score_request"]
collect_preconditions = namespace["collect_far_bulk_score_preconditions"]
apply_value = namespace["apply_far_bulk_score_value"]


def test_bulk_score_request_normalizes_exact_version_lock():
    ids, field, value, versions = normalize_request({
        "ids": [7, 9],
        "field": "severity",
        "value": 8,
        "expected_versions": {"7": 3, 9: 4},
    })
    assert ids == [7, 9]
    assert field == "severity"
    assert value == 8
    assert versions == {7: 3, 9: 4}

    invalid = [
        {"ids": [], "field": "severity", "value": 8, "expected_versions": {}},
        {"ids": [7, 7], "field": "severity", "value": 8, "expected_versions": {"7": 3}},
        {"ids": [7], "field": "title", "value": 8, "expected_versions": {"7": 3}},
        {"ids": [7], "field": "severity", "value": 11, "expected_versions": {"7": 3}},
        {"ids": [7], "field": "severity", "value": 8, "expected_versions": {"8": 3}},
    ]
    for payload in invalid:
        with pytest.raises(ValueError):
            normalize_request(payload)


def test_bulk_score_preconditions_aggregate_before_mutation():
    modes = [
        SimpleNamespace(id=1, version=3, is_deleted=False),
        SimpleNamespace(id=2, version=4, is_deleted=True),
        SimpleNamespace(id=3, version=8, is_deleted=False),
    ]
    blockers = collect_preconditions([1, 2, 3, 4], modes, {1: 3, 2: 4, 3: 7, 4: 1})
    assert blockers == {
        "missing_ids": [4],
        "archived_ids": [2],
        "version_conflicts": [{"id": 3, "expected_version": 7, "actual_version": 8}],
    }


def test_bulk_score_apply_recomputes_rpn_and_increments_once():
    mode = SimpleNamespace(severity=4, occurrence=5, detection=6, rpn=120, version=9)
    assert apply_value(mode, "severity", 8) is True
    assert (mode.severity, mode.occurrence, mode.detection) == (8, 5, 6)
    assert mode.rpn == 240
    assert mode.version == 10

    assert apply_value(mode, "severity", 8) is False
    assert mode.rpn == 240
    assert mode.version == 10


def test_bulk_score_endpoint_is_locked_atomic_and_conflict_guarded():
    endpoint = FUNCTIONS["bulk_score_failure_modes"]
    source = ast.unparse(endpoint)

    decorators = [
        decorator
        for decorator in endpoint.decorator_list
        if isinstance(decorator, ast.Call)
    ]
    assert any(
        isinstance(decorator.func, ast.Attribute)
        and decorator.func.attr == "post"
        and decorator.args
        and isinstance(decorator.args[0], ast.Constant)
        and decorator.args[0].value == "/modes/bulk-score"
        for decorator in decorators
    )
    assert ".with_for_update()" in source
    assert "collect_far_bulk_score_preconditions" in source
    assert "apply_far_bulk_score_value" in source
    assert "HTTPException(409" in source
    assert "save_far_history" in source
    assert "await db.commit()" in source
