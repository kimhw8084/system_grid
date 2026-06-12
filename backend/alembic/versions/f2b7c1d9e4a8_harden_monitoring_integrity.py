"""harden monitoring integrity

Revision ID: f2b7c1d9e4a8
Revises: a7c9e1b4d2f6
Create Date: 2026-06-11 23:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2b7c1d9e4a8"
down_revision: Union[str, Sequence[str], None] = "a7c9e1b4d2f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = set(inspector.get_table_names())

    if "monitoring_history" in table_names:
        conn.execute(sa.text("""
            DELETE FROM monitoring_history
            WHERE id NOT IN (
                SELECT MAX(id)
                FROM monitoring_history
                GROUP BY monitoring_item_id, version
            )
        """))
        with op.batch_alter_table("monitoring_history", schema=None) as batch_op:
            batch_op.create_unique_constraint("uq_monitoring_history_item_version", ["monitoring_item_id", "version"])

    if "monitoring_items" in table_names:
        op.create_index(
            "ix_monitoring_items_active_identity",
            "monitoring_items",
            ["device_id", "title", "category", "platform"],
            unique=True,
            sqlite_where=sa.text("is_deleted = 0"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = set(inspector.get_table_names())

    if "monitoring_items" in table_names:
        op.drop_index("ix_monitoring_items_active_identity", table_name="monitoring_items")

    if "monitoring_history" in table_names:
        with op.batch_alter_table("monitoring_history", schema=None) as batch_op:
            batch_op.drop_constraint("uq_monitoring_history_item_version", type_="unique")
