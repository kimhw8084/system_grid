from pathlib import Path
from types import SimpleNamespace
import asyncio
import ast
import sys

import pytest
from fastapi import HTTPException
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
FAR_API = BACKEND / "app" / "api" / "far.py"
MIGRATION = BACKEND / "alembic" / "versions" / "e3f4a5b6c7d8_add_far_mitigation_provenance.py"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


def _far_module():
    from app.api import far
    return far


def test_far_mitigation_normalization_and_transition_contract():
    far = _far_module()

    normalized = far.normalize_far_mitigation_payload({
        "mitigation_type": "Process Change",
        "mitigation_steps": "  Require peer review  ",
        "responsible_team": "  SRE  ",
        "status": "Not Started",
        "cause_id": 7,
    })
    assert normalized == {
        "mitigation_type": "Process Change",
        "mitigation_steps": "Require peer review",
        "responsible_team": "SRE",
        "status": "Not Started",
        "cause_id": 7,
        "monitoring_item_id": None,
        "knowledge_bkm_id": None,
        "external_bkm_url": None,
    }

    for legacy_status in ("Planned", "Implemented"):
        with pytest.raises(ValueError, match="status must be Not Started, In Progress, or Completed"):
            far.normalize_far_mitigation_payload({
                "mitigation_type": "Process Change",
                "mitigation_steps": "Reject legacy runtime status",
                "status": legacy_status,
                "cause_id": 7,
            })

    with pytest.raises(ValueError, match="Monitoring reference is required"):
        far.normalize_far_mitigation_payload({
            "mitigation_type": "Monitoring",
            "mitigation_steps": "Watch latency",
            "status": "Not Started",
            "cause_id": 7,
        })

    with pytest.raises(ValueError, match="mutually exclusive"):
        far.normalize_far_mitigation_payload({
            "mitigation_type": "Workaround",
            "mitigation_steps": "Follow runbook",
            "status": "Not Started",
            "cause_id": 7,
            "knowledge_bkm_id": 4,
            "external_bkm_url": "https://example.com/runbook",
        })

    with pytest.raises(ValueError, match="embedded credentials"):
        far.normalize_far_mitigation_payload({
            "mitigation_type": "Workaround",
            "mitigation_steps": "Follow runbook",
            "status": "Not Started",
            "cause_id": 7,
            "external_bkm_url": "https://user:secret@example.com/runbook",
        })

    assert far.ensure_far_mitigation_transition("Not Started", "Not Started") is None
    assert far.ensure_far_mitigation_transition("Not Started", "In Progress") is None
    assert far.ensure_far_mitigation_transition("In Progress", "Completed") is None
    with pytest.raises(ValueError, match="one step"):
        far.ensure_far_mitigation_transition("Not Started", "Completed")
    with pytest.raises(ValueError, match="one step"):
        far.ensure_far_mitigation_transition("Completed", "In Progress")



class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _ReferenceDb:
    def __init__(self, *values):
        self.values = list(values)

    async def execute(self, _statement):
        assert self.values, "Unexpected reference query"
        return _ScalarResult(self.values.pop(0))


def _resolve_refs(far, payload, *values):
    return asyncio.run(far.resolve_far_mitigation_references(_ReferenceDb(*values), payload))


def test_far_mitigation_reference_guards_reject_stale_or_unusable_dependencies():
    far = _far_module()
    published_bkm = SimpleNamespace(is_deleted=False, category="BKM", status="Published")
    archived_bkm = SimpleNamespace(is_deleted=False, category="BKM", status="Archived")
    deleted_bkm = SimpleNamespace(is_deleted=True, category="BKM", status="Published")
    live_monitor = SimpleNamespace(is_deleted=False, status="Existing")
    planned_monitor = SimpleNamespace(is_deleted=False, status="Planned")
    cancelled_monitor = SimpleNamespace(is_deleted=False, status="Cancelled")
    deleted_monitor = SimpleNamespace(is_deleted=True, status="Existing")

    assert _resolve_refs(far, {"knowledge_bkm_id": 9}, published_bkm) is None
    for unusable in (archived_bkm, deleted_bkm, None):
        with pytest.raises(HTTPException) as exc:
            _resolve_refs(far, {"knowledge_bkm_id": 9}, unusable)
        assert exc.value.status_code == 409
        assert exc.value.detail["code"] == "far_mitigation_bkm_reference_unusable"

    assert _resolve_refs(far, {"monitoring_item_id": 4}, live_monitor) is None
    assert _resolve_refs(far, {"monitoring_item_id": 4}, planned_monitor) is None
    for unusable in (cancelled_monitor, deleted_monitor, None):
        with pytest.raises(HTTPException) as exc:
            _resolve_refs(far, {"monitoring_item_id": 4}, unusable)
        assert exc.value.status_code == 409
        assert exc.value.detail["code"] == "far_mitigation_monitor_reference_unusable"


