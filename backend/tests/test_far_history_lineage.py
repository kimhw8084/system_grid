import ast
from pathlib import Path
from types import SimpleNamespace

SOURCE = Path(__file__).resolve().parents[1] / "app" / "api" / "far.py"
MODULE = ast.parse(SOURCE.read_text(encoding="utf-8"), filename=str(SOURCE))
FUNCTIONS = {
    node.name: node
    for node in MODULE.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
ASSIGNMENTS = [
    node for node in MODULE.body
    if isinstance(node, ast.Assign)
    and any(getattr(target, "id", None) in {"FAR_HISTORY_RESTOREABLE_FIELDS", "FAR_HISTORY_FORENSIC_FIELDS"} for target in node.targets)
]
HELPER_NAMES = {
    "_far_history_id",
    "_far_history_date",
    "build_far_intervention_snapshot",
    "get_far_restoreable_snapshot",
    "far_restoreable_snapshot_differs",
}
HELPER_MODULE = ast.Module(
    body=ASSIGNMENTS + [node for node in MODULE.body if isinstance(node, ast.FunctionDef) and node.name in HELPER_NAMES],
    type_ignores=[],
)
namespace = {}
exec(compile(ast.fix_missing_locations(HELPER_MODULE), str(SOURCE), "exec"), namespace)
build_intervention = namespace["build_far_intervention_snapshot"]
restoreable = namespace["get_far_restoreable_snapshot"]
differs = namespace["far_restoreable_snapshot_differs"]


def test_intervention_snapshot_is_deterministic_and_domain_complete():
    resolution = SimpleNamespace(id=7, knowledge_id=11, preventive_follow_up="proof", responsible_team="SRE", guidance_notes="guide")
    cause = SimpleNamespace(id=3, cause_text="Power loss", occurrence_level=6, responsible_team="Facilities", resolutions=[resolution])
    mitigation = SimpleNamespace(id=9, cause_id=3, mitigation_type="Monitoring", mitigation_steps="watch", responsible_team="NOC", status="Completed", monitoring_item_id=22)
    prevention = SimpleNamespace(id=12, cause_id=3, prevention_action="dual feed", responsible_team="Facilities", status="Verified", target_date="2026-09-01")
    mode = SimpleNamespace(causes=[cause], mitigations=[mitigation], prevention_actions=[prevention], linked_rcas=[SimpleNamespace(id=15)])
    snapshot = build_intervention(mode)
    assert snapshot["cause_state"][0]["cause_text"] == "Power loss"
    assert snapshot["resolution_state"][0]["knowledge_id"] == 11
    assert snapshot["mitigation_state"][0]["monitoring_item_id"] == 22
    assert snapshot["prevention_state"][0]["status"] == "Verified"
    assert snapshot["linked_rca_ids"] == [15]


def test_restoreable_snapshot_excludes_intervention_and_lifecycle_state():
    snapshot = {
        "title": "Vector",
        "metadata_json": {"linked_research_ids": [4]},
        "mitigation_state": [{"id": 9}],
        "prevention_state": [{"id": 12}],
        "is_deleted": True,
    }
    assert restoreable(snapshot) == {
        "title": "Vector",
        "metadata_json": {"linked_research_ids": [4]},
    }


def test_restore_difference_is_backward_compatible_with_legacy_snapshots():
    target = {"title": "Old", "severity": 4}
    current = {"title": "New", "severity": 4, "metadata_json": {"new": True}}
    assert differs(target, current) is True
    assert differs({"title": "New"}, current) is False


def test_history_endpoint_exposes_core_and_forensic_scope():
    source = ast.unparse(FUNCTIONS["get_far_history"])
    for required in (
        "FAR_HISTORY_RESTOREABLE_FIELDS",
        "FAR_HISTORY_FORENSIC_FIELDS",
        "core_restore_available",
        "forensic_changed_fields",
        "restore_scope",
    ):
        assert required in source


def test_restore_is_core_only_fail_closed_and_relation_safe():
    source = ast.unparse(FUNCTIONS["restore_far_version"])
    for required in (
        "far_restoreable_snapshot_differs",
        "far_history_no_core_change",
        "get_far_restoreable_snapshot",
        "far_history_restore_missing_assets",
        "far_history_restore_missing_causes",
        "forensic_intervention_state_preserved",
    ):
        assert required in source
    assert "FAR_HISTORY_FORENSIC_FIELDS" not in source
    save_source = ast.unparse(FUNCTIONS["save_far_history"])
    for relation in ("FarFailureCause.resolutions", "FarFailureCause.mitigations", "FarFailureCause.prevention_actions", "FarFailureMode.linked_rcas"):
        assert relation in save_source
