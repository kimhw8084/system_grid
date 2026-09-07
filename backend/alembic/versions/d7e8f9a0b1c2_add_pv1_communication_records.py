"""Add durable PV1 resources, communication, activity and report records.

This migration is additive.  Existing resources and updates remain readable;
new versions and immutable snapshots preserve their history without creating a
second project/task source of truth.
"""

from alembic import op
import sqlalchemy as sa


revision = "d7e8f9a0b1c2"
down_revision = "c6d7e8f9a0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("pv1_projects") as batch:
        batch.add_column(sa.Column("update_cadence_kind", sa.String(16), nullable=False, server_default="weekly"))
        batch.add_column(sa.Column("update_weekday", sa.Integer(), nullable=False, server_default="4"))
        batch.add_column(sa.Column("update_time", sa.String(5), nullable=False, server_default="15:00"))
        batch.add_column(sa.Column("update_disabled_reason", sa.String(500), nullable=True))

    with op.batch_alter_table("pv1_resources") as batch:
        batch.add_column(sa.Column("mime_type", sa.String(120), nullable=True))
        batch.add_column(sa.Column("size_bytes", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("content_sha256", sa.String(64), nullable=True))

    with op.batch_alter_table("pv1_updates") as batch:
        batch.add_column(sa.Column("source_revisions", sa.JSON(), nullable=False, server_default="{}"))
        batch.add_column(sa.Column("health_assessment", sa.String(16), nullable=True))
        batch.add_column(sa.Column("health_rationale", sa.Text(), nullable=True))
        batch.add_column(sa.Column("reporting_timezone", sa.String(64), nullable=False, server_default="UTC"))
        batch.add_column(sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("withdrawal_reason", sa.Text(), nullable=True))

    op.create_table(
        "pv1_resource_versions",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("resource_id", sa.String(80), sa.ForeignKey("pv1_resources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("upload_ref", sa.String(500), nullable=True),
        sa.Column("mime_type", sa.String(120), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("content_sha256", sa.String(64), nullable=True),
        sa.Column("scan_state", sa.String(16), nullable=False, server_default="Available"),
        sa.Column("snapshot", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
        sa.UniqueConstraint("tenant_id", "resource_id", "version", name="uq_pv1_resource_versions_number"),
    )
    op.create_index("ix_pv1_resource_versions_resource", "pv1_resource_versions", ["tenant_id", "project_id", "resource_id", "version"])

    op.create_table(
        "pv1_resource_attachments",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("resource_id", sa.String(80), sa.ForeignKey("pv1_resources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("content_sha256", sa.String(64), nullable=False),
        sa.Column("scan_state", sa.String(16), nullable=False, server_default="Pending"),
        sa.Column("storage_ref", sa.String(500), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_resource_attachments_resource", "pv1_resource_attachments", ["tenant_id", "project_id", "resource_id"])

    op.create_table(
        "pv1_activity_projection",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_event_id", sa.String(80), nullable=False),
        sa.Column("actor_id", sa.String(200), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("summary", sa.String(500), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("visibility_policy", sa.String(32), nullable=False, server_default="project_members"),
        sa.UniqueConstraint("tenant_id", "source_event_id", name="uq_pv1_activity_source_event"),
    )
    op.create_index("ix_pv1_activity_project_time", "pv1_activity_projection", ["tenant_id", "project_id", "timestamp"])

    op.create_table(
        "pv1_notification_subscriptions",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(200), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("digest_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("quiet_start", sa.String(5), nullable=False, server_default="18:00"),
        sa.Column("quiet_end", sa.String(5), nullable=False, server_default="08:00"),
        sa.Column("preferences", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
        sa.UniqueConstraint("tenant_id", "project_id", "user_id", name="uq_pv1_notification_subscription"),
    )

    op.create_table(
        "pv1_notifications",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_id", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("dedupe_key", sa.String(240), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("due_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("access_epoch", sa.String(120), nullable=False, server_default=""),
        sa.Column("delivery_state", sa.String(16), nullable=False, server_default="Pending"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("tenant_id", "recipient_id", "dedupe_key", name="uq_pv1_notification_dedupe"),
    )
    op.create_index("ix_pv1_notifications_recipient_due", "pv1_notifications", ["tenant_id", "recipient_id", "due_at", "read_at"])

    op.create_table(
        "pv1_report_snapshots",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_type", sa.String(32), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("project_revision", sa.Integer(), nullable=False),
        sa.Column("source_revisions", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("html", sa.Text(), nullable=False),
        sa.Column("confidentiality", sa.String(32), nullable=False, server_default="Project"),
        sa.Column("author_id", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pv1_report_snapshots_project_created", "pv1_report_snapshots", ["tenant_id", "project_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_pv1_report_snapshots_project_created", table_name="pv1_report_snapshots")
    op.drop_table("pv1_report_snapshots")
    op.drop_index("ix_pv1_notifications_recipient_due", table_name="pv1_notifications")
    op.drop_table("pv1_notifications")
    op.drop_table("pv1_notification_subscriptions")
    op.drop_index("ix_pv1_activity_project_time", table_name="pv1_activity_projection")
    op.drop_table("pv1_activity_projection")
    op.drop_index("ix_pv1_resource_attachments_resource", table_name="pv1_resource_attachments")
    op.drop_table("pv1_resource_attachments")
    op.drop_index("ix_pv1_resource_versions_resource", table_name="pv1_resource_versions")
    op.drop_table("pv1_resource_versions")
    with op.batch_alter_table("pv1_updates") as batch:
        for name in ("withdrawal_reason", "withdrawn_at", "reporting_timezone", "health_rationale", "health_assessment", "source_revisions"):
            batch.drop_column(name)
    with op.batch_alter_table("pv1_resources") as batch:
        for name in ("content_sha256", "size_bytes", "mime_type"):
            batch.drop_column(name)
    with op.batch_alter_table("pv1_projects") as batch:
        for name in ("update_disabled_reason", "update_time", "update_weekday", "update_cadence_kind"):
            batch.drop_column(name)
