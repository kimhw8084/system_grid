"""add workspace saved view favorite/default metadata

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-08-25
"""

from alembic import op
import sqlalchemy as sa

revision = "f4a5b6c7d8e9"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("workspace_saved_views") as batch_op:
        batch_op.add_column(sa.Column("is_favorite", sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column("is_default", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.create_index(
        "uq_workspace_saved_views_personal_default",
        "workspace_saved_views",
        ["owner_user_id", "workspace_key"],
        unique=True,
        sqlite_where=sa.text("scope = 'personal' AND is_default = 1"),
        postgresql_where=sa.text("scope = 'personal' AND is_default IS TRUE"),
    )


def downgrade():
    op.drop_index("uq_workspace_saved_views_personal_default", table_name="workspace_saved_views")
    with op.batch_alter_table("workspace_saved_views") as batch_op:
        batch_op.drop_column("is_default")
        batch_op.drop_column("is_favorite")
