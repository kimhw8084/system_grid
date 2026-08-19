import ast
from pathlib import Path

import pytest


SOURCE = Path(__file__).resolve().parents[1] / "app" / "api" / "far.py"
MODULE = ast.parse(SOURCE.read_text(encoding="utf-8"), filename=str(SOURCE))
FUNCTIONS = {
    node.name: node
    for node in MODULE.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}

HELPER_NAMES = {"normalize_far_versioned_mutation_request", "normalize_far_context_mutation_request"}
HELPER_MODULE = ast.Module(
    body=[node for node in MODULE.body if isinstance(node, ast.FunctionDef) and node.name in HELPER_NAMES],
    type_ignores=[],
)
namespace = {}
exec(compile(ast.fix_missing_locations(HELPER_MODULE), str(SOURCE), "exec"), namespace)
normalize_context = namespace["normalize_far_context_mutation_request"]


def test_context_request_requires_parent_id_and_positive_version():
    mode_id, version, payload = normalize_context({
        "mode_id": 42,
        "expected_version": 7,
        "cause_text": "Power loss",
    })
    assert (mode_id, version) == (42, 7)
    assert payload == {"cause_text": "Power loss"}
    for invalid in [
        {"expected_version": 7},
        {"mode_id": 0, "expected_version": 7},
        {"mode_id": 42, "expected_version": 0},
    ]:
        with pytest.raises(ValueError):
            normalize_context(invalid)


def test_missing_ui_endpoints_now_exist():
    update_source = ast.unparse(FUNCTIONS["update_cause"])
    delete_resolution_source = ast.unparse(FUNCTIONS["delete_resolution"])
    assert "Root cause updated" in update_source
    assert "Resolution linkage not found" in delete_resolution_source


def test_every_causal_intervention_mutation_is_parent_locked_version_bound_and_historicized():
    names = (
        "create_cause",
        "update_cause",
        "delete_cause",
        "create_resolution",
        "delete_resolution",
        "create_mitigation",
        "delete_mitigation",
    )
    for name in names:
        source = ast.unparse(FUNCTIONS[name])
        assert "normalize_far_context_mutation_request" in source
        assert "lock_far_context_mode" in source
        assert "advance_far_context_mode" in source
        assert "await db.commit()" in source


def test_shared_cause_global_mutations_fail_closed_while_unlink_is_context_scoped():
    assert "ensure_far_exclusive_cause_context" in ast.unparse(FUNCTIONS["update_cause"])
    assert "ensure_far_exclusive_cause_context" in ast.unparse(FUNCTIONS["create_resolution"])
    assert "ensure_far_exclusive_cause_context" in ast.unparse(FUNCTIONS["delete_resolution"])
    assert "ensure_far_exclusive_cause_context" in ast.unparse(FUNCTIONS["create_mitigation"])
    delete_source = ast.unparse(FUNCTIONS["delete_cause"])
    assert "delete(models.far_mode_causes)" in delete_source
    assert "deleted = len(parent_ids) == 1" in delete_source


def test_resolution_delete_unlinks_selected_cause_before_orphan_cleanup():
    source = ast.unparse(FUNCTIONS["delete_resolution"])
    assert "delete(models.far_cause_resolutions)" in source
    assert "orphaned = not list(remaining_result.scalars().all())" in source
    assert source.index("delete(models.far_cause_resolutions)") < source.index("await db.delete(resolution)")
