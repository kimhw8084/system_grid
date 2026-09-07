"""Add the PV1 durable schedule authority.

Existing PV1 projects receive an explicit seven-day calendar so their stored
date meaning is preserved. New projects are created with Monday-Friday by the
domain service after this migration.
"""

from alembic import op
import sqlalchemy as sa


revision = "c5d6e7f8a9b0"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("pv1_tasks") as batch:
        batch.add_column(sa.Column("milestone_anchor", sa.String(8), nullable=False, server_default="start"))
        batch.add_column(sa.Column("duration_workdays", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("start_pinned", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column("finish_pinned", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column("not_before_date", sa.Date(), nullable=True))
        batch.create_check_constraint("pv1_task_milestone_anchor", "milestone_anchor IN ('start', 'finish')")
        batch.create_check_constraint("pv1_task_duration_positive", "duration_workdays IS NULL OR (kind = 'Milestone' AND duration_workdays = 0) OR (kind != 'Milestone' AND duration_workdays >= 1)")

    op.create_table(
        "pv1_project_calendars",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("working_weekdays", sa.JSON(), nullable=False),
        sa.Column("exceptions", sa.JSON(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
        sa.UniqueConstraint("tenant_id", "project_id", name="uq_pv1_project_calendars_project"),
        sa.CheckConstraint("revision >= 1", name="pv1_project_calendar_revision_positive"),
    )
    op.create_index("ix_pv1_project_calendars_tenant_id", "pv1_project_calendars", ["tenant_id"])

    op.create_table(
        "pv1_schedule_baselines",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("owner_id", sa.String(200), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("calendar_revision", sa.Integer(), nullable=False),
        sa.Column("graph_revision", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pv1_schedule_baselines_tenant_id", "pv1_schedule_baselines", ["tenant_id"])
    op.create_index("ix_pv1_schedule_baselines_project_created", "pv1_schedule_baselines", ["tenant_id", "project_id", "created_at"])

    op.create_table(
        "pv1_external_dependencies",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("local_task_id", sa.String(80), sa.ForeignKey("pv1_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_project_ref", sa.String(200), nullable=False),
        sa.Column("external_task_ref", sa.String(200), nullable=False),
        sa.Column("external_milestone_revision", sa.Integer(), nullable=False),
        sa.Column("external_date", sa.Date(), nullable=True),
        sa.Column("observed_milestone_revision", sa.Integer(), nullable=True),
        sa.Column("observed_date", sa.Date(), nullable=True),
        sa.Column("external_anchor", sa.String(8), nullable=False, server_default="finish"),
        sa.Column("access_policy", sa.String(16), nullable=False, server_default="Visible"),
        sa.Column("dependency_type", sa.String(2), nullable=False),
        sa.Column("lag_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
        sa.CheckConstraint("dependency_type IN ('FS', 'SS', 'FF', 'SF')", name="pv1_external_dependency_type"),
        sa.CheckConstraint("lag_days >= -365 AND lag_days <= 365", name="pv1_external_dependency_lag"),
        sa.CheckConstraint("external_anchor IN ('start', 'finish')", name="pv1_external_dependency_anchor"),
        sa.CheckConstraint("access_policy IN ('Visible', 'Redacted', 'Unavailable')", name="pv1_external_dependency_access"),
        sa.CheckConstraint("external_milestone_revision >= 1", name="pv1_external_dependency_revision_positive"),
        sa.CheckConstraint("observed_milestone_revision IS NULL OR observed_milestone_revision >= 1", name="pv1_external_dependency_observed_revision_positive"),
        sa.CheckConstraint("NOT confirmed OR external_date IS NOT NULL", name="pv1_external_dependency_confirmed_date"),
    )
    op.create_index("ix_pv1_external_dependencies_tenant_id", "pv1_external_dependencies", ["tenant_id"])
    op.create_index("ix_pv1_external_dependencies_task", "pv1_external_dependencies", ["tenant_id", "project_id", "local_task_id"])

    connection = op.get_bind()
    projects = connection.execute(sa.text(
        "SELECT id, tenant_id, timezone, created_by, updated_by FROM pv1_projects"
    )).mappings()
    calendar_table = sa.table(
        "pv1_project_calendars",
        sa.column("id", sa.String), sa.column("tenant_id", sa.Integer), sa.column("project_id", sa.String),
        sa.column("timezone", sa.String), sa.column("working_weekdays", sa.JSON), sa.column("exceptions", sa.JSON),
        sa.column("revision", sa.Integer), sa.column("created_by", sa.String), sa.column("updated_by", sa.String),
    )
    for project in projects:
        calendar_id = f"calendar-{project['id']}"[:80]
        op.bulk_insert(calendar_table, [{
            "id": calendar_id,
            "tenant_id": project["tenant_id"],
            "project_id": project["id"],
            "timezone": project["timezone"] or "UTC",
            "working_weekdays": [0, 1, 2, 3, 4, 5, 6],
            "exceptions": [],
            "revision": 1,
            "created_by": project["created_by"],
            "updated_by": project["updated_by"],
        }])
        connection.execute(
            sa.text("UPDATE pv1_projects SET calendar_id = :calendar_id, calendar_revision = 1 WHERE id = :project_id"),
            {"calendar_id": calendar_id, "project_id": project["id"]},
        )


def downgrade() -> None:
    op.drop_index("ix_pv1_external_dependencies_task", table_name="pv1_external_dependencies")
    op.drop_index("ix_pv1_external_dependencies_tenant_id", table_name="pv1_external_dependencies")
    op.drop_table("pv1_external_dependencies")
    op.drop_index("ix_pv1_schedule_baselines_project_created", table_name="pv1_schedule_baselines")
    op.drop_index("ix_pv1_schedule_baselines_tenant_id", table_name="pv1_schedule_baselines")
    op.drop_table("pv1_schedule_baselines")
    op.drop_index("ix_pv1_project_calendars_tenant_id", table_name="pv1_project_calendars")
    op.drop_table("pv1_project_calendars")
    with op.batch_alter_table("pv1_tasks") as batch:
        batch.drop_constraint("pv1_task_duration_positive", type_="check")
        batch.drop_constraint("pv1_task_milestone_anchor", type_="check")
        batch.drop_column("not_before_date")
        batch.drop_column("finish_pinned")
        batch.drop_column("start_pinned")
        batch.drop_column("duration_workdays")
        batch.drop_column("milestone_anchor")
