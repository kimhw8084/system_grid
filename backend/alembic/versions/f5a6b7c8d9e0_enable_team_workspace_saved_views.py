"""Enable team-scoped workspace saved views.

Revision ID: f5a6b7c8d9e0
Revises: f4a5b6c7d8e9
"""
from alembic import op
import sqlalchemy as sa


revision = "f5a6b7c8d9e0"
down_revision = "f4a5b6c7d8e9"
branch_labels = None
depends_on = None


PERSONAL_SCOPE = sa.text("scope = 'personal'")
TEAM_SCOPE = sa.text("scope = 'team'")
PERSONAL_DEFAULT_SQLITE = sa.text("scope = 'personal' AND is_default = 1")
PERSONAL_DEFAULT_POSTGRES = sa.text("scope = 'personal' AND is_default IS TRUE")
TEAM_DEFAULT_SQLITE = sa.text("scope = 'team' AND is_default = 1")
TEAM_DEFAULT_POSTGRES = sa.text("scope = 'team' AND is_default IS TRUE")


def upgrade() -> None:
    op.drop_index("uq_workspace_saved_views_personal_default", table_name="workspace_saved_views")
    with op.batch_alter_table("workspace_saved_views", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_workspace_saved_view_owner_name", type_="unique")

    op.create_index(
        "uq_workspace_saved_views_personal_name",
        "workspace_saved_views",
        ["workspace_key", "owner_user_id", "name"],
        unique=True,
        sqlite_where=PERSONAL_SCOPE,
        postgresql_where=PERSONAL_SCOPE,
    )
    op.create_index(
        "uq_workspace_saved_views_team_name",
        "workspace_saved_views",
        ["workspace_key", "team_id", "name"],
        unique=True,
        sqlite_where=TEAM_SCOPE,
        postgresql_where=TEAM_SCOPE,
    )
    op.create_index(
        "uq_workspace_saved_views_personal_default",
        "workspace_saved_views",
        ["owner_user_id", "workspace_key"],
        unique=True,
        sqlite_where=PERSONAL_DEFAULT_SQLITE,
        postgresql_where=PERSONAL_DEFAULT_POSTGRES,
    )
    op.create_index(
        "uq_workspace_saved_views_team_default",
        "workspace_saved_views",
        ["team_id", "workspace_key"],
        unique=True,
        sqlite_where=TEAM_DEFAULT_SQLITE,
        postgresql_where=TEAM_DEFAULT_POSTGRES,
    )


def downgrade() -> None:
    op.drop_index("uq_workspace_saved_views_team_default", table_name="workspace_saved_views")
    op.drop_index("uq_workspace_saved_views_personal_default", table_name="workspace_saved_views")
    op.drop_index("uq_workspace_saved_views_team_name", table_name="workspace_saved_views")
    op.drop_index("uq_workspace_saved_views_personal_name", table_name="workspace_saved_views")
    with op.batch_alter_table("workspace_saved_views", recreate="always") as batch_op:
        batch_op.create_unique_constraint(
            "uq_workspace_saved_view_owner_name",
            ["workspace_key", "owner_user_id", "name"],
        )
    op.create_index(
        "uq_workspace_saved_views_personal_default",
        "workspace_saved_views",
        ["owner_user_id", "workspace_key"],
        unique=True,
        sqlite_where=PERSONAL_DEFAULT_SQLITE,
        postgresql_where=PERSONAL_DEFAULT_POSTGRES,
    )
