"""harden user preferences storage

Revision ID: a7c9e1b4d2f6
Revises: 6c1d2e3f4a5b
Create Date: 2026-06-11 22:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7c9e1b4d2f6"
down_revision: Union[str, Sequence[str], None] = "6c1d2e3f4a5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = set(inspector.get_table_names())

    if "user_preferences" not in table_names:
        return

    conn.execute(sa.text("""
        DELETE FROM user_preferences
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM user_preferences
            GROUP BY user_id, key
        )
    """))

    with op.batch_alter_table("user_preferences", schema=None) as batch_op:
        batch_op.create_unique_constraint("uq_user_preferences_user_key", ["user_id", "key"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = set(inspector.get_table_names())

    if "user_preferences" not in table_names:
        return

    with op.batch_alter_table("user_preferences", schema=None) as batch_op:
        batch_op.drop_constraint("uq_user_preferences_user_key", type_="unique")
