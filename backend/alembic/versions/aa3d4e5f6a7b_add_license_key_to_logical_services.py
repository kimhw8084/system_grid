"""add_license_key_to_logical_services

Revision ID: aa3d4e5f6a7b
Revises: f3b4e2f663c9
Create Date: 2026-05-31 14:18:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa3d4e5f6a7b'
down_revision: Union[str, Sequence[str], None] = 'f3b4e2f663c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('logical_services', schema=None) as batch_op:
        batch_op.add_column(sa.Column('license_key', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('logical_services', schema=None) as batch_op:
        batch_op.drop_column('license_key')
