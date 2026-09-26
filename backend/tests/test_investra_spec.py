import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core import database
from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models import Base
from app.models.user import RoleEnum, User
from app.models.police_station import PoliceStation
from app.models.case import Case
from app.models.case_member import CaseMember


def setup_module():
    settings.JWT_SECRET = "test-secret-that-is-long-enough-for-safe-jwt-signing"
    settings.STORAGE_PATH = "./test-evidence-storage"
    engine = create_engine("sqlite:///./test-investra-spec.db", connect_args={"check_same_thread": False})
    database.engine = engine
    database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = database.SessionLocal()
    
    # Create stations
    st1 = PoliceStation(
        name="Salt Lake Police Station",
        code="PS-SLK-01",
        district="Bidhannagar",
        state="West Bengal",
        address="Sector I, Salt Lake",
        latitude=22.5867,
        longitude=88.4178,
        status="ACTIVE"
    )
    st2 = PoliceStation(
        name="Electronics Complex Police Station",
        code="PS-ELC-02",
        district="Bidhannagar",
        state="West Bengal",
        address="Sector V, Salt Lake",
        latitude=22.5731,
        longitude=88.4332,
        status="ACTIVE"
    )
    db.add_all([st1, st2])
    db.flush()

    # Create users
    admin = User(username="admin_user", email="admin@example.com", badge_number="ADM-001",
                 full_name="Chief Admin", hashed_password=hash_password("AdminSecurePassword123!"),
                 role=RoleEnum.ADMIN, is_active=True)
    officer = User(username="officer_das", email="das@example.com", badge_number="POL-1001",
                   full_name="Inspector Arjun Das", rank="Inspector", station_name="Salt Lake Police Station",
                   station_id=st1.id, hashed_password=hash_password("OfficerSecurePassword123!"),
                   role=RoleEnum.OFFICER, is_active=True)
    inactive_officer = User(username="officer_inactive", email="inactive@example.com", badge_number="POL-9999",
                            full_name="Inactive Cop", rank="Sub-Inspector", station_name="Salt Lake Police Station",
                            station_id=st1.id, hashed_password=hash_password("OfficerSecurePassword123!"),
                            role=RoleEnum.OFFICER, is_active=False)
    
    db.add_all([admin, officer, inactive_officer])
    db.commit()
    db.close()


def get_token(client, username, password, route="/api/auth/login"):
    res = client.post(route, json={"username": username, "password": password})
    return res


def test_auth_separation_and_inactive_rejection():
    client = TestClient(app)

    # 1. Admin login at /admin/login succeeds
    admin_res = client.post("/api/auth/admin/login", json={"username": "admin_user", "password": "AdminSecurePassword123!"})
    assert admin_res.status_code == 200
    admin_token = admin_res.json()["access_token"]

    # 2. Officer login at /admin/login fails with 403
    off_at_admin = client.post("/api/auth/admin/login", json={"username": "officer_das", "password": "OfficerSecurePassword123!"})
    assert off_at_admin.status_code == 403

    # 3. Police login at /police/login succeeds
    police_res = client.post("/api/auth/police/login", json={"username": "officer_das", "password": "OfficerSecurePassword123!"})
    assert police_res.status_code == 200

    # 4. Admin login at /police/login fails with 403
    adm_at_police = client.post("/api/auth/police/login", json={"username": "admin_user", "password": "AdminSecurePassword123!"})
    assert adm_at_police.status_code == 403

    # 5. Inactive officer login rejected with 403
    inactive_res = client.post("/api/auth/police/login", json={"username": "officer_inactive", "password": "OfficerSecurePassword123!"})
    assert inactive_res.status_code == 403


