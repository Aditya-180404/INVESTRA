"""Administrator operations: System stats, health, case assignments, and RAG dataset management."""
import os
import shutil
from pathlib import Path
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import audit, get_current_user, require_roles
from app.models.case import Case
from app.models.case_member import CaseMember
from app.models.coordination import AuditLog, InformationRequest, StationRecommendation
from app.models.document_chunk import DocumentChunk
from app.models.entity import Entity
from app.models.evidence import Evidence
from app.models.police_station import PoliceStation
from app.models.relationship import Relationship
from app.models.timeline import TimelineEvent
from app.models.user import RoleEnum, User
from app.services.rag import index_evidence

router = APIRouter(dependencies=[Depends(get_current_user), Depends(require_roles(RoleEnum.ADMIN))])


class CaseAssignmentRequest(BaseModel):
    officer_id: int
    station_id: Optional[int] = None
    permission: str = "OWNER"


@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    """Real database statistics for Administrator Dashboard. No hardcoded numbers."""
    total_officers = db.query(User).filter(User.role != RoleEnum.ADMIN).count()
    active_officers = db.query(User).filter(User.role != RoleEnum.ADMIN, User.is_active.is_(True)).count()
    inactive_officers = db.query(User).filter(User.role != RoleEnum.ADMIN, User.is_active.is_(False)).count()

    total_stations = db.query(PoliceStation).count()
    active_stations = db.query(PoliceStation).filter(PoliceStation.status == "ACTIVE").count()

    total_cases = db.query(Case).count()
    open_cases = db.query(Case).filter(Case.status.in_(["OPEN", "REGISTERED"])).count()
    under_investigation = db.query(Case).filter(Case.status == "UNDER_INVESTIGATION").count()
    closed_cases = db.query(Case).filter(Case.status.in_(["CLOSED", "RESOLVED"])).count()
    total_evidence = db.query(Evidence).count()

    pending_coordination = db.query(InformationRequest).filter(InformationRequest.status.in_(["SUBMITTED", "PENDING"])).count()

    recent_activity = [
        {
            "id": log.id,
            "timestamp": log.created_at,
            "action": log.action,
            "actor": log.actor,
            "detail": log.detail,
            "case_id": log.case_id,
            "result": log.result
        }
        for log in db.query(AuditLog).order_by(AuditLog.id.desc()).limit(10).all()
    ]

    return {
        "total_cases": total_cases,
        "open_cases": open_cases,
        "closed_cases": closed_cases,
        "under_investigation": under_investigation,
        "total_evidence": total_evidence,
        "total_officers": total_officers,
        "total_stations": total_stations,
        "pending_coordination": pending_coordination,
        "recent_activity": recent_activity,
        # Backward-compatible keys
        "total_police_officers": total_officers,
        "active_officers": active_officers,
        "inactive_officers": inactive_officers,
        "active_stations": active_stations,
        "pending_coordination_requests": pending_coordination,
        "recent_system_activity": recent_activity
    }


