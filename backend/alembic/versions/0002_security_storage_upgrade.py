"""Upgrade installations created before secure evidence and audit fields."""
from alembic import op
import sqlalchemy as sa
from app.core.database import Base
from app.models import case_member, document_chunk

revision = "0002_security_storage"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind(); inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    Base.metadata.create_all(bind=bind, tables=[case_member.CaseMember.__table__, document_chunk.DocumentChunk.__table__])
    if "evidence" in tables:
        columns = {c["name"] for c in inspector.get_columns("evidence")}
        additions = {"original_filename": sa.String(), "stored_filename": sa.String(), "mime_type": sa.String(), "file_size": sa.Integer(), "extraction_status": sa.String(), "scan_status": sa.String(), "processing_status": sa.String()}
        with op.batch_alter_table("evidence") as batch:
            for name, column in additions.items():
                if name not in columns: batch.add_column(sa.Column(name, column, nullable=True))
    if "audit_logs" in tables:
        columns = {c["name"] for c in inspector.get_columns("audit_logs")}
        with op.batch_alter_table("audit_logs") as batch:
            if "actor_user_id" not in columns: batch.add_column(sa.Column("actor_user_id", sa.Integer(), nullable=True))
            batch.alter_column("case_id", existing_type=sa.Integer(), nullable=True)

def downgrade():
    # Deliberately non-destructive: audit/evidence migrations must not delete records.
    pass
