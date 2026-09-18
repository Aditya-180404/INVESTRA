import pytest
import os
import json
from fastapi.testclient import TestClient
from app.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core import database
from app.models import Base
from app.models.user import User, RoleEnum
from app.models.police_station import PoliceStation
from app.models.case import Case
from app.models.entity import Entity
from app.models.evidence import Evidence
from app.models.timeline import TimelineEvent
from app.models.case_member import CaseMember
from app.models.relationship import Relationship
from app.models.document_chunk import DocumentChunk
from app.core.config import settings
from app.core.security import hash_password

client = TestClient(app)

DATASET_CSV_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "dataset", "INVESTRA_Kolkata_Synthetic_Crime_Dataset.csv")
)

def setup_module():
    settings.JWT_SECRET = "test-secret-that-is-long-enough-for-safe-jwt-signing"
    settings.STORAGE_PATH = "./test-evidence-storage"
    db_file = "./test-investra-dataset.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    database.engine = engine
    database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(engine)

    def override_get_db():
        db = database.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[database.get_db] = override_get_db

    # Clean wipe all tables so import starts with empty database
    clean_db = database.SessionLocal()
    try:
        clean_db.query(DocumentChunk).delete()
        clean_db.query(TimelineEvent).delete()
        clean_db.query(Relationship).delete()
        clean_db.query(Entity).delete()
        clean_db.query(Evidence).delete()
        clean_db.query(CaseMember).delete()
        clean_db.query(Case).delete()
        clean_db.commit()
    finally:
        clean_db.close()

@pytest.fixture(scope="module")
def setup_admin_and_police():
    db = database.SessionLocal()
    try:
        # Create test admin if not exists
        admin = db.query(User).filter(User.username == "audit_admin").first()
        if not admin:
            admin = User(
                username="audit_admin",
                email="audit_admin@investra.gov.in",
                hashed_password=hash_password("AdminPass123!"),
                role=RoleEnum.ADMIN,
                full_name="Audit Administrator",
                is_active=True
            )
            db.add(admin)

        # Create test police officer
        officer = db.query(User).filter(User.username == "audit_officer").first()
        if not officer:
            officer = User(
                username="audit_officer",
                email="audit_officer@kolkatapolice.gov.in",
                hashed_password=hash_password("OfficerPass123!"),
                role=RoleEnum.OFFICER,
                full_name="Inspector Audit Roy",
                badge_number="KPD-9988",
                is_active=True
            )
            db.add(officer)

        db.commit()
    finally:
        db.close()

    # Login Admin
    admin_login = client.post("/api/auth/admin/login", json={
        "username": "audit_admin",
        "password": "AdminPass123!"
    })
    admin_token = admin_login.json()["access_token"]

    # Login Police
    police_login = client.post("/api/auth/police/login", json={
        "username": "audit_officer",
        "password": "OfficerPass123!"
    })
    police_token = police_login.json()["access_token"]

    return {
        "admin_token": admin_token,
        "police_token": police_token
    }


def test_dataset_validation_api(setup_admin_and_police):
    admin_headers = {"Authorization": f"Bearer {setup_admin_and_police['admin_token']}"}
    
    # 1. Validate dataset via Admin API
    response = client.post(
        "/api/admin/dataset/validate",
        json={"file_path": DATASET_CSV_PATH},
        headers=admin_headers
    )
    assert response.status_code == 200, response.text
    val_data = response.json()
    assert val_data["valid"] is True
    assert val_data["total_rows"] == 15
    assert val_data["valid_rows"] == 15
    assert val_data["invalid_rows"] == 0
    assert len(val_data["preview"]) >= 5
    assert len(val_data["stations_found"]) >= 10
    assert len(val_data["officers_found"]) >= 10


def test_dataset_import_and_relational_mapping(setup_admin_and_police):
    admin_headers = {"Authorization": f"Bearer {setup_admin_and_police['admin_token']}"}
    
    # 1. Execute Dataset Import
    response = client.post(
        "/api/admin/dataset/import",
        json={"file_path": DATASET_CSV_PATH, "auto_create_officers": True, "auto_create_stations": True},
        headers=admin_headers
    )
    assert response.status_code == 200, response.text
    res = response.json()
    assert res["summary"]["imported_records"] == 15, f"DEBUG RES: {res}"
    assert res["summary"]["failed_records"] == 0
    assert res["summary"]["cases_created"] == 15
    assert res["summary"]["evidence_created"] == 44
    assert res["summary"]["timeline_events_created"] >= 90
    assert res["summary"]["rag_documents_created"] == 15

    # 2. Verify Database Relational Integrity
    db = database.SessionLocal()
    try:
        # Check Stations
        stations = db.query(PoliceStation).all()
        assert len(stations) >= 10
        station_names = [s.name for s in stations]
        assert "Park Street Police Station" in station_names
        assert "Shakespeare Sarani Police Station" in station_names
        assert "Alipore Police Station" in station_names

        # Check Specific Case: KOL-2026-001
        case_1 = db.query(Case).filter(Case.case_number == "KOL-2026-001").first()
        assert case_1 is not None
        assert case_1.fir_number == "KOL-2026-001"
        assert case_1.crime_type == "Mobile phone theft"
        assert case_1.status == "CLOSED"
        assert case_1.source_dataset == "INVESTRA_Kolkata_Synthetic_Crime_Dataset.csv"
        assert case_1.police_station == "Park Street Police Station"

        # Check Entities for KOL-2026-001
        entities = db.query(Entity).filter(Entity.case_id == case_1.id).all()
        entity_roles = {e.value: e.role for e in entities}
        assert "Rahul Das" in entity_roles
        assert entity_roles["Rahul Das"] == "SUSPECT"
        assert "Suman Roy" in entity_roles
        assert entity_roles["Suman Roy"] == "SUSPECT"
        assert "Priya Sen" in entity_roles
        assert entity_roles["Priya Sen"] == "WITNESS"
        assert "Arindam Paul" in entity_roles
        assert entity_roles["Arindam Paul"] == "WITNESS"

        # Check Evidence for KOL-2026-001
        evidences = db.query(Evidence).filter(Evidence.case_id == case_1.id).all()
        assert len(evidences) == 3
        ev_types = [e.evidence_type for e in evidences]
        assert "CCTV footage" in ev_types
        assert "Recovered mobile phone" in ev_types
        # Confirm dataset evidence does not pretend to have a fake physical file
        for ev in evidences:
            assert ev.processing_status == "DATASET_RECORDED"
            assert ev.stored_filename is None or ev.stored_filename == ""

        # Check Timeline for KOL-2026-001
        events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_1.id).order_by(TimelineEvent.event_date.asc()).all()
        assert len(events) == 8
        event_titles = [e.event_title for e in events]
        assert "Incident" in event_titles
        assert "Case Report" in event_titles
        assert "Evidence Collection" in event_titles
        assert "Witness Interview" in event_titles
        assert "Suspect Identification" in event_titles
        assert "Suspect Interview" in event_titles
        assert "Evidence Recovery" in event_titles
        assert "Case Closure" in event_titles

        # Check RAG Chunks
        chunks = db.query(DocumentChunk).filter(DocumentChunk.case_id == case_1.id).all()
        assert len(chunks) >= 3

    finally:
        db.close()


