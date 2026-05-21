"""merge rack and site heads

Revision ID: 8320f53ea417
Revises: 1038b4c0ad51, 1234567890ab
Create Date: 2026-05-21 08:20:20.351956

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8320f53ea417'
down_revision: Union[str, Sequence[str], None] = ('1038b4c0ad51', '1234567890ab')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
