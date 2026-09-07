"""Add the additive PV1 legacy migration ledger and cutover boundary.

This revision never changes or removes legacy Project/Task data. It only adds
tenant-scoped bookkeeping for checkpointed backfill and the v1 read/write
adapter's source-authority state.
"""

from alembic import op
import sqlalchemy as sa


revision = "f1a2b3c4d5e6"
down_revision = "e8f9a0b1c2d3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pv1_migration_runs",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("migration_key", sa.String(80), nullable=False, server_default="legacy-projects-v1"),
        sa.Column("source_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="Running"),
        sa.Column("source_counts", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("migrated_counts", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("rejected_counts", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("checkpoint", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("source_snapshot", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("rollback_mapping", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("tenant_id", "source_hash", name="uq_pv1_migration_run_source"),
    )
    op.create_index("ix_pv1_migration_runs_tenant_id", "pv1_migration_runs", ["tenant_id"])
    op.create_index("ix_pv1_migration_runs_tenant_status", "pv1_migration_runs", ["tenant_id", "status"])

    op.create_table(
        "pv1_migration_rows",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("run_id", sa.String(80), sa.ForeignKey("pv1_migration_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("source_kind", sa.String(32), nullable=False),
        sa.Column("source_id", sa.String(80), nullable=False),
        sa.Column("source_hash", sa.String(64), nullable=False),
        sa.Column("destination_id", sa.String(80), nullable=True),
        sa.Column("state", sa.String(24), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("source_snapshot", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "source_kind", "source_id", name="uq_pv1_migration_row_source"),
    )
    op.create_index("ix_pv1_migration_rows_run_id", "pv1_migration_rows", ["run_id"])
    op.create_index("ix_pv1_migration_rows_run_state", "pv1_migration_rows", ["run_id", "state"])
    op.create_index("ix_pv1_migration_rows_tenant_id", "pv1_migration_rows", ["tenant_id"])

    op.create_table(
        "pv1_tenant_cutovers",
        sa.Column("tenant_id", sa.Integer(), primary_key=True),
        sa.Column("state", sa.String(24), nullable=False, server_default="shadow"),
        sa.Column("migration_run_id", sa.String(80), nullable=True),
        sa.Column("adapter_version", sa.String(32), nullable=False, server_default="pv1-v1-adapter-1"),
        sa.Column("changed_by", sa.String(200), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("rollback_mode", sa.String(24), nullable=False, server_default="read_only"),
    )


def downgrade() -> None:
    op.drop_table("pv1_tenant_cutovers")
    op.drop_index("ix_pv1_migration_rows_tenant_id", table_name="pv1_migration_rows")
    op.drop_index("ix_pv1_migration_rows_run_state", table_name="pv1_migration_rows")
    op.drop_index("ix_pv1_migration_rows_run_id", table_name="pv1_migration_rows")
    op.drop_table("pv1_migration_rows")
    op.drop_index("ix_pv1_migration_runs_tenant_status", table_name="pv1_migration_runs")
    op.drop_index("ix_pv1_migration_runs_tenant_id", table_name="pv1_migration_runs")
    op.drop_table("pv1_migration_runs")
