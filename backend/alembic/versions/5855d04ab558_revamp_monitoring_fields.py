"""revamp_monitoring_fields

Revision ID: 5855d04ab558
Revises: 8b355eb20621
Create Date: 2026-04-09 09:26:15.263446

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5855d04ab558'
down_revision: Union[str, Sequence[str], None] = '8b355eb20621'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('monitoring_items', schema=None) as batch_op:
        batch_op.alter_column('external_link', new_column_name='monitoring_url')
        batch_op.add_column(sa.Column('notification_recipients', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('logic_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('monitoring_items', schema=None) as batch_op:
        batch_op.drop_column('logic_json')
        batch_op.drop_column('notification_recipients')
        batch_op.alter_column('monitoring_url', new_column_name='external_link')
