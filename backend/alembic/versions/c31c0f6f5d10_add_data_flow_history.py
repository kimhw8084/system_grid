"""add data flow history

Revision ID: c31c0f6f5d10
Revises: 9f2d4d0aa321
Create Date: 2026-06-01 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c31c0f6f5d10"
down_revision = "9f2d4d0aa321"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "data_flow_history",
        sa.Column("data_flow_id", sa.Integer(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=True),
        sa.Column("snapshot", sa.JSON(), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("created_by_user_id", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["data_flow_id"], ["data_flows.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_flow_history_id"), "data_flow_history", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_data_flow_history_id"), table_name="data_flow_history")
    op.drop_table("data_flow_history")
