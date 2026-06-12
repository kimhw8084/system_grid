"""sync FAR and RCA runtime schema

Revision ID: a9d4c7b2e1f0
Revises: c3d4e5f6a7b8
Create Date: 2026-06-12 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a9d4c7b2e1f0"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    rows = bind.execute(sa.text(f"PRAGMA table_info({table_name})")).fetchall()
    return {row[1] for row in rows}


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    row = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table_name},
    ).fetchone()
    return bool(row)


def upgrade() -> None:
    if _table_exists("far_failure_modes") and "version" not in _column_names("far_failure_modes"):
        with op.batch_alter_table("far_failure_modes", schema=None) as batch_op:
            batch_op.add_column(sa.Column("version", sa.Integer(), nullable=True))
        op.execute("UPDATE far_failure_modes SET version = 1 WHERE version IS NULL")

    if _table_exists("far_resolutions") and "guidance_notes" not in _column_names("far_resolutions"):
        with op.batch_alter_table("far_resolutions", schema=None) as batch_op:
            batch_op.add_column(sa.Column("guidance_notes", sa.Text(), nullable=True))

    if _table_exists("rca_records") and "version" not in _column_names("rca_records"):
        with op.batch_alter_table("rca_records", schema=None) as batch_op:
            batch_op.add_column(sa.Column("version", sa.Integer(), nullable=True))
        op.execute("UPDATE rca_records SET version = 1 WHERE version IS NULL")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS far_history (
            far_mode_id INTEGER,
            version INTEGER,
            snapshot JSON,
            change_summary TEXT,
            id INTEGER NOT NULL PRIMARY KEY,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by_user_id VARCHAR,
            UNIQUE (far_mode_id, version),
            FOREIGN KEY(far_mode_id) REFERENCES far_failure_modes (id) ON DELETE CASCADE
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_far_history_id ON far_history (id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS rca_history (
            rca_id INTEGER,
            version INTEGER,
            snapshot JSON,
            change_summary TEXT,
            id INTEGER NOT NULL PRIMARY KEY,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by_user_id VARCHAR,
            UNIQUE (rca_id, version),
            FOREIGN KEY(rca_id) REFERENCES rca_records (id) ON DELETE CASCADE
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_rca_history_id ON rca_history (id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_rca_history_id")
    op.execute("DROP TABLE IF EXISTS rca_history")
    op.execute("DROP INDEX IF EXISTS ix_far_history_id")
    op.execute("DROP TABLE IF EXISTS far_history")

    if _table_exists("rca_records") and "version" in _column_names("rca_records"):
        with op.batch_alter_table("rca_records", schema=None) as batch_op:
            batch_op.drop_column("version")

    if _table_exists("far_resolutions") and "guidance_notes" in _column_names("far_resolutions"):
        with op.batch_alter_table("far_resolutions", schema=None) as batch_op:
            batch_op.drop_column("guidance_notes")

    if _table_exists("far_failure_modes") and "version" in _column_names("far_failure_modes"):
        with op.batch_alter_table("far_failure_modes", schema=None) as batch_op:
            batch_op.drop_column("version")