def test_far_mitigation_edit_guards_type_cause_and_status_progression():
    far = _far_module()
    existing = SimpleNamespace(
        mitigation_type="Workaround",
        mitigation_steps="Existing steps",
        responsible_team="SRE",
        status="Not Started",
        cause_id=7,
        monitoring_item_id=None,
        knowledge_bkm_id=11,
        external_bkm_url=None,
    )
    base = {
        "mitigation_type": "Workaround",
        "mitigation_steps": "Updated steps",
        "responsible_team": "Operations",
        "status": "In Progress",
        "cause_id": 7,
        "knowledge_bkm_id": 11,
    }
    normalized = far.normalize_far_mitigation_payload(base, existing=existing)
    assert normalized["status"] == "In Progress"
    assert normalized["cause_id"] == 7
    assert normalized["knowledge_bkm_id"] == 11

    with pytest.raises(ValueError, match="type is immutable"):
        far.normalize_far_mitigation_payload({**base, "mitigation_type": "Process Change"}, existing=existing)
    with pytest.raises(ValueError, match="cause cannot be changed"):
        far.normalize_far_mitigation_payload({**base, "cause_id": 8}, existing=existing)
    with pytest.raises(ValueError, match="one step"):
        far.normalize_far_mitigation_payload({**base, "status": "Completed"}, existing=existing)


def test_far_mitigation_router_wires_reference_guards_and_semantic_history():
    source = FAR_API.read_text()
    tree = ast.parse(source)
    assert any(isinstance(node, ast.AsyncFunctionDef) and node.name == "update_mitigation" for node in ast.walk(tree))
    assert "resolve_far_mitigation_references" in source
    assert "knowledge_bkm_id" in source
    assert "external_bkm_url" in source
    assert "far_mitigation_completed_read_only" in source
    assert "FAR_MITIGATION_STATUS_ALIASES" not in source
    assert '"Planned": "Not Started"' not in source
    assert '"Implemented": "Completed"' not in source
    assert "if not changes:" in source
    assert "Mitigation updated:" in source
    assert '"knowledge_bkm_id": getattr(mitigation, "knowledge_bkm_id", None)' in source
    assert '"external_bkm_url": getattr(mitigation, "external_bkm_url", None)' in source


def test_far_mitigation_migration_canonicalizes_legacy_status_rows_and_preserves_data(tmp_path, monkeypatch):
    database_path = tmp_path / "far-mitigation-migration.db"
    database_url = f"sqlite:///{database_path}"
    monkeypatch.setenv("SQLALCHEMY_DATABASE_URL", database_url)

    config = Config(str(BACKEND / "alembic.ini"))
    command.upgrade(config, "d2e3f4a5b6c7")

    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO far_mitigations "
            "(mitigation_type, mitigation_steps, responsible_team, status) VALUES "
            "('Process Change', 'Legacy planned', 'SRE', 'Planned'), "
            "('Workaround', 'Legacy implemented', 'Ops', 'Implemented'), "
            "('Monitoring', 'Canonical progress', 'NOC', 'In Progress')"
        ))

    command.upgrade(config, "e3f4a5b6c7d8")
    columns = {column["name"] for column in inspect(engine).get_columns("far_mitigations")}
    assert {"knowledge_bkm_id", "external_bkm_url"}.issubset(columns)
    with engine.connect() as connection:
        rows = connection.execute(text(
            "SELECT mitigation_steps, responsible_team, status, knowledge_bkm_id, external_bkm_url "
            "FROM far_mitigations ORDER BY id"
        )).all()
    assert [tuple(row) for row in rows] == [
        ("Legacy planned", "SRE", "Not Started", None, None),
        ("Legacy implemented", "Ops", "Completed", None, None),
        ("Canonical progress", "NOC", "In Progress", None, None),
    ]

    engine.dispose()
    command.downgrade(config, "d2e3f4a5b6c7")
    engine = create_engine(database_url)
    columns = {column["name"] for column in inspect(engine).get_columns("far_mitigations")}
    assert "knowledge_bkm_id" not in columns
    assert "external_bkm_url" not in columns
    with engine.connect() as connection:
        statuses = connection.execute(text("SELECT status FROM far_mitigations ORDER BY id")).scalars().all()
    assert statuses == ["Not Started", "Completed", "In Progress"]
    engine.dispose()

def test_far_mitigation_migration_source_is_selected_lineage_and_sqlite_safe():
    source = MIGRATION.read_text()
    tree = ast.parse(source)
    assert 'revision = "e3f4a5b6c7d8"' in source
    assert 'down_revision = "d2e3f4a5b6c7"' in source
    assert 'op.batch_alter_table("far_mitigations")' in source
    assert 'ondelete="SET NULL"' in source
    compile(tree, str(MIGRATION), "exec")
