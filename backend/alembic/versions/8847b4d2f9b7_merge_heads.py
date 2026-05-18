"""merge heads

Revision ID: 8847b4d2f9b7
Revises: 6483543c6234, 8dbb85b0243e
Create Date: 2026-05-18 10:44:13.168969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8847b4d2f9b7'
down_revision: Union[str, Sequence[str], None] = ('6483543c6234', '8dbb85b0243e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
