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
    "normalize_far_versioned_mutation_request",
    "get_far_versioned_mutation_precondition",
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

normalize_request = namespace["normalize_far_versioned_mutation_request"]
get_precondition = namespace["get_far_versioned_mutation_precondition"]


def test_versioned_mutation_request_requires_exact_positive_lease():
    version, payload = normalize_request({
        "expected_version": 7,
        "title": "Timeout",
        "severity": 8,
    })
    assert version == 7
    assert payload == {"title": "Timeout", "severity": 8}

    for invalid in [None, {}, {"expected_version": 0}, {"expected_version": True}, {"expected_version": "7"}]:
        with pytest.raises(ValueError):
            normalize_request(invalid)


def test_mutation_precondition_rejects_archive_and_stale_version_before_mutation():
    archived = SimpleNamespace(id=4, version=9, is_deleted=True)
    assert get_precondition(archived, 9) == {
        "code": "far_mode_archived_read_only",
        "id": 4,
        "actual_version": 9,
    }

    stale = SimpleNamespace(id=4, version=10, is_deleted=False)
    assert get_precondition(stale, 9) == {
        "code": "far_mode_version_conflict",
        "id": 4,
        "expected_version": 9,
        "actual_version": 10,
    }
    assert get_precondition(stale, 10) is None


def test_single_record_update_is_locked_version_bound_and_history_preserving():
    endpoint = FUNCTIONS["update_failure_mode"]
    source = ast.unparse(endpoint)
    assert "normalize_far_versioned_mutation_request" in source
    assert ".with_for_update()" in source
    assert "get_far_versioned_mutation_precondition" in source
    assert "HTTPException(409" in source
    assert "filter_valid_columns" in source
    assert "save_far_history" in source
    assert "await db.commit()" in source


def test_content_restore_is_locked_version_bound_and_archive_guarded():
    endpoint = FUNCTIONS["restore_far_version"]
    source = ast.unparse(endpoint)
    assert "normalize_far_versioned_mutation_request" in source
    assert ".with_for_update()" in source
    assert "get_far_versioned_mutation_precondition" in source
    assert "HTTPException(409" in source
    assert "k == 'is_deleted'" in source
    assert "save_far_history" in source
    assert "await db.commit()" in source
