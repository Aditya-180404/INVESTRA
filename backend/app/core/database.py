from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine_kwargs = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL pooling config
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def migrate_sqlite_schema() -> None:
    """Apply additive migrations for local databases created by older builds.

    SQLite's ``create_all`` creates missing tables but cannot add model columns to
    existing tables. These changes are nullable/defaulted, so they preserve local
    investigation records while making the current API usable.
    """
    if engine.dialect.name != "sqlite":
        return
    additions = {
        "users": {
            "badge_number": "VARCHAR",
            "full_name": "VARCHAR",
            "rank": "VARCHAR DEFAULT 'Investigating Officer'",
            "station_name": "VARCHAR DEFAULT 'Salt Lake Police Station'",
            "created_at": "DATETIME",
        },
        "cases": {
            "crime_type": "VARCHAR DEFAULT 'Financial Fraud'",
            "incident_date": "DATETIME",
            "incident_location": "VARCHAR DEFAULT 'Sector V, Salt Lake, Kolkata'",
            "latitude": "FLOAT DEFAULT 22.5804",
            "longitude": "FLOAT DEFAULT 88.4282",
            "assigned_officer_id": "INTEGER",
            "created_by_officer": "VARCHAR DEFAULT 'Inspector Arjun Das'",
            "updated_at": "DATETIME",
        },
        "station_recommendations": {
            "latitude": "FLOAT",
            "longitude": "FLOAT",
            "distance_km": "FLOAT",
        },
    }
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        for table, columns in additions.items():
            if table not in tables:
                continue
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
