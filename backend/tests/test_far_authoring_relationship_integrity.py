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

PURE_HELPERS = {
    "normalize_far_reference_ids",
    "collect_far_missing_reference_ids",
}
helper_nodes = [
    node for node in MODULE.body
    if isinstance(node, ast.FunctionDef) and node.name in PURE_HELPERS
]
namespace = {}
exec(compile(ast.fix_missing_locations(ast.Module(body=helper_nodes, type_ignores=[])), str(SOURCE), "exec"), namespace)

normalize_ids = namespace["normalize_far_reference_ids"]
collect_missing = namespace["collect_far_missing_reference_ids"]


def test_reference_ids_are_positive_unique_and_explicit():
    assert normalize_ids([7, 9], "affected_assets") == [7, 9]
    for invalid in [None, "7", [0], [-1], [True], [7, 7]]:
        with pytest.raises(ValueError):
            normalize_ids(invalid, "affected_assets")

    source = ast.unparse(FUNCTIONS["normalize_far_authoring_relationships"])
    assert "FAR_AUTHORING_RELATIONSHIP_FIELDS" in source
    assert "normalize_far_reference_ids" in source
    assert "if field in data" in source


def test_missing_reference_collection_preserves_requested_order():
    rows = [SimpleNamespace(id=9), SimpleNamespace(id=7)]
    assert collect_missing([7, 8, 9, 10], rows) == [8, 10]


def test_create_validates_relationships_before_inserting_mode():
    source = ast.unparse(FUNCTIONS["create_failure_mode"])
    assert "normalize_far_authoring_relationships" in source
    assert "resolve_far_authoring_relationships" in source
    assert source.index("resolve_far_authoring_relationships") < source.index("models.FarFailureMode")
    assert "metadata_json=normalize_json_object" in source
    assert "affected_assets=resolved_relationships.get('affected_assets', [])" in source
    assert "causes=resolved_relationships.get('cause_ids', [])" in source


def test_update_relationships_are_reachable_validated_and_versioned():
    source = ast.unparse(FUNCTIONS["update_failure_mode"])
    assert "normalize_far_versioned_mutation_request" in source
    assert ".with_for_update()" in source
    assert "get_far_versioned_mutation_precondition" in source
    assert "normalize_far_authoring_relationships" in source
    assert "resolve_far_authoring_relationships" in source
    assert source.index("resolve_far_authoring_relationships") < source.index("for k, v in clean_data.items()")
    assert "mode.affected_assets = resolved_relationships['affected_assets']" in source
    assert "mode.causes = resolved_relationships['cause_ids']" in source
    assert "mutation_data.get('_change_summary')" in source
    assert "save_far_history" in source
    assert "await db.commit()" in source
    assert "if k == 'affected_assets'" not in source
    assert "if k == 'cause_ids'" not in source
