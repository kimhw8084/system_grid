"""harden FAR integrity, lifecycle, history, and operation receipts

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-08-03

This migration is intentionally fail-closed. It refuses to guess at malformed legacy
FAR rows, unknown lifecycle values, or unnamed destructive foreign keys.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None

CANONICAL_STATUSES = (
    "Analyzing",
    "Cause Identified",
    "Resolution Identified",
    "Mitigated",
    "Eliminated",
)
LEGACY_STATUS_SQL = """
CASE lower(trim(status))
  WHEN 'open' THEN 'Analyzing'
  WHEN 'analysis' THEN 'Analyzing'
  WHEN 'analyzing' THEN 'Analyzing'
  WHEN 'cause identified' THEN 'Cause Identified'
  WHEN 'root cause identified' THEN 'Cause Identified'
  WHEN 'resolution identified' THEN 'Resolution Identified'
  WHEN 'resolved' THEN 'Resolution Identified'
  WHEN 'mitigated' THEN 'Mitigated'
  WHEN 'prevented' THEN 'Eliminated'
  WHEN 'eliminated' THEN 'Eliminated'
  WHEN 'closed' THEN 'Eliminated'
  ELSE status
END
"""


def _inspector():
    return sa.inspect(op.get_bind())


def _table_exists(table: str) -> bool:
    return table in _inspector().get_table_names()


def _columns(table: str) -> set[str]:
    if not _table_exists(table):
        return set()
    return {item["name"] for item in _inspector().get_columns(table)}


def _add_column(table: str, column: sa.Column) -> None:
    if column.name not in _columns(table):
        with op.batch_alter_table(table) as batch:
            batch.add_column(column)


def _scalar(sql: str):
    return op.get_bind().execute(sa.text(sql)).scalar()


def _assert_clean_legacy_data() -> None:
    if not _table_exists("far_failure_modes"):
        return
    required = _scalar(
        "SELECT COUNT(*) FROM far_failure_modes "
        "WHERE system_name IS NULL OR trim(system_name) = '' "
        "OR failure_type IS NULL OR trim(failure_type) = '' "
        "OR title IS NULL OR trim(title) = ''"
    )
    if required:
        raise RuntimeError(f"FAR_MIGRATION_BLOCKED_REQUIRED_FIELDS:{required}")

    score_errors = _scalar(
        "SELECT COUNT(*) FROM far_failure_modes "
        "WHERE severity NOT BETWEEN 1 AND 10 OR occurrence NOT BETWEEN 1 AND 10 OR detection NOT BETWEEN 1 AND 10"
    )
    if score_errors:
        raise RuntimeError(f"FAR_MIGRATION_BLOCKED_SCORE_RANGE:{score_errors}")

    known = ",".join(f"'{item.lower()}'" for item in (
        *CANONICAL_STATUSES,
        "open", "analysis", "root cause identified", "resolved", "prevented", "closed",
    ))
    unknown = _scalar(
        f"SELECT COUNT(*) FROM far_failure_modes WHERE status IS NULL OR lower(trim(status)) NOT IN ({known})"
    )
    if unknown:
        raise RuntimeError(f"FAR_MIGRATION_BLOCKED_UNKNOWN_STATUS:{unknown}")

    if _table_exists("far_failure_causes"):
        invalid_causes = _scalar(
            "SELECT COUNT(*) FROM far_failure_causes "
            "WHERE occurrence_level IS NULL OR occurrence_level NOT BETWEEN 1 AND 10 OR cause_text IS NULL OR trim(cause_text) = ''"
        )
        if invalid_causes:
            raise RuntimeError(f"FAR_MIGRATION_BLOCKED_CAUSE_DATA:{invalid_causes}")

    if _table_exists("far_mitigations"):
        invalid_mitigations = _scalar(
            "SELECT COUNT(*) FROM far_mitigations "
            "WHERE mitigation_type IS NULL OR trim(mitigation_type) = '' "
            "OR status IS NULL OR trim(status) = ''"
        )
        if invalid_mitigations:
            raise RuntimeError(f"FAR_MIGRATION_BLOCKED_MITIGATION_DATA:{invalid_mitigations}")

    if _table_exists("far_prevention"):
        invalid_prevention = _scalar(
            "SELECT COUNT(*) FROM far_prevention "
            "WHERE failure_mode_id IS NULL OR prevention_action IS NULL OR trim(prevention_action) = '' "
            "OR status IS NULL OR trim(status) = ''"
        )
        if invalid_prevention:
            raise RuntimeError(f"FAR_MIGRATION_BLOCKED_PREVENTION_DATA:{invalid_prevention}")


def _replace_fk_ondelete(table: str, column: str, referred_table: str, ondelete: str) -> None:
    if not _table_exists(table):
        return
    match = None
    for fk in _inspector().get_foreign_keys(table):
        if fk.get("constrained_columns") == [column] and fk.get("referred_table") == referred_table:
            match = fk
            break
    if match is None:
        raise RuntimeError(f"FAR_MIGRATION_BLOCKED_MISSING_FK:{table}.{column}")
    name = match.get("name")
    if not name:
        raise RuntimeError(f"FAR_MIGRATION_BLOCKED_UNNAMED_FK:{table}.{column}")
    current = str((match.get("options") or {}).get("ondelete") or "").upper()
    if current == ondelete.upper():
        return
    new_name = f"fk_{table}_{column}_{referred_table}"
    with op.batch_alter_table(table) as batch:
        batch.drop_constraint(name, type_="foreignkey")
        batch.create_foreign_key(new_name, referred_table, [column], ["id"], ondelete=ondelete)




def _drop_constraint_if_exists(table: str, name: str, constraint_type: str = "check") -> None:
    if not _table_exists(table):
        return
    inspector = _inspector()
    candidates = inspector.get_check_constraints(table) if constraint_type == "check" else inspector.get_unique_constraints(table)
    if not any(item.get("name") == name for item in candidates):
        return
    with op.batch_alter_table(table) as batch:
        batch.drop_constraint(name, type_=constraint_type)


def _drop_index_if_exists(table: str, name: str) -> None:
    if not _table_exists(table):
        return
    if not any(item.get("name") == name for item in _inspector().get_indexes(table)):
        return
    with op.batch_alter_table(table) as batch:
        batch.drop_index(name)

def upgrade() -> None:
    _assert_clean_legacy_data()

    if _table_exists("far_failure_modes"):
        op.execute(f"UPDATE far_failure_modes SET status = {LEGACY_STATUS_SQL}")
        _add_column("far_failure_modes", sa.Column("owner_user_id", sa.String(length=200), nullable=True))
        _add_column("far_failure_modes", sa.Column("owner_team", sa.String(length=200), nullable=True))
        _add_column("far_failure_modes", sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))
        _add_column("far_failure_modes", sa.Column("is_retired", sa.Boolean(), nullable=False, server_default=sa.false()))
        _add_column("far_failure_modes", sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True))
        _add_column("far_failure_modes", sa.Column("retired_by_user_id", sa.String(length=200), nullable=True))
        _add_column("far_failure_modes", sa.Column("retired_reason", sa.Text(), nullable=True))
        _add_column("far_failure_modes", sa.Column("metadata_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))
        if "version" not in _columns("far_failure_modes"):
            _add_column("far_failure_modes", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
        op.execute("UPDATE far_failure_modes SET version = 1 WHERE version IS NULL OR version < 1")
        op.execute("UPDATE far_failure_modes SET is_deleted = 0 WHERE is_deleted IS NULL")
        op.execute("UPDATE far_failure_modes SET has_incident_history = 0 WHERE has_incident_history IS NULL")
        op.execute("UPDATE far_failure_modes SET metadata_json = '{}' WHERE metadata_json IS NULL")
        op.execute("UPDATE far_failure_modes SET rpn = severity * occurrence * detection")
        if "is_deleted" in _columns("far_failure_modes"):
            op.execute(
                "UPDATE far_failure_modes SET is_retired = 1, retired_at = COALESCE(retired_at, updated_at), "
                "retired_reason = COALESCE(retired_reason, 'Migrated from legacy deletion state') WHERE is_deleted = 1"
            )
        with op.batch_alter_table("far_failure_modes") as batch:
            batch.alter_column("system_name", existing_type=sa.String(), nullable=False)
            batch.alter_column("failure_type", existing_type=sa.String(), nullable=False, server_default="Design")
            batch.alter_column("title", existing_type=sa.String(), nullable=False)
            batch.alter_column("severity", existing_type=sa.Integer(), nullable=False, server_default="1")
            batch.alter_column("occurrence", existing_type=sa.Integer(), nullable=False, server_default="1")
            batch.alter_column("detection", existing_type=sa.Integer(), nullable=False, server_default="1")
            batch.alter_column("rpn", existing_type=sa.Integer(), nullable=False, server_default="1")
            batch.alter_column("status", existing_type=sa.String(), nullable=False, server_default="Analyzing")
            batch.alter_column("has_incident_history", existing_type=sa.Boolean(), nullable=False, server_default=sa.false())
            batch.alter_column("version", existing_type=sa.Integer(), nullable=False, server_default="1")
            batch.alter_column("is_deleted", existing_type=sa.Boolean(), nullable=False, server_default=sa.false())
            batch.alter_column("metadata_json", existing_type=sa.JSON(), nullable=False, server_default=sa.text("'{}'"))
            batch.create_check_constraint("far_mode_severity_1_10", "severity BETWEEN 1 AND 10")
            batch.create_check_constraint("far_mode_occurrence_1_10", "occurrence BETWEEN 1 AND 10")
            batch.create_check_constraint("far_mode_detection_1_10", "detection BETWEEN 1 AND 10")
            batch.create_check_constraint("far_mode_rpn_1_1000", "rpn BETWEEN 1 AND 1000")
            batch.create_check_constraint("far_mode_version_positive", "version >= 1")
            batch.create_index("ix_far_failure_modes_active_system", ["is_retired", "system_name"], unique=False)

    for table in ("far_failure_causes", "far_resolutions", "far_mitigations", "far_prevention"):
        if not _table_exists(table):
            continue
        _add_column(table, sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
        _add_column(table, sa.Column("is_retired", sa.Boolean(), nullable=False, server_default=sa.false()))
        _add_column(table, sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True))
        _add_column(table, sa.Column("retired_by_user_id", sa.String(length=200), nullable=True))
        _add_column(table, sa.Column("retired_reason", sa.Text(), nullable=True))
        op.execute(f"UPDATE {table} SET version = 1 WHERE version IS NULL OR version < 1")
        with op.batch_alter_table(table) as batch:
            batch.alter_column("version", existing_type=sa.Integer(), nullable=False, server_default="1")
            batch.create_check_constraint(f"{table}_version_positive", "version >= 1")
            batch.create_index(f"ix_{table}_is_retired", ["is_retired"], unique=False)

    if _table_exists("far_failure_causes"):
        with op.batch_alter_table("far_failure_causes") as batch:
            batch.alter_column("cause_text", existing_type=sa.Text(), nullable=False)
            batch.alter_column("occurrence_level", existing_type=sa.Integer(), nullable=False, server_default="1")
            batch.create_check_constraint("far_cause_occurrence_1_10", "occurrence_level BETWEEN 1 AND 10")

    if _table_exists("far_mitigations"):
        with op.batch_alter_table("far_mitigations") as batch:
            batch.alter_column("mitigation_type", existing_type=sa.String(), nullable=False)
            batch.alter_column("status", existing_type=sa.String(), nullable=False, server_default="Not Started")

    if _table_exists("far_prevention"):
        with op.batch_alter_table("far_prevention") as batch:
            batch.alter_column("failure_mode_id", existing_type=sa.Integer(), nullable=False)
            batch.alter_column("prevention_action", existing_type=sa.Text(), nullable=False)
            batch.alter_column("status", existing_type=sa.String(), nullable=False, server_default="Open")

    if _table_exists("far_prevention") and _table_exists("projects") and "project_id" not in _columns("far_prevention"):
        with op.batch_alter_table("far_prevention") as batch:
            batch.add_column(sa.Column("project_id", sa.Integer(), nullable=True))
            batch.create_foreign_key("fk_far_prevention_project_id_projects", "projects", ["project_id"], ["id"], ondelete="RESTRICT")

    _replace_fk_ondelete("far_mitigations", "cause_id", "far_failure_causes", "RESTRICT")
    _replace_fk_ondelete("far_prevention", "failure_mode_id", "far_failure_modes", "RESTRICT")
    _replace_fk_ondelete("far_prevention", "cause_id", "far_failure_causes", "RESTRICT")

    if not _table_exists("far_entity_history"):
        op.create_table(
            "far_entity_history",
            sa.Column("entity_type", sa.String(length=40), nullable=False),
            sa.Column("entity_id", sa.Integer(), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("snapshot", sa.JSON(), nullable=False),
            sa.Column("relationship_snapshot", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("actor_user_id", sa.String(length=200), nullable=False),
            sa.Column("snapshot_hash", sa.String(length=64), nullable=False),
            sa.Column("change_summary", sa.Text(), nullable=False),
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("created_by_user_id", sa.String(), nullable=True),
            sa.CheckConstraint("version >= 1", name="far_entity_history_version_positive"),
            sa.UniqueConstraint("entity_type", "entity_id", "version", name="uq_far_entity_history_version"),
        )
        op.create_index("ix_far_entity_history_lookup", "far_entity_history", ["entity_type", "entity_id", "version"])

    if not _table_exists("far_operation_receipts"):
        op.create_table(
            "far_operation_receipts",
            sa.Column("actor_user_id", sa.String(length=200), nullable=False),
            sa.Column("tenant_identity", sa.String(length=80), nullable=False),
            sa.Column("operation_type", sa.String(length=80), nullable=False),
            sa.Column("idempotency_key", sa.String(length=200), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("payload_hash", sa.String(length=64), nullable=False),
            sa.Column("preview_hash", sa.String(length=64), nullable=False),
            sa.Column("target_versions", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("state", sa.String(length=20), nullable=False, server_default="previewed"),
            sa.Column("result_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("audit_correlation_id", sa.String(length=80), nullable=False),
            sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("created_by_user_id", sa.String(), nullable=True),
            sa.CheckConstraint("state IN ('previewed', 'executed', 'expired', 'failed')", name="far_operation_receipt_state"),
            sa.UniqueConstraint("actor_user_id", "idempotency_key", name="uq_far_operation_actor_idempotency"),
            sa.UniqueConstraint("token_hash", name="uq_far_operation_receipt_token_hash"),
        )
        op.create_index("ix_far_operation_receipt_token", "far_operation_receipts", ["token_hash"])
        op.create_index("ix_far_operation_receipts_actor_user_id", "far_operation_receipts", ["actor_user_id"])
        op.create_index("ix_far_operation_receipts_tenant_identity", "far_operation_receipts", ["tenant_identity"])
        op.create_index("ix_far_operation_receipts_operation_type", "far_operation_receipts", ["operation_type"])
        op.create_index("ix_far_operation_receipts_audit_correlation_id", "far_operation_receipts", ["audit_correlation_id"])


def downgrade() -> None:
    if _table_exists("far_operation_receipts"):
        op.drop_table("far_operation_receipts")
    if _table_exists("far_entity_history"):
        op.drop_table("far_entity_history")

    # Restore historical cascade semantics only for rollback authority.
    if _table_exists("far_prevention") and "project_id" in _columns("far_prevention"):
        fk_name = None
        for fk in _inspector().get_foreign_keys("far_prevention"):
            if fk.get("constrained_columns") == ["project_id"]:
                fk_name = fk.get("name")
                break
        if not fk_name:
            raise RuntimeError("FAR_DOWNGRADE_BLOCKED_UNNAMED_FK:far_prevention.project_id")
        with op.batch_alter_table("far_prevention") as batch:
            batch.drop_constraint(fk_name, type_="foreignkey")
            batch.drop_column("project_id")

    _replace_fk_ondelete("far_mitigations", "cause_id", "far_failure_causes", "CASCADE")
    _replace_fk_ondelete("far_prevention", "failure_mode_id", "far_failure_modes", "CASCADE")
    _replace_fk_ondelete("far_prevention", "cause_id", "far_failure_causes", "CASCADE")

    for table in ("far_failure_causes", "far_resolutions", "far_mitigations", "far_prevention"):
        if not _table_exists(table):
            continue
        _drop_index_if_exists(table, f"ix_{table}_is_retired")
        _drop_constraint_if_exists(table, f"{table}_version_positive")
        if table == "far_failure_causes":
            _drop_constraint_if_exists(table, "far_cause_occurrence_1_10")
        cols = _columns(table)
        with op.batch_alter_table(table) as batch:
            if table == "far_failure_causes":
                batch.alter_column("cause_text", existing_type=sa.Text(), nullable=True)
                batch.alter_column("occurrence_level", existing_type=sa.Integer(), nullable=True, server_default=None)
            elif table == "far_mitigations":
                batch.alter_column("mitigation_type", existing_type=sa.String(), nullable=True)
                batch.alter_column("status", existing_type=sa.String(), nullable=True, server_default=None)
            elif table == "far_prevention":
                batch.alter_column("failure_mode_id", existing_type=sa.Integer(), nullable=True)
                batch.alter_column("prevention_action", existing_type=sa.Text(), nullable=True)
                batch.alter_column("status", existing_type=sa.String(), nullable=True, server_default=None)
            if "retired_reason" in cols:
                batch.drop_column("retired_reason")
            if "retired_by_user_id" in cols:
                batch.drop_column("retired_by_user_id")
            if "retired_at" in cols:
                batch.drop_column("retired_at")
            if "is_retired" in cols:
                batch.drop_column("is_retired")
            if "version" in cols:
                batch.drop_column("version")

    if _table_exists("far_failure_modes"):
        _drop_index_if_exists("far_failure_modes", "ix_far_failure_modes_active_system")
        for constraint in (
            "far_mode_severity_1_10",
            "far_mode_occurrence_1_10",
            "far_mode_detection_1_10",
            "far_mode_rpn_1_1000",
            "far_mode_version_positive",
        ):
            _drop_constraint_if_exists("far_failure_modes", constraint)
        cols = _columns("far_failure_modes")
        with op.batch_alter_table("far_failure_modes") as batch:
            batch.alter_column("system_name", existing_type=sa.String(), nullable=True)
            batch.alter_column("failure_type", existing_type=sa.String(), nullable=True, server_default=None)
            batch.alter_column("title", existing_type=sa.String(), nullable=True)
            batch.alter_column("severity", existing_type=sa.Integer(), nullable=True, server_default=None)
            batch.alter_column("occurrence", existing_type=sa.Integer(), nullable=True, server_default=None)
            batch.alter_column("detection", existing_type=sa.Integer(), nullable=True, server_default=None)
            batch.alter_column("rpn", existing_type=sa.Integer(), nullable=True, server_default=None)
            batch.alter_column("status", existing_type=sa.String(), nullable=True, server_default=None)
            batch.alter_column("has_incident_history", existing_type=sa.Boolean(), nullable=True, server_default=None)
            batch.alter_column("version", existing_type=sa.Integer(), nullable=True, server_default=None)
            batch.alter_column("is_deleted", existing_type=sa.Boolean(), nullable=True, server_default=None)
            batch.alter_column("metadata_json", existing_type=sa.JSON(), nullable=True, server_default=None)
            for name in ("retired_reason", "retired_by_user_id", "retired_at", "is_retired", "due_at", "owner_team", "owner_user_id"):
                if name in cols:
                    batch.drop_column(name)
