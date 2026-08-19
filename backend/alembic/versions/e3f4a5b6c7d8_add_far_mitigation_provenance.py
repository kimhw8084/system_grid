"""add FAR mitigation provenance

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-08-21
"""

from alembic import op
import sqlalchemy as sa

revision = "e3f4a5b6c7d8"
down_revision = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE far_mitigations SET status='Not Started' WHERE status='Planned'")
    op.execute("UPDATE far_mitigations SET status='Completed' WHERE status='Implemented'")
    with op.batch_alter_table("far_mitigations") as batch_op:
        batch_op.add_column(sa.Column("knowledge_bkm_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("external_bkm_url", sa.String(), nullable=True))
        batch_op.create_foreign_key(
            "fk_far_mitigations_knowledge_bkm_id_knowledge_entries",
            "knowledge_entries",
            ["knowledge_bkm_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade():
    with op.batch_alter_table("far_mitigations") as batch_op:
        batch_op.drop_constraint(
            "fk_far_mitigations_knowledge_bkm_id_knowledge_entries",
            type_="foreignkey",
        )
        batch_op.drop_column("external_bkm_url")
        batch_op.drop_column("knowledge_bkm_id")
