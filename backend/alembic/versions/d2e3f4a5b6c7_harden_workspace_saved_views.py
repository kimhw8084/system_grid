"""harden workspace saved views

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa

revision = "d2e3f4a5b6c7"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("workspace_saved_views") as batch_op:
        batch_op.alter_column(
            "workspace_key",
            existing_type=sa.String(),
            type_=sa.String(length=80),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "name",
            existing_type=sa.String(),
            type_=sa.String(length=120),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "scope",
            existing_type=sa.String(),
            type_=sa.String(length=16),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "owner_user_id",
            existing_type=sa.String(),
            type_=sa.String(length=200),
            existing_nullable=False,
        )
        batch_op.create_check_constraint(
            "ck_workspace_saved_views_workspace_saved_view_scope",
            "scope IN ('personal', 'team')",
        )
        batch_op.create_check_constraint(
            "ck_workspace_saved_views_workspace_saved_view_revision_positive",
            "revision >= 1",
        )
        batch_op.create_check_constraint(
            "ck_workspace_saved_views_workspace_saved_view_schema_version_positive",
            "schema_version >= 1",
        )
        batch_op.create_check_constraint(
            "ck_workspace_saved_views_workspace_saved_view_scope_owner_coherent",
            "(scope = 'personal' AND team_id IS NULL) OR (scope = 'team' AND team_id IS NOT NULL)",
        )
        batch_op.create_index(
            "ix_workspace_saved_views_owner_workspace",
            ["owner_user_id", "workspace_key"],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table("workspace_saved_views") as batch_op:
        batch_op.drop_index("ix_workspace_saved_views_owner_workspace")
        batch_op.drop_constraint(
            "ck_workspace_saved_views_workspace_saved_view_scope_owner_coherent",
            type_="check",
        )
        batch_op.drop_constraint(
            "ck_workspace_saved_views_workspace_saved_view_schema_version_positive",
            type_="check",
        )
        batch_op.drop_constraint(
            "ck_workspace_saved_views_workspace_saved_view_revision_positive",
            type_="check",
        )
        batch_op.drop_constraint(
            "ck_workspace_saved_views_workspace_saved_view_scope",
            type_="check",
        )
        batch_op.alter_column(
            "owner_user_id",
            existing_type=sa.String(length=200),
            type_=sa.String(),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "scope",
            existing_type=sa.String(length=16),
            type_=sa.String(),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "name",
            existing_type=sa.String(length=120),
            type_=sa.String(),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "workspace_key",
            existing_type=sa.String(length=80),
            type_=sa.String(),
            existing_nullable=False,
        )
