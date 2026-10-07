"""add provider accept reject booking states

Revision ID: 8afe3407cd5f
Revises: 132b3822e140
Create Date: 2026-08-23 08:13:01.082147

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8afe3407cd5f'
down_revision: Union[str, None] = '132b3822e140'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('bookings') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.VARCHAR(length=9),
            type_=sa.Enum(
                'awaiting_provider', 'confirmed', 'rejected', 'expired', 'completed',
                'cancelled', name='bookingstatus',
            ),
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table('bookings') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.Enum(
                'awaiting_provider', 'confirmed', 'rejected', 'expired', 'completed',
                'cancelled', name='bookingstatus',
            ),
            type_=sa.VARCHAR(length=9),
            existing_nullable=False,
        )
