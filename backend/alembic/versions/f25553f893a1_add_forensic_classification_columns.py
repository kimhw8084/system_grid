"""add_forensic_classification_columns

Revision ID: f25553f893a1
Revises: 354ac7f55257
Create Date: 2026-04-17 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f25553f893a1'
down_revision = '354ac7f55257'
branch_labels = None
depends_on = None


def upgrade():
    # RcaRecord columns
    with op.batch_alter_table('rca_records', schema=None) as batch_op:
        batch_op.add_column(sa.Column('detection_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('owners', sa.JSON(), nullable=True, server_default='[]'))
        batch_op.add_column(sa.Column('incident_type', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('detection_type', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('impact_type', sa.String(), nullable=True))

    # Investigation columns
    with op.batch_alter_table('investigations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('research_domain', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('failure_domain', sa.String(), nullable=True))


def downgrade():
    with op.batch_alter_table('investigations', schema=None) as batch_op:
        batch_op.drop_column('failure_domain')
        batch_op.drop_column('research_domain')

    with op.batch_alter_table('rca_records', schema=None) as batch_op:
        batch_op.drop_column('impact_type')
        batch_op.drop_column('detection_type')
        batch_op.drop_column('incident_type')
        batch_op.drop_column('owners')
        batch_op.drop_column('detection_at')
