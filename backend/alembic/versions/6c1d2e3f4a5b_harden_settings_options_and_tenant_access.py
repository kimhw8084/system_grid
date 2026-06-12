"""harden settings options and tenant access

Revision ID: 6c1d2e3f4a5b
Revises: 4bf78a8a9f23
Create Date: 2026-06-11 16:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6c1d2e3f4a5b"
down_revision: Union[str, Sequence[str], None] = "4bf78a8a9f23"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = set(inspector.get_table_names())

    if "settings_options" in table_names:
        conn.execute(sa.text("""
            DELETE FROM settings_options
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM settings_options
                GROUP BY category, value
            )
        """))
        conn.execute(sa.text("""
            DELETE FROM settings_options
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM settings_options
                GROUP BY category, label
            )
        """))
        with op.batch_alter_table("settings_options", schema=None) as batch_op:
            batch_op.create_unique_constraint("uq_settings_options_category_value", ["category", "value"])
            batch_op.create_unique_constraint("uq_settings_options_category_label", ["category", "label"])

    if "user_tenant_access" in table_names:
        conn.execute(sa.text("""
            DELETE FROM user_tenant_access
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM user_tenant_access
                GROUP BY user_id, tenant_id
            )
        """))
        conn.execute(sa.text("""
            UPDATE user_tenant_access
            SET is_selected = 0
            WHERE user_id IN (
                SELECT user_id
                FROM user_tenant_access
                WHERE is_selected = 1
                GROUP BY user_id
                HAVING COUNT(*) > 1
            )
            AND id NOT IN (
                SELECT MIN(id)
                FROM user_tenant_access
                WHERE is_selected = 1
                GROUP BY user_id
            )
        """))

        with op.batch_alter_table("user_tenant_access", schema=None) as batch_op:
            batch_op.create_unique_constraint("uq_user_tenant_access_user_tenant", ["user_id", "tenant_id"])

        op.create_index(
            "ix_user_tenant_access_single_selected",
            "user_tenant_access",
            ["user_id"],
            unique=True,
            sqlite_where=sa.text("is_selected = 1"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = set(inspector.get_table_names())

    if "user_tenant_access" in table_names:
        op.drop_index("ix_user_tenant_access_single_selected", table_name="user_tenant_access")
        with op.batch_alter_table("user_tenant_access", schema=None) as batch_op:
            batch_op.drop_constraint("uq_user_tenant_access_user_tenant", type_="unique")

    if "settings_options" in table_names:
        with op.batch_alter_table("settings_options", schema=None) as batch_op:
            batch_op.drop_constraint("uq_settings_options_category_label", type_="unique")
            batch_op.drop_constraint("uq_settings_options_category_value", type_="unique")
