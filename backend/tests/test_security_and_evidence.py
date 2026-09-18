import io
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core import database
from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models import Base
from app.models.user import RoleEnum, User


def setup_module():
    settings.JWT_SECRET = "test-secret-that-is-long-enough-for-safe-jwt-signing"
    settings.STORAGE_PATH = "./test-evidence-storage"
    engine = create_engine("sqlite:///./test-investra.db", connect_args={"check_same_thread": False})
    database.engine = engine
    database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
    db = database.SessionLocal()
    db.add_all([
        User(username="admin", email="admin@example.com", badge_number="A-1", full_name="Admin", hashed_password=hash_password("A-secure-password"), role=RoleEnum.ADMIN),
        User(username="officer", email="officer@example.com", badge_number="O-1", full_name="Officer", hashed_password=hash_password("O-secure-password"), role=RoleEnum.OFFICER),
        User(username="other", email="other@example.com", badge_number="O-2", full_name="Other", hashed_password=hash_password("P-secure-password"), role=RoleEnum.OFFICER),
    ]); db.commit(); db.close()


def teardown_module():
    # Windows keeps SQLite's file handle until process shutdown; test artefacts are gitignored.
    pass


def token(client, username, password):
    return client.post("/api/auth/login", json={"username": username, "password": password}).json()["access_token"]


def test_rbac_case_and_persisted_upload(monkeypatch):
    monkeypatch.setattr("app.api.documents.index_evidence", lambda db, evidence: None)
    client = TestClient(app)
    officer = token(client, "officer", "O-secure-password")
    other = token(client, "other", "P-secure-password")
    admin = token(client, "admin", "A-secure-password")
    h = {"Authorization": f"Bearer {officer}"}
    created = client.post("/api/cases/", headers=h, json={"case_number": "TEST-1", "title": "Secure test case"})
    assert created.status_code == 200
    case_id = created.json()["id"]
    assert client.get(f"/api/cases/{case_id}", headers={"Authorization": f"Bearer {other}"}).status_code == 403
    assert client.get("/api/auth/admin/officers", headers=h).status_code == 403
    assert client.get("/api/auth/admin/officers", headers={"Authorization": f"Bearer {admin}"}).status_code == 200
    upload = client.post("/api/documents/upload", headers=h, data={"case_id": str(case_id)}, files={"file": ("statement.txt", b"Alice Example called 9876543210", "text/plain")})
    assert upload.status_code == 201
    evidence_id = upload.json()["evidence_id"]
    assert client.get(f"/api/documents/{evidence_id}/download", headers={"Authorization": f"Bearer {other}"}).status_code == 403
    download = client.get(f"/api/documents/{evidence_id}/download", headers=h)
    assert download.status_code == 200 and download.content.startswith(b"Alice")
