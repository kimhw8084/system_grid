"""Add durable PV1 outcome definition, checkpoint and valuation fields.

This migration is additive. Existing metric, measurement and value identities
remain intact; legacy outcome metadata stays source-labelled and unverified.
"""

from alembic import op
import sqlalchemy as sa


revision = "e8f9a0b1c2d3"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("pv1_projects") as batch:
        batch.add_column(sa.Column("outcome_currency", sa.String(16), nullable=True))

    with op.batch_alter_table("pv1_metrics") as batch:
        batch.add_column(sa.Column("population_version", sa.String(80), nullable=True))

    with op.batch_alter_table("pv1_measurements") as batch:
        batch.add_column(sa.Column("population_version", sa.String(80), nullable=True))
        batch.add_column(sa.Column("imported_percentage", sa.Numeric(24, 8), nullable=True))

    with op.batch_alter_table("pv1_value_entries") as batch:
        batch.add_column(sa.Column("kind", sa.String(16), nullable=False, server_default="Measured"))
        batch.add_column(sa.Column("valuation_rate", sa.Numeric(24, 8), nullable=True))
        batch.add_column(sa.Column("parent_value_id", sa.String(80), nullable=True))
        batch.add_column(sa.Column("approved_by", sa.String(200), nullable=True))
        batch.add_column(sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("pv1_delivery_acceptances") as batch:
        batch.add_column(sa.Column("source_snapshot", sa.JSON(), nullable=False, server_default="{}"))

    with op.batch_alter_table("pv1_outcome_acceptances") as batch:
        batch.add_column(sa.Column("source_snapshot", sa.JSON(), nullable=False, server_default="{}"))

    op.create_table(
        "pv1_metric_definition_revisions",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metric_id", sa.String(80), sa.ForeignKey("pv1_metrics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("definition_revision", sa.Integer(), nullable=False),
        sa.Column("definition", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="Current"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
        sa.UniqueConstraint("tenant_id", "metric_id", "definition_revision", name="uq_pv1_metric_definition_revision"),
    )
    op.create_index("ix_pv1_metric_definition_revisions_metric", "pv1_metric_definition_revisions", ["tenant_id", "project_id", "metric_id", "definition_revision"])

    op.create_table(
        "pv1_outcome_checkpoints",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delivery_acceptance_id", sa.String(80), sa.ForeignKey("pv1_delivery_acceptances.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("metric_ids", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("state", sa.String(16), nullable=False, server_default="Pending"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_outcome_checkpoints_project_due", "pv1_outcome_checkpoints", ["tenant_id", "project_id", "due_date", "state"])


def downgrade() -> None:
    op.drop_index("ix_pv1_outcome_checkpoints_project_due", table_name="pv1_outcome_checkpoints")
    op.drop_table("pv1_outcome_checkpoints")
    op.drop_index("ix_pv1_metric_definition_revisions_metric", table_name="pv1_metric_definition_revisions")
    op.drop_table("pv1_metric_definition_revisions")
    with op.batch_alter_table("pv1_outcome_acceptances") as batch:
        batch.drop_column("source_snapshot")
    with op.batch_alter_table("pv1_delivery_acceptances") as batch:
        batch.drop_column("source_snapshot")
    with op.batch_alter_table("pv1_value_entries") as batch:
        for name in ("approved_at", "approved_by", "parent_value_id", "valuation_rate", "kind"):
            batch.drop_column(name)
    with op.batch_alter_table("pv1_measurements") as batch:
        batch.drop_column("imported_percentage")
        batch.drop_column("population_version")
    with op.batch_alter_table("pv1_metrics") as batch:
        batch.drop_column("population_version")
    with op.batch_alter_table("pv1_projects") as batch:
        batch.drop_column("outcome_currency")