def test_admin_station_and_officer_management():
    client = TestClient(app)
    admin_token = client.post("/api/auth/admin/login", json={"username": "admin_user", "password": "AdminSecurePassword123!"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create Station
    new_station = client.post("/api/stations/", headers=admin_headers, json={
        "name": "Bidhannagar South PS",
        "code": "PS-BNS-06",
        "district": "Bidhannagar",
        "state": "West Bengal",
        "address": "Sector IV, Bidhannagar",
        "latitude": 22.5690,
        "longitude": 88.4050,
        "contact": "+91 33 2345 6789",
        "status": "ACTIVE",
        "jurisdiction": "Sector IV"
    })
    assert new_station.status_code == 201
    station_id = new_station.json()["id"]

    # List Stations
    stations_list = client.get("/api/stations/", headers=admin_headers)
    assert stations_list.status_code == 200
    assert any(s["code"] == "PS-BNS-06" for s in stations_list.json())

    # Create Police Officer
    new_officer = client.post("/api/auth/admin/officers", headers=admin_headers, json={
        "full_name": "Sub-Inspector Priya Roy",
        "badge_number": "POL-2042",
        "username": "priya_roy",
        "email": "priya@example.com",
        "phone": "+91 98300 12345",
        "rank": "Sub-Inspector",
        "station_id": station_id,
        "password": "RoySecurePassword2026!",
        "status": "ACTIVE"
    })
    assert new_officer.status_code == 201
    officer_id = new_officer.json()["id"]

    # Deactivate & Reactivate Officer
    deact = client.post(f"/api/auth/admin/officers/{officer_id}/deactivate", headers=admin_headers)
    assert deact.status_code == 200
    assert deact.json()["is_active"] is False

    # Inactive officer cannot log in
    off_login = client.post("/api/auth/police/login", json={"username": "priya_roy", "password": "RoySecurePassword2026!"})
    assert off_login.status_code == 403

    # Reactivate
    react = client.post(f"/api/auth/admin/officers/{officer_id}/activate", headers=admin_headers)
    assert react.status_code == 200
    assert react.json()["is_active"] is True

    # Password Reset
    pw_reset = client.post(f"/api/auth/admin/officers/{officer_id}/reset-password", headers=admin_headers, json={
        "new_password": "NewRoyPassword2026!"
    })
    assert pw_reset.status_code == 200

    # Login with new password
    off_login_new = client.post("/api/auth/police/login", json={"username": "priya_roy", "password": "NewRoyPassword2026!"})
    assert off_login_new.status_code == 200


def test_fir_creation_and_investigation_workspace():
    client = TestClient(app)
    officer_token = client.post("/api/auth/police/login", json={"username": "officer_das", "password": "OfficerSecurePassword123!"}).json()["access_token"]
    h = {"Authorization": f"Bearer {officer_token}"}

    # 1. Create FIR/Case with 8-step structured fields
    case_payload = {
        "case_number": "CASE-2026-WB-099",
        "fir_number": "FIR-2026-099",
        "title": "Unauthorized Corporate Server Intrusion",
        "crime_type": "Cybercrime",
        "description": "Exfiltration of customer records detected from Sector V data center server rack.",
        "incident_location": "Sector V Webel Tower, Salt Lake",
        "district": "Bidhannagar",
        "latitude": 22.5731,
        "longitude": 88.4332,
        "priority": "HIGH",
        "status": "OPEN",
        "complainant_name": "Dr. Subhash Chandra",
        "complainant_contact": "+91 98311 55667",
        "complainant_address": "Salt Lake Sector V, Kolkata",
        "complainant_statement": "Server integrity alerts fired at 02:40 AM with foreign IP intrusion.",
        "entities": [
            {
                "entity_type": "PERSON",
                "value": "Rohan Sen",
                "role": "SUSPECT",
                "metadata": {"alias": "Ghost", "notes": "Former network contractor"}
            },
            {
                "entity_type": "PHONE",
                "value": "+91 98765 43210",
                "role": "OTHER",
                "metadata": {"owner": "Unknown SIM"}
            },
            {
                "entity_type": "VEHICLE",
                "value": "WB-02-AK-9988",
                "role": "OTHER",
                "metadata": {"color": "Dark Blue", "type": "Sedan"}
            }
        ]
    }
    create_res = client.post("/api/cases/", headers=h, json=case_payload)
    assert create_res.status_code == 200
    case_id = create_res.json()["id"]

    # 2. Get Case Workspace Detail
    detail_res = client.get(f"/api/cases/{case_id}", headers=h)
    assert detail_res.status_code == 200
    c_data = detail_res.json()
    assert c_data["case"]["fir_number"] == "FIR-2026-099"
    assert c_data["case"]["complainant_name"] == "Dr. Subhash Chandra"
    assert len(c_data["entities"]) >= 3

    # 3. Add Manual Relationship
    entities = c_data["entities"]
    p_entity = next(e for e in entities if e["value"] == "Rohan Sen")
    ph_entity = next(e for e in entities if e["value"] == "+91 98765 43210")
    rel_res = client.post(f"/api/cases/{case_id}/relationships", headers=h, json={
        "source_entity_id": p_entity["id"],
        "target_entity_id": ph_entity["id"],
        "relationship_type": "USED_DEVICE",
        "confidence": 0.95
    })
    assert rel_res.status_code == 201

    # 4. Check Graph API
    graph_res = client.get(f"/api/cases/{case_id}/graph", headers=h)
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert len(graph["nodes"]) >= 3
    assert len(graph["edges"]) >= 1

    # 5. Check Timeline API (Distinguishing SYSTEM vs INVESTIGATION)
    timeline_res = client.get(f"/api/cases/{case_id}/timeline", headers=h)
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert len(timeline) >= 1
    assert any(t["category"] == "INVESTIGATION" for t in timeline)

    # 6. Check Report Generation
    report_res = client.get(f"/api/cases/{case_id}/report", headers=h)
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["case_number"] == "CASE-2026-WB-099"
    assert "Rohan Sen" in report["suspects"]
    assert report["verification_status"] == "AUTHENTICATED BY INVESTIGATOR"

    # 7. Check Admin Stats
    admin_token = client.post("/api/auth/admin/login", json={"username": "admin_user", "password": "AdminSecurePassword123!"}).json()["access_token"]
    stats_res = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_cases"] >= 1
    assert stats["active_officers"] >= 2
