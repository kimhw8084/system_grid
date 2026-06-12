"""harden external integrity

Revision ID: c3d4e5f6a7b8
Revises: f2b7c1d9e4a8
Create Date: 2026-06-12 00:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "f2b7c1d9e4a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = set(inspector.get_table_names())

    if "external_links" in table_names:
        conn.execute(sa.text("""
            DELETE FROM external_links
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM external_links
                GROUP BY
                    external_entity_id,
                    device_id,
                    COALESCE(service_id, -1),
                    protocol,
                    COALESCE(port, ''),
                    COALESCE(host_or_fqdn, ''),
                    COALESCE(path_or_resource, ''),
                    COALESCE(link_status, '')
            )
        """))
        with op.batch_alter_table("external_links", schema=None) as batch_op:
            batch_op.create_unique_constraint(
                "uq_external_link_shape_status",
                [
                    "external_entity_id",
                    "device_id",
                    "service_id",
                    "protocol",
                    "port",
                    "host_or_fqdn",
                    "path_or_resource",
                    "link_status",
                ],
            )

    if "external_entities" in table_names:
        op.create_index(
            "ix_external_entities_active_identity",
            "external_entities",
            ["name", "type", "owner_organization"],
            unique=True,
            sqlite_where=sa.text("is_deleted = 0"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = set(inspector.get_table_names())

    if "external_entities" in table_names:
        op.drop_index("ix_external_entities_active_identity", table_name="external_entities")

    if "external_links" in table_names:
        with op.batch_alter_table("external_links", schema=None) as batch_op:
            batch_op.drop_constraint("uq_external_link_shape_status", type_="unique")
