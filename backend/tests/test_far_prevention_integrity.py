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
HELPER_NAMES = {
    "normalize_far_versioned_mutation_request",
    "normalize_far_context_mutation_request",
    "normalize_far_prevention_project_request",
    "get_far_prevention_status_from_project",
}
HELPER_MODULE = ast.Module(
    body=[node for node in MODULE.body if isinstance(node, ast.FunctionDef) and node.name in HELPER_NAMES],
    type_ignores=[],
)
namespace = {}
exec(compile(ast.fix_missing_locations(HELPER_MODULE), str(SOURCE), "exec"), namespace)
normalize_request = namespace["normalize_far_prevention_project_request"]
project_status = namespace["get_far_prevention_status_from_project"]


def test_prevention_project_request_is_parent_version_and_cause_bound():
    mode_id, version, cause_id, project, payload = normalize_request({
        "mode_id": 4,
        "expected_version": 9,
        "cause_id": 12,
        "project": {"name": "Proof out redundant PSU"},
    })
    assert (mode_id, version, cause_id) == (4, 9, 12)
    assert project == {"name": "Proof out redundant PSU"}
    assert payload == {}
    for invalid in [
        {"mode_id": 4, "expected_version": 9, "project": {}},
        {"mode_id": 4, "expected_version": 9, "cause_id": 0, "project": {}},
        {"mode_id": 4, "expected_version": 9, "cause_id": 12, "project": []},
    ]:
        with pytest.raises(ValueError):
            normalize_request(invalid)


def test_project_status_maps_to_far_prevention_lifecycle():
    assert project_status("Planning") == "Open"
    assert project_status("In Progress") == "In Progress"
    assert project_status("Active") == "In Progress"
    assert project_status("Completed") == "Completed"


def test_prevention_create_is_atomic_project_plus_far_record_under_parent_lock():
    source = ast.unparse(FUNCTIONS["create_prevention"])
    for required in (
        "normalize_far_prevention_project_request",
        "lock_far_context_mode",
        "schemas.ProjectCreate.model_validate",
        "models.Project",
        "models.ProjectTask",
        "models.FarPrevention",
        "far_prevention_id",
        "advance_far_context_mode",
        "await db.commit()",
    ):
        assert required in source
    assert source.index("models.Project(") < source.index("models.FarPrevention(") < source.index("await db.commit()")


def test_prevention_update_is_version_bound_and_historicized():
    source = ast.unparse(FUNCTIONS["update_prevention"])
    assert "normalize_far_context_mutation_request" in source
    assert "lock_far_context_mode" in source
    assert "FAR_PREVENTION_STATUSES" in source
    assert "advance_far_context_mode" in source
    assert "Prevention record not found" in source


def test_prevention_cause_scope_requires_current_far_link():
    source = ast.unparse(FUNCTIONS["create_prevention"])
    assert "get_far_cause_parent_ids" in source
    assert "ensure_far_cause_linked_to_mode" in source
