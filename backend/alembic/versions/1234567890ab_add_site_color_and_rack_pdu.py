"""add site color and rack pdu fields

Revision ID: 1234567890ab
Revises: 8dbb85b0243e
Create Date: 2026-05-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1234567890ab'
down_revision = '8847b4d2f9b7'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('sites', sa.Column('color', sa.String(), server_default='#3b82f6'))
    op.add_column('racks', sa.Column('pdu_a_cap_kw', sa.Float(), server_default='10.0'))
    op.add_column('racks', sa.Column('pdu_b_cap_kw', sa.Float(), server_default='10.0'))
    op.add_column('racks', sa.Column('pdu_a_name', sa.String(), server_default='PDU-A'))
    op.add_column('racks', sa.Column('pdu_b_name', sa.String(), server_default='PDU-B'))

def downgrade():
    op.drop_column('sites', 'color')
    op.drop_column('racks', 'pdu_a_cap_kw')
    op.drop_column('racks', 'pdu_b_cap_kw')
    op.drop_column('racks', 'pdu_a_name')
    op.drop_column('racks', 'pdu_b_name')
