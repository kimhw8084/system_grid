"""add_metadata_json_to_external_entities

Revision ID: 5ff12d0da4c3
Revises: d16649b5c596
Create Date: 2026-04-13 13:41:28.888754

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5ff12d0da4c3'
down_revision: Union[str, Sequence[str], None] = 'd16649b5c596'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('external_entities', sa.Column('metadata_json', sa.JSON(), nullable=True, server_default='{}'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('external_entities', 'metadata_json')