@router.get("/health")
def get_system_health(db: Session = Depends(get_db)):
    """Inspect status of Database, Ollama host, and Evidence storage."""
    health = {"database": "UNKNOWN", "ollama": "UNKNOWN", "storage": "UNKNOWN", "details": {}}
    
    # Check database
    try:
        db.execute(func.now())
        health["database"] = "UP"
        health["details"]["database"] = "PostgreSQL / SQLite connection active"
    except Exception as exc:
        health["database"] = "DOWN"
        health["details"]["database"] = str(exc)

    # Check storage
    try:
        storage_path = settings.storage_root
        storage_path.mkdir(parents=True, exist_ok=True)
        test_file = storage_path / ".healthcheck"
        test_file.write_text("ok")
        test_file.unlink()
        health["storage"] = "UP"
        health["details"]["storage"] = f"Directory {storage_path} writable"
    except Exception as exc:
        health["storage"] = "DOWN"
        health["details"]["storage"] = str(exc)

    # Check Ollama
    try:
        resp = httpx.get(f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags", timeout=3.0)
        if resp.status_code == 200:
            health["ollama"] = "UP"
            models = [m.get("name") for m in resp.json().get("models", [])]
            health["details"]["ollama"] = f"Connected ({len(models)} models available: {', '.join(models[:4])})"
        else:
            health["ollama"] = "DEGRADED"
            health["details"]["ollama"] = f"HTTP status {resp.status_code}"
    except Exception:
        health["ollama"] = "DOWN"
        health["details"]["ollama"] = f"Unreachable at {settings.OLLAMA_BASE_URL}"

    return health


@router.get("/cases")
def list_all_cases(
    q: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    """Admin view of all cases with member assignment details."""
    query = db.query(Case)
    if q:
        pat = f"%{q.strip()}%"
        query = query.filter((Case.case_number.ilike(pat)) | (Case.title.ilike(pat)) | (Case.fir_number.ilike(pat)))
    if status_filter:
        query = query.filter(Case.status == status_filter.upper())
    
    cases = query.order_by(Case.id.desc()).all()
    results = []
    for c in cases:
        assigned_officer = db.get(User, c.assigned_officer_id) if c.assigned_officer_id else None
        members = db.query(CaseMember).filter(CaseMember.case_id == c.id).all()
        results.append({
            "id": c.id,
            "case_number": c.case_number,
            "fir_number": c.fir_number,
            "title": c.title,
            "status": c.status,
            "priority": c.priority,
            "crime_type": c.crime_type,
            "incident_location": c.incident_location,
            "police_station": c.police_station,
            "assigned_officer": assigned_officer.full_name or assigned_officer.username if assigned_officer else None,
            "assigned_officer_id": c.assigned_officer_id,
            "members_count": len(members),
            "created_at": c.created_at
        })
    return results


@router.post("/cases/{case_id}/assign")
def assign_case_officer(
    case_id: int,
    payload: CaseAssignmentRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user)
):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    officer = db.get(User, payload.officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    case.assigned_officer_id = officer.id
    if payload.station_id:
        station = db.get(PoliceStation, payload.station_id)
        if station:
            case.police_station_id = station.id
            case.police_station = station.name

    # Ensure officer has membership
    existing_mem = db.query(CaseMember).filter(CaseMember.case_id == case_id, CaseMember.user_id == officer.id).first()
    if not existing_mem:
        db.add(CaseMember(case_id=case_id, user_id=officer.id, permission=payload.permission))
    else:
        existing_mem.permission = payload.permission

    audit(db, action="CASE_ASSIGNED", actor=admin, case_id=case.id, detail=f"Case assigned to officer {officer.username} ({officer.badge_number})")
    db.commit()
    return {"message": f"Case assigned to officer {officer.full_name or officer.username}"}


@router.delete("/cases/{case_id}/members/{user_id}")
def remove_case_member(
    case_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user)
):
    mem = db.query(CaseMember).filter(CaseMember.case_id == case_id, CaseMember.user_id == user_id).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Case member assignment not found")
    db.delete(mem)
    audit(db, action="CASE_MEMBER_REMOVED", actor=admin, case_id=case_id, detail=f"Removed user {user_id} from case")
    db.commit()
    return {"message": "Assignment removed"}


# --- RAG Dataset Management for Admin ---
@router.get("/rag/documents")
def list_rag_documents(db: Session = Depends(get_db)):
    """List documents and their chunk/embedding status for dataset management."""
    evidence_list = db.query(Evidence).order_by(Evidence.id.desc()).all()
    results = []
    for ev in evidence_list:
        chunks_count = db.query(DocumentChunk).filter(DocumentChunk.evidence_id == ev.id).count()
        embedded_count = db.query(DocumentChunk).filter(
            DocumentChunk.evidence_id == ev.id,
            DocumentChunk.embedding_json.isnot(None)
        ).count()
        results.append({
            "id": ev.id,
            "title": ev.title or ev.original_filename,
            "case_id": ev.case_id,
            "source_type": ev.source_type,
            "document_hash": ev.document_hash,
            "file_size": ev.file_size,
            "uploaded_at": ev.uploaded_at,
            "processing_status": ev.processing_status,
            "chunks_count": chunks_count,
            "embedded_chunks": embedded_count,
            "rag_ready": chunks_count > 0 and embedded_count == chunks_count
        })
    return results


@router.post("/rag/reindex/{evidence_id}")
def reindex_document(
    evidence_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user)
):
    evidence = db.get(Evidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    try:
        index_evidence(db, evidence)
        evidence.processing_status = "READY"
        audit(db, action="RAG_DOCUMENT_REINDEXED", actor=admin, case_id=evidence.case_id, detail=f"Reindexed document {evidence.id}")
        db.commit()
        return {"message": "Document re-indexed successfully", "evidence_id": evidence.id}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reindexing failed: {str(exc)}")


@router.delete("/rag/documents/{evidence_id}")
def delete_document(
    evidence_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user)
):
    evidence = db.get(Evidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    
    # Delete chunks
    db.query(DocumentChunk).filter(DocumentChunk.evidence_id == evidence.id).delete()
    
    # Delete stored file if exists
    path = settings.storage_root / str(evidence.case_id) / (evidence.stored_filename or "")
    if path.is_file():
        path.unlink(missing_ok=True)

    db.delete(evidence)
    audit(db, action="RAG_DOCUMENT_DELETED", actor=admin, case_id=evidence.case_id, detail=f"Deleted document {evidence_id}")
    db.commit()
    return {"message": "Document deleted successfully"}


# --- Synthetic Crime Dataset Import & Validation Endpoints ---
from fastapi import Request
from app.services.dataset_importer import validate_dataset_csv, import_synthetic_crime_dataset

class DatasetRequest(BaseModel):
    file_path: Optional[str] = None
    auto_create_officers: Optional[bool] = True
    auto_create_stations: Optional[bool] = True


def _resolve_dataset_content(payload_path: Optional[str]) -> str:
    """Resolve dataset CSV content from an absolute/relative path or fall back to default."""
    file_path_str = payload_path or "data/dataset/INVESTRA_Kolkata_Synthetic_Crime_Dataset.csv"
    dataset_path = Path(file_path_str)
    if not dataset_path.is_file():
        dataset_path = Path(__file__).resolve().parent.parent.parent.parent / file_path_str
    if not dataset_path.is_file():
        raise HTTPException(status_code=404, detail=f"Dataset CSV not found: {file_path_str}")
    return dataset_path.read_text(encoding="utf-8", errors="replace")


@router.post("/dataset/validate")
async def validate_dataset(
    request: Request,
    db: Session = Depends(get_db)
):
    """Validate dataset CSV. Accepts JSON body with file_path or multipart file upload."""
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        file_field = form.get("file")
        if file_field:
            content = (await file_field.read()).decode("utf-8", errors="replace")
        else:
            content = _resolve_dataset_content(None)
    else:
        try:
            body = await request.json()
            file_path = body.get("file_path") if isinstance(body, dict) else None
        except Exception:
            file_path = None
        content = _resolve_dataset_content(file_path)

    return validate_dataset_csv(content)


@router.post("/dataset/import")
async def import_dataset(
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user)
):
    """Execute complete dataset import into INVESTRA relational models & RAG index."""
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        file_field = form.get("file")
        if file_field:
            content = (await file_field.read()).decode("utf-8", errors="replace")
        else:
            content = _resolve_dataset_content(None)
    else:
        try:
            body = await request.json()
            file_path = body.get("file_path") if isinstance(body, dict) else None
        except Exception:
            file_path = None
        content = _resolve_dataset_content(file_path)

    val = validate_dataset_csv(content)
    if not val.get("valid"):
        raise HTTPException(status_code=400, detail=f"Invalid CSV structure: {val.get('error')}")

    results = import_synthetic_crime_dataset(db, content, admin)
    audit(db, action="DATASET_IMPORTED", actor=admin, detail=f"Imported {results['successfully_imported']} synthetic crime cases")
    db.commit()
    return {
        "success": True,
        "summary": {
            "total_records": results.get("total_records", 0),
            "imported_records": results.get("successfully_imported", 0),
            "failed_records": results.get("failed", 0),
            "skipped_records": results.get("skipped", 0),
            "duplicate_cases": results.get("duplicate", 0),
            "cases_created": results.get("cases_created", 0),
            "evidence_created": results.get("evidence_records_created", 0),
            "timeline_events_created": results.get("timeline_events_created", 0),
            "rag_documents_created": results.get("rag_documents", 0),
            "rag_chunks_created": results.get("rag_chunks", 0),
            **results
        },
        **results
    }


