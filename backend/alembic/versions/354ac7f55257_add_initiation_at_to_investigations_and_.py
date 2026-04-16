"""add initiation_at to investigations and target_systems to rca

Revision ID: 354ac7f55257
Revises: 17a97a934a75
Create Date: 2026-04-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '354ac7f55257'
down_revision = '17a97a934a75'
branch_labels = None
depends_on = None


def upgrade():
    # Add initiation_at to investigations
    op.add_column('investigations', sa.Column('initiation_at', sa.DateTime(), nullable=True))
    
    # Add target_systems to rca_records
    op.add_column('rca_records', sa.Column('target_systems', sa.JSON(), nullable=True, server_default='[]'))


def downgrade():
    op.drop_column('rca_records', 'target_systems')
    op.drop_column('investigations', 'initiation_at')
