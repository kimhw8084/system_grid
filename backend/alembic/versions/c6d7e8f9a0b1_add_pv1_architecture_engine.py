"""Add the canonical tenant-scoped PV1 Architecture engine.

The migration is additive.  Legacy ``data_flows`` rows and identifiers are
left intact and remain readable through the v1 compatibility adapter.
"""

from alembic import op
import sqlalchemy as sa


revision = "c6d7e8f9a0b1"
down_revision = "c5d6e7f8a9b0"
branch_labels = None
depends_on = None


def _timestamps():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.String(200), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "pv1_architecture_models",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.String(200), nullable=False),
        sa.Column("schema_version", sa.String(32), nullable=False, server_default="pv1.architecture.v1"),
        sa.Column("lifecycle", sa.String(32), nullable=False, server_default="Current"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        *_timestamps(),
        sa.CheckConstraint("revision >= 1", name="pv1_arch_model_revision_positive"),
    )
    op.create_index("ix_pv1_architecture_models_tenant_id", "pv1_architecture_models", ["tenant_id"])
    op.create_index("ix_pv1_arch_models_tenant_name", "pv1_architecture_models", ["tenant_id", "name"])

    op.create_table(
        "pv1_architecture_objects",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.String(80), sa.ForeignKey("pv1_architecture_models.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.String(200), nullable=True),
        sa.Column("lifecycle", sa.String(32), nullable=False, server_default="Current"),
        sa.Column("properties", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.CheckConstraint("revision >= 1", name="pv1_arch_object_revision_positive"),
    )
    op.create_index("ix_pv1_architecture_objects_tenant_id", "pv1_architecture_objects", ["tenant_id"])
    op.create_index("ix_pv1_arch_objects_model_kind", "pv1_architecture_objects", ["tenant_id", "model_id", "kind"])
    op.create_index("ix_pv1_arch_objects_model_lifecycle", "pv1_architecture_objects", ["tenant_id", "model_id", "retired_at"])

    op.create_table(
        "pv1_architecture_relations",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.String(80), sa.ForeignKey("pv1_architecture_models.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_id", sa.String(80), sa.ForeignKey("pv1_architecture_objects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_id", sa.String(80), sa.ForeignKey("pv1_architecture_objects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relation_type", sa.String(40), nullable=False, server_default="Depends on"),
        sa.Column("name", sa.String(160), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("properties", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.CheckConstraint("revision >= 1", name="pv1_arch_relation_revision_positive"),
    )
    op.create_index("ix_pv1_architecture_relations_tenant_id", "pv1_architecture_relations", ["tenant_id"])
    op.create_index("ix_pv1_arch_relations_model_source", "pv1_architecture_relations", ["tenant_id", "model_id", "source_id"])
    op.create_index("ix_pv1_arch_relations_model_target", "pv1_architecture_relations", ["tenant_id", "model_id", "target_id"])

    op.create_table(
        "pv1_architecture_diagrams",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.String(80), sa.ForeignKey("pv1_architecture_models.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("level", sa.String(32), nullable=False, server_default="Context"),
        sa.Column("filters", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.UniqueConstraint("tenant_id", "model_id", "name", name="uq_pv1_arch_diagrams_model_name"),
        sa.CheckConstraint("revision >= 1", name="pv1_arch_diagram_revision_positive"),
    )
    op.create_index("ix_pv1_architecture_diagrams_tenant_id", "pv1_architecture_diagrams", ["tenant_id"])

    op.create_table(
        "pv1_architecture_diagram_memberships",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("diagram_id", sa.String(80), sa.ForeignKey("pv1_architecture_diagrams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_kind", sa.String(16), nullable=False),
        sa.Column("entity_id", sa.String(80), nullable=False),
        sa.Column("x", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("y", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("width", sa.Integer(), nullable=False, server_default="180"),
        sa.Column("height", sa.Integer(), nullable=False, server_default="80"),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        *_timestamps(),
        sa.UniqueConstraint("tenant_id", "diagram_id", "entity_kind", "entity_id", name="uq_pv1_arch_membership_entity"),
    )
    op.create_index("ix_pv1_architecture_diagram_memberships_tenant_id", "pv1_architecture_diagram_memberships", ["tenant_id"])
    op.create_index("ix_pv1_arch_membership_diagram", "pv1_architecture_diagram_memberships", ["tenant_id", "diagram_id"])

    op.create_table(
        "pv1_architecture_change_sets",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.String(80), sa.ForeignKey("pv1_architecture_models.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("owner_id", sa.String(200), nullable=False),
        sa.Column("base_model_revision", sa.Integer(), nullable=False),
        sa.Column("base_entity_revisions", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("state", sa.String(24), nullable=False, server_default="Draft"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("approver_id", sa.String(200), nullable=True),
        sa.Column("conflict_metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("applied_model_revision", sa.Integer(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.CheckConstraint("base_model_revision >= 1", name="pv1_arch_changeset_base_revision_positive"),
        sa.CheckConstraint("revision >= 1", name="pv1_arch_changeset_revision_positive"),
    )
    op.create_index("ix_pv1_architecture_change_sets_tenant_id", "pv1_architecture_change_sets", ["tenant_id"])
    op.create_index("ix_pv1_arch_changesets_model_state", "pv1_architecture_change_sets", ["tenant_id", "model_id", "state"])

    op.create_table(
        "pv1_architecture_change_operations",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("change_set_id", sa.String(80), sa.ForeignKey("pv1_architecture_change_sets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("op_type", sa.String(80), nullable=False),
        sa.Column("target_id", sa.String(80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        *_timestamps(),
        sa.UniqueConstraint("tenant_id", "change_set_id", "sequence", name="uq_pv1_arch_operation_sequence"),
    )
    op.create_index("ix_pv1_architecture_change_operations_tenant_id", "pv1_architecture_change_operations", ["tenant_id"])
    op.create_index("ix_pv1_arch_operations_changeset", "pv1_architecture_change_operations", ["tenant_id", "change_set_id"])

    op.create_table(
        "pv1_architecture_access",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.String(80), sa.ForeignKey("pv1_architecture_models.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(200), nullable=False),
        sa.Column("role", sa.String(24), nullable=False, server_default="Viewer"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        *_timestamps(),
        sa.UniqueConstraint("tenant_id", "model_id", "user_id", name="uq_pv1_arch_access_user"),
    )
    op.create_index("ix_pv1_architecture_access_tenant_id", "pv1_architecture_access", ["tenant_id"])
    op.create_index("ix_pv1_arch_access_model_role", "pv1_architecture_access", ["tenant_id", "model_id", "role"])

    op.create_table(
        "pv1_project_architecture_associations",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("model_id", sa.String(80), sa.ForeignKey("pv1_architecture_models.id", ondelete="CASCADE"), nullable=False),
        sa.Column("diagram_id", sa.String(80), nullable=True),
        sa.Column("object_ids", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("relation_ids", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("impact_tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("changeset_id", sa.String(80), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        *_timestamps(),
        sa.UniqueConstraint("tenant_id", "project_id", "model_id", name="uq_pv1_project_arch_association"),
    )
    op.create_index("ix_pv1_project_architecture_associations_tenant_id", "pv1_project_architecture_associations", ["tenant_id"])
    op.create_index("ix_pv1_project_arch_association_project", "pv1_project_architecture_associations", ["tenant_id", "project_id"])

    op.create_table(
        "pv1_project_architecture_assessments",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(80), sa.ForeignKey("pv1_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("model_id", sa.String(80), sa.ForeignKey("pv1_architecture_models.id", ondelete="CASCADE"), nullable=False),
        sa.Column("state", sa.String(32), nullable=False, server_default="Not assessed"),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("evidence_refs", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("reviewer_id", sa.String(200), nullable=True),
        sa.Column("applied_model_revision", sa.Integer(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        *_timestamps(),
        sa.UniqueConstraint("tenant_id", "project_id", "model_id", name="uq_pv1_project_arch_assessment"),
        sa.CheckConstraint("revision >= 1", name="pv1_arch_assessment_revision_positive"),
    )
    op.create_index("ix_pv1_project_architecture_assessments_tenant_id", "pv1_project_architecture_assessments", ["tenant_id"])

    op.create_table(
        "pv1_architecture_commands",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.String(200), nullable=False),
        sa.Column("command_type", sa.String(80), nullable=False),
        sa.Column("command_id", sa.String(80), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("response_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("event_id", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("tenant_id", "actor_id", "command_type", "command_id", name="uq_pv1_arch_command_idempotency"),
    )
    op.create_index("ix_pv1_architecture_commands_tenant_id", "pv1_architecture_commands", ["tenant_id"])
    op.create_index("ix_pv1_arch_command_expiry", "pv1_architecture_commands", ["tenant_id", "expires_at"])

    op.create_table(
        "pv1_architecture_events",
        sa.Column("event_id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.String(80), sa.ForeignKey("pv1_architecture_models.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.String(200), nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("command_id", sa.String(80), nullable=False),
        sa.Column("aggregate_id", sa.String(80), nullable=False),
        sa.Column("aggregate_revision", sa.Integer(), nullable=False),
        sa.Column("delta", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "model_id", "sequence", name="uq_pv1_arch_event_sequence"),
    )
    op.create_index("ix_pv1_architecture_events_tenant_id", "pv1_architecture_events", ["tenant_id"])
    op.create_index("ix_pv1_arch_events_model_sequence", "pv1_architecture_events", ["tenant_id", "model_id", "sequence"])

    op.create_table(
        "pv1_architecture_outbox",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.String(80), nullable=False, unique=True),
        sa.Column("topic", sa.String(120), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pv1_architecture_outbox_tenant_id", "pv1_architecture_outbox", ["tenant_id"])
    op.create_index("ix_pv1_arch_outbox_pending", "pv1_architecture_outbox", ["tenant_id", "published_at"])


def downgrade() -> None:
    op.drop_index("ix_pv1_arch_outbox_pending", table_name="pv1_architecture_outbox")
    op.drop_index("ix_pv1_architecture_outbox_tenant_id", table_name="pv1_architecture_outbox")
    op.drop_table("pv1_architecture_outbox")
    op.drop_index("ix_pv1_arch_events_model_sequence", table_name="pv1_architecture_events")
    op.drop_index("ix_pv1_architecture_events_tenant_id", table_name="pv1_architecture_events")
    op.drop_table("pv1_architecture_events")
    op.drop_index("ix_pv1_arch_command_expiry", table_name="pv1_architecture_commands")
    op.drop_index("ix_pv1_architecture_commands_tenant_id", table_name="pv1_architecture_commands")
    op.drop_table("pv1_architecture_commands")
    op.drop_index("ix_pv1_project_architecture_assessments_tenant_id", table_name="pv1_project_architecture_assessments")
    op.drop_table("pv1_project_architecture_assessments")
    op.drop_index("ix_pv1_architecture_access_tenant_id", table_name="pv1_architecture_access")
    op.drop_index("ix_pv1_arch_access_model_role", table_name="pv1_architecture_access")
    op.drop_table("pv1_architecture_access")
    op.drop_index("ix_pv1_project_arch_association_project", table_name="pv1_project_architecture_associations")
    op.drop_index("ix_pv1_project_architecture_associations_tenant_id", table_name="pv1_project_architecture_associations")
    op.drop_table("pv1_project_architecture_associations")
    op.drop_index("ix_pv1_arch_operations_changeset", table_name="pv1_architecture_change_operations")
    op.drop_index("ix_pv1_architecture_change_operations_tenant_id", table_name="pv1_architecture_change_operations")
    op.drop_table("pv1_architecture_change_operations")
    op.drop_index("ix_pv1_arch_changesets_model_state", table_name="pv1_architecture_change_sets")
    op.drop_index("ix_pv1_architecture_change_sets_tenant_id", table_name="pv1_architecture_change_sets")
    op.drop_table("pv1_architecture_change_sets")
    op.drop_index("ix_pv1_architecture_diagram_memberships_tenant_id", table_name="pv1_architecture_diagram_memberships")
    op.drop_index("ix_pv1_arch_membership_diagram", table_name="pv1_architecture_diagram_memberships")
    op.drop_table("pv1_architecture_diagram_memberships")
    op.drop_index("ix_pv1_architecture_diagrams_tenant_id", table_name="pv1_architecture_diagrams")
    op.drop_table("pv1_architecture_diagrams")
    op.drop_index("ix_pv1_arch_relations_model_target", table_name="pv1_architecture_relations")
    op.drop_index("ix_pv1_arch_relations_model_source", table_name="pv1_architecture_relations")
    op.drop_index("ix_pv1_architecture_relations_tenant_id", table_name="pv1_architecture_relations")
    op.drop_table("pv1_architecture_relations")
    op.drop_index("ix_pv1_arch_objects_model_lifecycle", table_name="pv1_architecture_objects")
    op.drop_index("ix_pv1_arch_objects_model_kind", table_name="pv1_architecture_objects")
    op.drop_index("ix_pv1_architecture_objects_tenant_id", table_name="pv1_architecture_objects")
    op.drop_table("pv1_architecture_objects")
    op.drop_index("ix_pv1_arch_models_tenant_name", table_name="pv1_architecture_models")
    op.drop_index("ix_pv1_architecture_models_tenant_id", table_name="pv1_architecture_models")
    op.drop_table("pv1_architecture_models")
