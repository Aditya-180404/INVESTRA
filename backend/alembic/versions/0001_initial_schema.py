"""Initial INVESTRA schema.

This migration creates the SQLAlchemy schema once; application startup never mutates schema.
"""
from alembic import op
from app.core.database import Base
from app.models import case, case_member, coordination, document_chunk, entity, evidence, relationship, user

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql": op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=bind)
def downgrade():
    Base.metadata.drop_all(bind=op.get_bind())
