"""add is_admin to operators

Revision ID: 6483543c6234
Revises: fd2f8a526cfe
Create Date: 2026-05-18 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6483543c6234'
down_revision = 'fd2f8a526cfe'
branch_labels = None
depends_on = None


def upgrade():
    # Check if column exists first for safety
    conn = op.get_bind()
    columns = [c['name'] for c in sa.inspect(conn).get_columns('operators')]
    if 'is_admin' not in columns:
        op.add_column('operators', sa.Column('is_admin', sa.Boolean(), server_default='0', nullable=False))


def downgrade():
    op.drop_column('operators', 'is_admin')
