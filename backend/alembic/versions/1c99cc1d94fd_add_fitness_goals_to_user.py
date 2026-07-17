"""Add target_calories and target_protein to user

Revision ID: 1c99cc1d94fd
Revises: 584e466f3f55
Create Date: 2026-07-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c99cc1d94fd'
down_revision: Union[str, Sequence[str], None] = '584e466f3f55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('target_calories', sa.Float(), nullable=False, server_default='3000.0')
    )
    op.add_column(
        'users',
        sa.Column('target_protein', sa.Float(), nullable=False, server_default='110.0')
    )


def downgrade() -> None:
    op.drop_column('users', 'target_protein')
    op.drop_column('users', 'target_calories')