def test_idempotent_import_duplicate_prevention(setup_admin_and_police):
    admin_headers = {"Authorization": f"Bearer {setup_admin_and_police['admin_token']}"}
    
    # Re-running import should not create duplicate cases
    response = client.post(
        "/api/admin/dataset/import",
        json={"file_path": DATASET_CSV_PATH},
        headers=admin_headers
    )
    assert response.status_code == 200
    res = response.json()
    assert res["summary"]["imported_records"] == 0
    assert res["summary"]["skipped_records"] == 15
    assert res["summary"]["duplicate_cases"] == 15


def test_multi_field_search_across_dataset(setup_admin_and_police):
    admin_headers = {"Authorization": f"Bearer {setup_admin_and_police['admin_token']}"}
    
    # 1. Search by Case Number
    r1 = client.get("/api/cases/?q=KOL-2026-001", headers=admin_headers)
    assert r1.status_code == 200
    assert len(r1.json()) >= 1
    assert r1.json()[0]["case_number"] == "KOL-2026-001"

    # 2. Search by Suspect Name
    r2 = client.get("/api/cases/?q=Rahul Das", headers=admin_headers)
    assert r2.status_code == 200
    assert len(r2.json()) >= 1
    assert any(c["case_number"] == "KOL-2026-001" for c in r2.json())

    # 3. Search by Witness Name
    r3 = client.get("/api/cases/?q=Priya Sen", headers=admin_headers)
    assert r3.status_code == 200
    assert len(r3.json()) >= 1

    # 4. Search by Evidence Type
    r4 = client.get("/api/cases/?q=Crowbar", headers=admin_headers)
    assert r4.status_code == 200
    assert any(c["case_number"] == "KOL-2026-003" for c in r4.json())

    # 5. Search by Crime Code
    r5 = client.get("/api/cases/?q=CR-104", headers=admin_headers)
    assert r5.status_code == 200
    assert any(c["case_number"] == "KOL-2026-004" for c in r5.json())


def test_rag_assistant_single_and_cross_case(setup_admin_and_police):
    admin_headers = {"Authorization": f"Bearer {setup_admin_and_police['admin_token']}"}
    
    # 1. Single Case Assistant Query
    db = database.SessionLocal()
    case_1 = db.query(Case).filter(Case.case_number == "KOL-2026-001").first()
    case_1_id = case_1.id
    db.close()

    r1 = client.post(
        "/api/assistant/chat",
        json={
            "case_id": case_1_id,
            "message": "What happened in case KOL-2026-001 and what evidence was recovered?"
        },
        headers=admin_headers
    )
    assert r1.status_code == 200, r1.text
    chat_resp = r1.json()
    assert "response" in chat_resp
    assert chat_resp["sources"][0]["case_number"] == "KOL-2026-001"
    assert any("INVESTRA_Kolkata_Synthetic_Crime_Dataset.csv" in (s.get("source_document") or s.get("title", "")) for s in chat_resp["sources"])

    # 2. Cross Case Assistant Query
    r2 = client.post(
        "/api/assistant/chat",
        json={
            "message": "Find cases involving CCTV footage evidence across Kolkata"
        },
        headers=admin_headers
    )
    assert r2.status_code == 200
    cross_resp = r2.json()
    assert "response" in cross_resp
    assert len(cross_resp["sources"]) >= 1


def test_admin_dashboard_stats_with_dataset(setup_admin_and_police):
    admin_headers = {"Authorization": f"Bearer {setup_admin_and_police['admin_token']}"}
    
    r = client.get("/api/admin/stats", headers=admin_headers)
    assert r.status_code == 200
    stats = r.json()
    assert stats["total_cases"] >= 15
    assert stats["closed_cases"] >= 6
    assert stats["under_investigation"] >= 8
    assert stats["total_evidence"] >= 44
    assert stats["total_officers"] >= 10
    assert stats["total_stations"] >= 10
