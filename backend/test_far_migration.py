from __future__ import annotations

import ast
from pathlib import Path


MIGRATION = Path(__file__).parent / "alembic" / "versions" / "e3f4a5b6c7d8_harden_far_integrity_and_recovery.py"


def test_far_migration_is_parseable_reversible_and_fail_closed():
    source = MIGRATION.read_text()
    ast.parse(source)
    assert 'revision: str = "e3f4a5b6c7d8"' in source
    assert 'down_revision: Union[str, Sequence[str], None] = "d2e3f4a5b6c7"' in source
    assert "def upgrade()" in source
    assert "def downgrade()" in source
    assert "FAR_MIGRATION_BLOCKED_REQUIRED_FIELDS" in source
    assert "FAR_MIGRATION_BLOCKED_SCORE_RANGE" in source
    assert "FAR_MIGRATION_BLOCKED_UNKNOWN_STATUS" in source
    assert "far_entity_history" in source
    assert "far_operation_receipts" in source
    assert 'ondelete="RESTRICT"' in source
    assert "DROP TABLE" not in source.upper().split("def downgrade()", 1)[0]


def test_far_migration_contains_no_single_tenant_or_manual_repair_assumption():
    source = MIGRATION.read_text().lower()
    assert "tenant_id =" not in source
    assert "/users/" not in source
    assert "sqlite:///" not in source
    assert "manual" not in source
