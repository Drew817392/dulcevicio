"""add_imagen_url_to_productos

Revision ID: 7a891e4f3a12
Revises: 5f885265fc53
Create Date: 2026-09-22 12:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a891e4f3a12'
down_revision: Union[str, Sequence[str], None] = '5f885265fc53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('productos', sa.Column('imagen_url', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('productos', 'imagen_url')
