"""add logic_json and traces_json columns

Revision ID: 8f60472be553
Revises: e8a537d7e66c
Create Date: 2026-05-01 09:10:55.943823

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f60472be553'
down_revision: Union[str, Sequence[str], None] = 'e8a537d7e66c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('devices', sa.Column('logic_json', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('logical_services', sa.Column('logic_json', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('data_flows', sa.Column('traces_json', sa.JSON(), nullable=True, server_default='[]'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('data_flows', 'traces_json')
    op.drop_column('logical_services', 'logic_json')
    op.drop_column('devices', 'logic_json')
