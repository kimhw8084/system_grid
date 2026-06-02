"""add_metadata_json_to_data_flows

Revision ID: 9f2d4d0aa321
Revises: aa3d4e5f6a7b
Create Date: 2026-06-01 12:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f2d4d0aa321'
down_revision: Union[str, Sequence[str], None] = 'aa3d4e5f6a7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('data_flows', schema=None) as batch_op:
        batch_op.add_column(sa.Column('metadata_json', sa.JSON(), nullable=True, server_default='{}'))


def downgrade() -> None:
    with op.batch_alter_table('data_flows', schema=None) as batch_op:
        batch_op.drop_column('metadata_json')
