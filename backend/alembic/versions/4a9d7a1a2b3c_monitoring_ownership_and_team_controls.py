"""monitoring ownership and team controls

Revision ID: 4a9d7a1a2b3c
Revises: c31c0f6f5d10
Create Date: 2026-06-04 11:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4a9d7a1a2b3c"
down_revision = "c31c0f6f5d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("monitoring_items", schema=None) as batch_op:
        batch_op.add_column(sa.Column("owner_team", sa.String(), nullable=True))

    with op.batch_alter_table("monitoring_owners", schema=None) as batch_op:
        batch_op.add_column(sa.Column("operator_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            batch_op.f("fk_monitoring_owners_operator_id_operators"),
            "operators",
            ["operator_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    with op.batch_alter_table("monitoring_owners", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("fk_monitoring_owners_operator_id_operators"), type_="foreignkey")
        batch_op.drop_column("operator_id")

    with op.batch_alter_table("monitoring_items", schema=None) as batch_op:
        batch_op.drop_column("owner_team")