@router.get("/dataset/summary")
def get_dataset_summary(db: Session = Depends(get_db)):
    """Return status and count of imported dataset records."""
    imported_cases = db.query(Case).filter(Case.source_dataset.isnot(None)).all()
    case_ids = [c.id for c in imported_cases]
    evidence_count = db.query(Evidence).filter(Evidence.case_id.in_(case_ids)).count() if case_ids else 0
    entities_count = db.query(Entity).filter(Entity.case_id.in_(case_ids)).count() if case_ids else 0
    chunks_count = db.query(DocumentChunk).filter(DocumentChunk.case_id.in_(case_ids)).count() if case_ids else 0

    return {
        "dataset_name": "INVESTRA_Kolkata_Synthetic_Crime_Dataset.csv",
        "imported_cases_count": len(imported_cases),
        "evidence_records_count": evidence_count,
        "entities_count": entities_count,
        "rag_chunks_count": chunks_count,
        "is_imported": len(imported_cases) > 0,
        "cases": [
            {
                "id": c.id,
                "case_number": c.case_number,
                "title": c.title,
                "crime_type": c.crime_type,
                "station": c.police_station,
                "officer": c.created_by_officer,
                "status": c.status
            }
            for c in imported_cases
        ]
    }


@router.post("/dataset/rollback")
def rollback_dataset(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user)
):
    """Rollback all imported synthetic crime records safely."""
    imported_cases = db.query(Case).filter(Case.source_dataset.isnot(None)).all()
    case_ids = [c.id for c in imported_cases]
    
    if case_ids:
        db.query(DocumentChunk).filter(DocumentChunk.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(Relationship).filter(Relationship.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(Entity).filter(Entity.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(TimelineEvent).filter(TimelineEvent.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(Evidence).filter(Evidence.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(CaseMember).filter(CaseMember.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(StationRecommendation).filter(StationRecommendation.case_id.in_(case_ids)).delete(synchronize_session=False)
        db.query(Case).filter(Case.id.in_(case_ids)).delete(synchronize_session=False)

    audit(db, action="DATASET_ROLLBACK", actor=admin, detail=f"Rolled back {len(case_ids)} imported cases")
    db.commit()
    return {"message": f"Successfully rolled back {len(case_ids)} synthetic cases"}
