"""add team management to settings

Revision ID: 5b8f2a4c9d10
Revises: 4a9d7a1a2b3c
Create Date: 2026-06-04 13:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "5b8f2a4c9d10"
down_revision = "4a9d7a1a2b3c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("created_by_user_id", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teams_id"), "teams", ["id"], unique=False)
    op.create_index(op.f("ix_teams_name"), "teams", ["name"], unique=True)

    op.create_table(
        "team_audit",
        sa.Column("team_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(), nullable=True),
        sa.Column("actor", sa.String(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("created_by_user_id", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_team_audit_action"), "team_audit", ["action"], unique=False)
    op.create_index(op.f("ix_team_audit_id"), "team_audit", ["id"], unique=False)

    with op.batch_alter_table("operators", schema=None) as batch_op:
        batch_op.add_column(sa.Column("team_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("team_source", sa.String(), nullable=True))
        batch_op.create_foreign_key(batch_op.f("fk_operators_team_id_teams"), "teams", ["team_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    with op.batch_alter_table("operators", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("fk_operators_team_id_teams"), type_="foreignkey")
        batch_op.drop_column("team_source")
        batch_op.drop_column("team_id")

    op.drop_index(op.f("ix_team_audit_id"), table_name="team_audit")
    op.drop_index(op.f("ix_team_audit_action"), table_name="team_audit")
    op.drop_table("team_audit")

    op.drop_index(op.f("ix_teams_name"), table_name="teams")
    op.drop_index(op.f("ix_teams_id"), table_name="teams")
    op.drop_table("teams")
