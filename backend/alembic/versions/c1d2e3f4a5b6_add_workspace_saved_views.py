"""add workspace saved views

Revision ID: c1d2e3f4a5b6
Revises: b33081b478f8
"""
from alembic import op
import sqlalchemy as sa
revision = "c1d2e3f4a5b6"
down_revision = "b33081b478f8"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("workspace_saved_views", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("created_by_user_id", sa.String()), sa.Column("workspace_key", sa.String(), nullable=False), sa.Column("name", sa.String(), nullable=False), sa.Column("scope", sa.String(), nullable=False), sa.Column("owner_user_id", sa.String(), nullable=False), sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id", ondelete="SET NULL")), sa.Column("definition_json", sa.JSON(), nullable=False), sa.Column("schema_version", sa.Integer(), nullable=False), sa.Column("revision", sa.Integer(), nullable=False), sa.UniqueConstraint("workspace_key", "owner_user_id", "name", name="uq_workspace_saved_view_owner_name"))
    op.create_index("ix_workspace_saved_views_workspace_key", "workspace_saved_views", ["workspace_key"])
    op.create_index("ix_workspace_saved_views_owner_user_id", "workspace_saved_views", ["owner_user_id"])
    op.create_index("ix_workspace_saved_views_team_id", "workspace_saved_views", ["team_id"])
def downgrade():
    op.drop_table("workspace_saved_views")
