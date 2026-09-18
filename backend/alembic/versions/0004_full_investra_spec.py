"""Full INVESTRA spec upgrade: police_stations table, user/case/entity/audit_log enhancements."""
from alembic import op
import sqlalchemy as sa

revision = "0004_full_spec"
down_revision = "0003_case_workflow"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. police_stations table
    if "police_stations" not in tables:
        op.create_table(
            "police_stations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(), unique=True, nullable=False),
            sa.Column("code", sa.String(), unique=True, nullable=False),
            sa.Column("district", sa.String(), nullable=False),
            sa.Column("state", sa.String(), server_default="West Bengal", nullable=False),
            sa.Column("address", sa.String(), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("contact", sa.String(), nullable=True),
            sa.Column("status", sa.String(), server_default="ACTIVE", nullable=False),
            sa.Column("jurisdiction", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True)
        )

    # 2. users table
    user_cols = {col["name"] for col in inspector.get_columns("users")}
    with op.batch_alter_table("users") as batch:
        if "phone" not in user_cols:
            batch.add_column(sa.Column("phone", sa.String(), nullable=True))
        if "station_id" not in user_cols:
            batch.add_column(sa.Column("station_id", sa.Integer(), nullable=True))

    # 3. cases table
    case_cols = {col["name"] for col in inspector.get_columns("cases")}
    with op.batch_alter_table("cases") as batch:
        if "fir_number" not in case_cols:
            batch.add_column(sa.Column("fir_number", sa.String(), nullable=True))
        if "fir_date" not in case_cols:
            batch.add_column(sa.Column("fir_date", sa.DateTime(timezone=True), nullable=True))
        if "police_station_id" not in case_cols:
            batch.add_column(sa.Column("police_station_id", sa.Integer(), nullable=True))
        if "police_station" not in case_cols:
            batch.add_column(sa.Column("police_station", sa.String(), nullable=True))
        if "complainant_name" not in case_cols:
            batch.add_column(sa.Column("complainant_name", sa.String(), nullable=True))
        if "complainant_contact" not in case_cols:
            batch.add_column(sa.Column("complainant_contact", sa.String(), nullable=True))
        if "complainant_address" not in case_cols:
            batch.add_column(sa.Column("complainant_address", sa.String(), nullable=True))
        if "complainant_statement" not in case_cols:
            batch.add_column(sa.Column("complainant_statement", sa.Text(), nullable=True))
        if "additional_notes" not in case_cols:
            batch.add_column(sa.Column("additional_notes", sa.Text(), nullable=True))

    # 4. entities table
    entity_cols = {col["name"] for col in inspector.get_columns("entities")}
    with op.batch_alter_table("entities") as batch:
        if "role" not in entity_cols:
            batch.add_column(sa.Column("role", sa.String(), nullable=True))
        if "metadata_json" not in entity_cols:
            batch.add_column(sa.Column("metadata_json", sa.String(), nullable=True))

    # 5. relationships table
    rel_cols = {col["name"] for col in inspector.get_columns("relationships")}
    with op.batch_alter_table("relationships") as batch:
        if "case_id" not in rel_cols:
            batch.add_column(sa.Column("case_id", sa.Integer(), nullable=True))

    # 6. audit_logs table
    audit_cols = {col["name"] for col in inspector.get_columns("audit_logs")}
    with op.batch_alter_table("audit_logs") as batch:
        if "ip_address" not in audit_cols:
            batch.add_column(sa.Column("ip_address", sa.String(), nullable=True))
        if "result" not in audit_cols:
            batch.add_column(sa.Column("result", sa.String(), server_default="SUCCESS", nullable=False))

def downgrade():
    pass
