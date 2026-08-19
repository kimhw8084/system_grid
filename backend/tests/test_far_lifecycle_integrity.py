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
    "normalize_far_lifecycle_request",
    "collect_far_lifecycle_preconditions",
    "apply_far_lifecycle_state",
}
HELPER_MODULE = ast.Module(
    body=[
        node
        for node in MODULE.body
        if isinstance(node, ast.FunctionDef) and node.name in HELPER_NAMES
    ],
    type_ignores=[],
)
namespace = {}
exec(compile(ast.fix_missing_locations(HELPER_MODULE), str(SOURCE), "exec"), namespace)

normalize_request = namespace["normalize_far_lifecycle_request"]
collect_preconditions = namespace["collect_far_lifecycle_preconditions"]
apply_state = namespace["apply_far_lifecycle_state"]


def test_lifecycle_request_requires_exact_version_map():
    ids, versions = normalize_request({
        "ids": [7, 9],
        "expected_versions": {"7": 3, 9: 5},
    })
    assert ids == [7, 9]
    assert versions == {7: 3, 9: 5}

    invalid = [
        {"ids": [], "expected_versions": {}},
        {"ids": [7, 7], "expected_versions": {"7": 3}},
        {"ids": [7], "expected_versions": {}},
        {"ids": [7], "expected_versions": {"7": 0}},
        {"ids": [7], "expected_versions": {"8": 3}},
    ]
    for payload in invalid:
        with pytest.raises(ValueError):
            normalize_request(payload)


def test_lifecycle_preconditions_aggregate_before_any_mutation():
    modes = [
        SimpleNamespace(id=1, version=3, is_deleted=False),
        SimpleNamespace(id=2, version=5, is_deleted=True),
    ]
    assert collect_preconditions([1, 2, 3], modes, {1: 3, 2: 4, 3: 1}) == {
        "missing_ids": [3],
        "version_conflicts": [{"id": 2, "expected_version": 4, "actual_version": 5}],
    }


def test_lifecycle_apply_is_idempotent_and_increments_once():
    mode = SimpleNamespace(id=1, version=8, is_deleted=False)
    assert apply_state(mode, True) is True
    assert (mode.is_deleted, mode.version) == (True, 9)
    assert apply_state(mode, True) is False
    assert mode.version == 9
    assert apply_state(mode, False) is True
    assert (mode.is_deleted, mode.version) == (False, 10)


def test_single_lifecycle_endpoints_are_row_locked_and_version_bound():
    for name in ("archive_failure_mode", "restore_failure_mode"):
        source = ast.unparse(FUNCTIONS[name])
        assert "normalize_far_versioned_mutation_request" in source
        assert ".with_for_update()" in source
        assert "collect_far_lifecycle_preconditions" in source
        assert "HTTPException(409" in source
        assert "apply_far_lifecycle_state" in source
        assert "save_far_history" in source
        assert "await db.commit()" in source


def test_bulk_lifecycle_endpoints_fail_closed_before_mutation_and_lock_deterministically():
    for name in ("bulk_archive_failure_modes", "bulk_restore_failure_modes"):
        source = ast.unparse(FUNCTIONS[name])
        assert "normalize_far_lifecycle_request" in source
        assert ".order_by(models.FarFailureMode.id)" in source
        assert ".with_for_update()" in source
        assert "collect_far_lifecycle_preconditions" in source
        assert "far_lifecycle_precondition_failed" in source
        assert "apply_far_lifecycle_state" in source
        assert source.index("collect_far_lifecycle_preconditions") < source.index("apply_far_lifecycle_state")
        assert "versions" in source
        assert "await db.commit()" in source
