"""Add structured case-intake fields."""
from alembic import op
import sqlalchemy as sa

revision = "0003_case_workflow"
down_revision = "0002_security_storage"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("cases")}
    with op.batch_alter_table("cases") as batch:
        if "priority" not in columns:
            batch.add_column(sa.Column("priority", sa.String(), nullable=True, server_default="MEDIUM"))
        if "district" not in columns:
            batch.add_column(sa.Column("district", sa.String(), nullable=True))
        if "incident_time" not in columns:
            batch.add_column(sa.Column("incident_time", sa.String(), nullable=True))

def downgrade():
    pass
