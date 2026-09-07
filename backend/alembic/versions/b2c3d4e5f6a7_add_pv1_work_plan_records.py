"""Add durable Focus, task history, and Plan resource records."""

from alembic import op
import sqlalchemy as sa


revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    def common_columns():
        return [
            sa.Column("id", sa.String(80), primary_key=True),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
        ]
    for table, extra in (
        ("pv1_focus_pins", [
            sa.Column("user_id", sa.String(200), nullable=False),
            sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
            sa.Column("entity_kind", sa.String(32), nullable=False),
            sa.Column("entity_id", sa.String(80), nullable=False),
            sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("created_by", sa.String(200), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_by", sa.String(200), nullable=False),
            sa.UniqueConstraint("tenant_id", "user_id", "entity_kind", "entity_id", name="uq_pv1_focus_pin_user_entity"),
        ]),
        ("pv1_focus_snoozes", [
            sa.Column("user_id", sa.String(200), nullable=False),
            sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
            sa.Column("entity_kind", sa.String(32), nullable=False),
            sa.Column("entity_id", sa.String(80), nullable=False),
            sa.Column("until_date", sa.Date(), nullable=False),
            sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("created_by", sa.String(200), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_by", sa.String(200), nullable=False),
            sa.UniqueConstraint("tenant_id", "user_id", "entity_kind", "entity_id", name="uq_pv1_focus_snooze_user_entity"),
        ]),
    ):
        op.create_table(table, *common_columns(), *extra)
        op.create_index(f"ix_{table}_tenant_id", table, ["tenant_id"])

    op.create_table(
        "pv1_task_command_history",
        *common_columns(),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", sa.String(200), nullable=False),
        sa.Column("original_command_id", sa.String(80), nullable=False),
        sa.Column("command_type", sa.String(80), nullable=False),
        sa.Column("task_ids", sa.JSON(), nullable=False),
        sa.Column("before_values", sa.JSON(), nullable=False),
        sa.Column("after_values", sa.JSON(), nullable=False),
        sa.Column("before_revisions", sa.JSON(), nullable=False),
        sa.Column("after_revisions", sa.JSON(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False, server_default="Active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "actor_id", "original_command_id", name="uq_pv1_task_history_command"),
    )
    op.create_index("ix_pv1_task_history_tenant_id", "pv1_task_command_history", ["tenant_id"])
    op.create_index("ix_pv1_task_history_session", "pv1_task_command_history", ["tenant_id", "actor_id", "project_id", "created_at"])

    op.create_table(
        "pv1_resources",
        *common_columns(),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("resource_kind", sa.String(32), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("upload_ref", sa.String(500), nullable=True),
        sa.Column("scan_state", sa.String(16), nullable=False, server_default="Available"),
        sa.Column("sensitivity", sa.String(32), nullable=False, server_default="Project"),
        sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("links", sa.JSON(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_resources_tenant_id", "pv1_resources", ["tenant_id"])
    op.create_index("ix_pv1_resources_project_pinned", "pv1_resources", ["tenant_id", "project_id", "pinned"])


def downgrade() -> None:
    op.drop_index("ix_pv1_resources_project_pinned", table_name="pv1_resources")
    op.drop_index("ix_pv1_resources_tenant_id", table_name="pv1_resources")
    op.drop_table("pv1_resources")
    op.drop_index("ix_pv1_task_history_session", table_name="pv1_task_command_history")
    op.drop_index("ix_pv1_task_history_tenant_id", table_name="pv1_task_command_history")
    op.drop_table("pv1_task_command_history")
    for table in ("pv1_focus_snoozes", "pv1_focus_pins"):
        op.drop_index(f"ix_{table}_tenant_id", table_name=table)
        op.drop_table(table)
