"""Add the additive PV1 domain foundation.

The legacy projects/project_tasks tables remain readable.  These tables are the
authoritative store for the new v2 API; legacy adapters do not write them during
this foundation phase.
"""

from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "f5a6b7c8d9e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pv1_projects",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("legacy_project_id", sa.Integer(), nullable=True),
        sa.Column("display_key", sa.String(32), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("objective", sa.String(500), nullable=True),
        sa.Column("problem", sa.Text(), nullable=True),
        sa.Column("in_scope", sa.Text(), nullable=True),
        sa.Column("out_of_scope", sa.Text(), nullable=True),
        sa.Column("team_id", sa.Integer(), nullable=True),
        sa.Column("owner_id", sa.String(200), nullable=False),
        sa.Column("template_key", sa.String(120), nullable=True),
        sa.Column("template_version", sa.String(40), nullable=True),
        sa.Column("phase", sa.String(32), nullable=False, server_default="Draft"),
        sa.Column("run_state", sa.String(32), nullable=False, server_default="Active"),
        sa.Column("priority", sa.String(16), nullable=False, server_default="Medium"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("no_deadline_reason", sa.String(500), nullable=True),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("calendar_id", sa.String(120), nullable=True),
        sa.Column("calendar_revision", sa.Integer(), nullable=True),
        sa.Column("visibility", sa.String(16), nullable=False, server_default="Team"),
        sa.Column("parent_project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("architecture_assessment", sa.String(32), nullable=False, server_default="Not assessed"),
        sa.Column("architecture_rationale", sa.Text(), nullable=True),
        sa.Column("outcome_phase", sa.String(32), nullable=False, server_default="Not configured"),
        sa.Column("outcome_result", sa.String(32), nullable=False, server_default="Unassessed"),
        sa.Column("update_cadence", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("measurement_followups", sa.JSON(), nullable=True),
        sa.Column("comparison_baseline_id", sa.String(80), nullable=True),
        sa.Column("actual_delivery_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_snapshot_id", sa.String(80), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("pause_reason", sa.Text(), nullable=True),
        sa.Column("resume_review_date", sa.Date(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("graph_revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
        sa.UniqueConstraint("tenant_id", "display_key", name="uq_pv1_projects_tenant_display_key"),
        sa.CheckConstraint("revision >= 1", name="pv1_project_revision_positive"),
        sa.CheckConstraint("graph_revision >= 1", name="pv1_project_graph_revision_positive"),
    )
    op.create_index("ix_pv1_projects_tenant_id", "pv1_projects", ["tenant_id"])
    op.create_index("ix_pv1_projects_legacy_project_id", "pv1_projects", ["legacy_project_id"])
    op.create_index("ix_pv1_projects_team_id", "pv1_projects", ["team_id"])
    op.create_index("ix_pv1_projects_tenant_archived", "pv1_projects", ["tenant_id", "archived_at"])

    op.create_table(
        "pv1_tasks",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("legacy_task_id", sa.Integer(), nullable=True),
        sa.Column("parent_task_id", sa.String(80), sa.ForeignKey("pv1_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("milestone_id", sa.String(80), nullable=True),
        sa.Column("kind", sa.String(16), nullable=False, server_default="Task"),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.String(200), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="To Do"),
        sa.Column("priority", sa.String(16), nullable=False, server_default="Medium"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("point_date", sa.Date(), nullable=True),
        sa.Column("estimate_hours", sa.Numeric(18, 4), nullable=True),
        sa.Column("remaining_workdays", sa.Integer(), nullable=True),
        sa.Column("planning_weight", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("mandatory", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("order_key", sa.Numeric(24, 0), nullable=False, server_default="1024"),
        sa.Column("actual_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
        sa.CheckConstraint("progress >= 0 AND progress <= 100", name="pv1_task_progress_range"),
        sa.CheckConstraint("planning_weight >= 1 AND planning_weight <= 100", name="pv1_task_planning_weight_range"),
    )
    op.create_index("ix_pv1_tasks_tenant_id", "pv1_tasks", ["tenant_id"])
    op.create_index("ix_pv1_tasks_project_id", "pv1_tasks", ["project_id"])
    op.create_index("ix_pv1_tasks_legacy_task_id", "pv1_tasks", ["legacy_task_id"])
    op.create_index("ix_pv1_tasks_project_parent_order", "pv1_tasks", ["tenant_id", "project_id", "parent_task_id", "order_key"])
    op.create_index("ix_pv1_tasks_project_owner_status", "pv1_tasks", ["tenant_id", "project_id", "owner_id", "status"])

    op.create_table(
        "pv1_project_members",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(200), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("capabilities", sa.JSON(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
        sa.UniqueConstraint("tenant_id", "project_id", "user_id", name="uq_pv1_project_members_project_user"),
    )
    op.create_index("ix_pv1_project_members_tenant_id", "pv1_project_members", ["tenant_id"])
    op.create_index("ix_pv1_project_members_user", "pv1_project_members", ["tenant_id", "user_id"])

    op.create_table(
        "pv1_task_criteria",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.String(80), sa.ForeignKey("pv1_tasks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("description", sa.Text(), nullable=False), sa.Column("mandatory", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("evidence_refs", sa.JSON(), nullable=True), sa.Column("state", sa.String(16), nullable=False, server_default="Open"),
        sa.Column("reviewer", sa.String(200), nullable=True), sa.Column("waiver_reason", sa.Text(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_task_criteria_tenant_id", "pv1_task_criteria", ["tenant_id"])

    op.create_table(
        "pv1_dependencies",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("predecessor_id", sa.String(80), sa.ForeignKey("pv1_tasks.id", ondelete="CASCADE"), nullable=False), sa.Column("successor_id", sa.String(80), sa.ForeignKey("pv1_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dependency_type", sa.String(2), nullable=False), sa.Column("lag_days", sa.Integer(), nullable=False, server_default="0"), sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
        sa.UniqueConstraint("tenant_id", "project_id", "predecessor_id", "successor_id", "dependency_type", name="uq_pv1_dependencies_edge"),
    )
    op.create_index("ix_pv1_dependencies_tenant_id", "pv1_dependencies", ["tenant_id"])
    op.create_index("ix_pv1_dependencies_successor", "pv1_dependencies", ["tenant_id", "project_id", "successor_id"])

    op.create_table(
        "pv1_task_blockers",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("task_id", sa.String(80), sa.ForeignKey("pv1_tasks.id", ondelete="CASCADE"), nullable=False), sa.Column("source", sa.String(16), nullable=False), sa.Column("reason", sa.Text(), nullable=False), sa.Column("resolver_id", sa.String(200), nullable=True), sa.Column("review_date", sa.Date(), nullable=True), sa.Column("state", sa.String(16), nullable=False, server_default="Open"), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_task_blockers_tenant_id", "pv1_task_blockers", ["tenant_id"])

    op.create_table(
        "pv1_governance_records",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("record_type", sa.String(16), nullable=False), sa.Column("title", sa.String(120), nullable=False), sa.Column("state", sa.String(32), nullable=False, server_default="Open"), sa.Column("owner_id", sa.String(200), nullable=True), sa.Column("payload", sa.JSON(), nullable=True), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False), sa.CheckConstraint("record_type IN ('Risk', 'Issue', 'Assumption', 'Decision')", name="pv1_governance_record_type"),
    )
    op.create_index("ix_pv1_governance_records_tenant_id", "pv1_governance_records", ["tenant_id"])
    op.create_index("ix_pv1_governance_project_type_state", "pv1_governance_records", ["tenant_id", "project_id", "record_type", "state"])

    op.create_table(
        "pv1_updates",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("state", sa.String(16), nullable=False, server_default="Draft"), sa.Column("period_start", sa.Date(), nullable=True), sa.Column("period_end", sa.Date(), nullable=True), sa.Column("author_id", sa.String(200), nullable=False), sa.Column("content", sa.JSON(), nullable=False), sa.Column("published_at", sa.DateTime(timezone=True), nullable=True), sa.Column("supersedes_id", sa.String(80), nullable=True), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_updates_tenant_id", "pv1_updates", ["tenant_id"])

    op.create_table(
        "pv1_metrics",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("kind", sa.String(32), nullable=False), sa.Column("description", sa.Text(), nullable=True), sa.Column("unit", sa.String(64), nullable=False), sa.Column("direction", sa.String(24), nullable=False), sa.Column("baseline", sa.Numeric(24, 8), nullable=True), sa.Column("target_spec", sa.JSON(), nullable=True), sa.Column("target_date", sa.Date(), nullable=True), sa.Column("steward_id", sa.String(200), nullable=False), sa.Column("measurement_method", sa.Text(), nullable=False), sa.Column("population_definition", sa.Text(), nullable=True), sa.Column("cadence_days", sa.Integer(), nullable=False, server_default="14"), sa.Column("required_for_success", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("required_consecutive_periods", sa.Integer(), nullable=False, server_default="1"), sa.Column("definition_revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_metrics_tenant_id", "pv1_metrics", ["tenant_id"])

    op.create_table(
        "pv1_measurements",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("metric_id", sa.String(80), sa.ForeignKey("pv1_metrics.id", ondelete="CASCADE"), nullable=False), sa.Column("definition_revision", sa.Integer(), nullable=False), sa.Column("period_start", sa.Date(), nullable=False), sa.Column("period_end", sa.Date(), nullable=False), sa.Column("observed_numeric", sa.Numeric(24, 8), nullable=True), sa.Column("observed_binary", sa.Boolean(), nullable=True), sa.Column("numerator", sa.Integer(), nullable=True), sa.Column("denominator", sa.Integer(), nullable=True), sa.Column("unit", sa.String(64), nullable=False), sa.Column("source", sa.Text(), nullable=False), sa.Column("evidence", sa.JSON(), nullable=True), sa.Column("observed_at", sa.DateTime(timezone=True), nullable=True), sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("recorder_id", sa.String(200), nullable=False), sa.Column("quality", sa.String(16), nullable=False, server_default="Unverified"), sa.Column("reviewer_id", sa.String(200), nullable=True), sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True), sa.Column("supersedes_id", sa.String(80), nullable=True), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_measurements_tenant_id", "pv1_measurements", ["tenant_id"])
    op.create_index("ix_pv1_measurements_metric_period", "pv1_measurements", ["tenant_id", "metric_id", "period_start", "period_end"])

    op.create_table(
        "pv1_value_entries",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("classification", sa.String(32), nullable=False), sa.Column("amount", sa.Numeric(24, 8), nullable=False), sa.Column("currency_or_unit", sa.String(64), nullable=False), sa.Column("period_start", sa.Date(), nullable=False), sa.Column("period_end", sa.Date(), nullable=False), sa.Column("attribution_key", sa.String(160), nullable=False), sa.Column("fraction", sa.Numeric(10, 8), nullable=False, server_default="1"), sa.Column("source", sa.Text(), nullable=False), sa.Column("quality", sa.String(16), nullable=False, server_default="Unverified"), sa.Column("evidence", sa.JSON(), nullable=True), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_value_entries_tenant_id", "pv1_value_entries", ["tenant_id"])
    op.create_index("ix_pv1_values_attribution", "pv1_value_entries", ["tenant_id", "attribution_key"])

    op.create_table(
        "pv1_outcome_acceptances",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("result", sa.String(32), nullable=False), sa.Column("metric_revision_ids", sa.JSON(), nullable=True), sa.Column("measurement_ids", sa.JSON(), nullable=True), sa.Column("reviewer_id", sa.String(200), nullable=False), sa.Column("rationale", sa.Text(), nullable=False), sa.Column("accepted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_outcome_acceptances_tenant_id", "pv1_outcome_acceptances", ["tenant_id"])

    op.create_table(
        "pv1_delivery_acceptances",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("task_revision_ids", sa.JSON(), nullable=True), sa.Column("criterion_revision_ids", sa.JSON(), nullable=True), sa.Column("evidence_revision_ids", sa.JSON(), nullable=True), sa.Column("residual_obligation_ids", sa.JSON(), nullable=True), sa.Column("followups", sa.JSON(), nullable=True), sa.Column("reviewer_id", sa.String(200), nullable=False), sa.Column("accepted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("revision", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by", sa.String(200), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_by", sa.String(200), nullable=False),
    )
    op.create_index("ix_pv1_delivery_acceptances_tenant_id", "pv1_delivery_acceptances", ["tenant_id"])

    op.create_table(
        "pv1_events",
        sa.Column("event_id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False), sa.Column("aggregate_type", sa.String(32), nullable=False), sa.Column("aggregate_id", sa.String(80), nullable=False), sa.Column("aggregate_revision", sa.Integer(), nullable=False), sa.Column("sequence", sa.Integer(), nullable=False), sa.Column("actor_id", sa.String(200), nullable=False), sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("event_type", sa.String(80), nullable=False), sa.Column("command_id", sa.String(80), nullable=False), sa.Column("delta", sa.JSON(), nullable=True), sa.Column("visibility_policy", sa.String(32), nullable=False, server_default="project_members"), sa.UniqueConstraint("tenant_id", "project_id", "sequence", name="uq_pv1_events_project_sequence"),
    )
    op.create_index("ix_pv1_events_tenant_id", "pv1_events", ["tenant_id"])
    op.create_index("ix_pv1_events_project_sequence", "pv1_events", ["tenant_id", "project_id", "sequence"])

    op.create_table(
        "pv1_idempotency_keys",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("actor_id", sa.String(200), nullable=False), sa.Column("command_type", sa.String(80), nullable=False), sa.Column("command_id", sa.String(80), nullable=False), sa.Column("request_hash", sa.String(64), nullable=False), sa.Column("status", sa.String(16), nullable=False, server_default="applied"), sa.Column("response_json", sa.JSON(), nullable=False), sa.Column("event_id", sa.String(80), nullable=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("tenant_id", "actor_id", "command_type", "command_id", name="uq_pv1_idempotency_scope"),
    )
    op.create_index("ix_pv1_idempotency_keys_tenant_id", "pv1_idempotency_keys", ["tenant_id"])
    op.create_index("ix_pv1_idempotency_expiry", "pv1_idempotency_keys", ["tenant_id", "expires_at"])

    op.create_table(
        "pv1_outbox_events",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("tenant_id", sa.Integer(), nullable=False), sa.Column("event_id", sa.String(80), nullable=False, unique=True), sa.Column("topic", sa.String(120), nullable=False), sa.Column("payload", sa.JSON(), nullable=False), sa.Column("published_at", sa.DateTime(timezone=True), nullable=True), sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pv1_outbox_events_tenant_id", "pv1_outbox_events", ["tenant_id"])
    op.create_index("ix_pv1_outbox_pending", "pv1_outbox_events", ["tenant_id", "published_at"])


def downgrade() -> None:
    for table in [
        "pv1_outbox_events", "pv1_idempotency_keys", "pv1_events", "pv1_delivery_acceptances", "pv1_outcome_acceptances", "pv1_value_entries", "pv1_measurements", "pv1_metrics", "pv1_updates", "pv1_governance_records", "pv1_task_blockers", "pv1_dependencies", "pv1_task_criteria", "pv1_project_members", "pv1_tasks", "pv1_projects",
    ]:
        op.drop_table(table)
