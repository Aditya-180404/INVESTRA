"""Access-controlled evidence storage and document ingestion."""
import hashlib
import io
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import audit, require_case_access
from app.models.case import Case
from app.models.coordination import AuditLog
from app.models.entity import Entity
from app.models.evidence import Evidence
from app.models.user import User
from app.services.extraction import extract_entities
from app.services.rag import index_evidence

router = APIRouter()
ALLOWED = {".txt": {"text/plain"}, ".pdf": {"application/pdf"}, ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}}


def extract_text(content: bytes, suffix: str) -> str:
    if suffix == ".pdf":
        import fitz
        document = fitz.open(stream=content, filetype="pdf")
        return "\n".join(page.get_text() for page in document)
    if suffix == ".docx":
        from docx import Document
        return "\n".join(p.text for p in Document(io.BytesIO(content)).paragraphs)
    return content.decode("utf-8")


@router.post("/upload", status_code=201)
async def upload_document(file: UploadFile = File(...), case_id: int = Form(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    require_case_access(case_id, db, user, write=True)
    original = Path(file.filename or "").name
    suffix = Path(original).suffix.lower()
    if not original or suffix not in ALLOWED or (file.content_type and file.content_type not in ALLOWED[suffix]):
        raise HTTPException(status_code=415, detail="Only TXT, PDF, and DOCX files are supported")
    content = await file.read(settings.MAX_UPLOAD_SIZE + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds the configured size limit")
    checksum = hashlib.sha256(content).hexdigest()
    existing = db.query(Evidence).filter(Evidence.case_id == case_id, Evidence.document_hash == checksum).first()
    if existing:
        return {"message": "Document already recorded", "evidence_id": existing.id, "document_hash": checksum, "processing_status": existing.processing_status}
    stored = f"{uuid.uuid4().hex}{suffix}"
    destination = settings.storage_root / str(case_id) / stored
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        destination.write_bytes(content)
        text = extract_text(content, suffix)
        evidence = Evidence(case_id=case_id, title=original, original_filename=original, stored_filename=stored,
                            document_hash=checksum, source_type=suffix[1:].upper(), mime_type=file.content_type,
                            file_size=len(content), content_text=text, uploaded_by=user.id, extraction_status="READY",
                            scan_status="NOT_SCANNED", processing_status="PROCESSING")
        db.add(evidence); db.flush()
        saved = 0
        for item in extract_entities(text):
            value = item["value"].strip()
            if not db.query(Entity).filter(Entity.case_id == case_id, Entity.entity_type == item["type"], Entity.value == value).first():
                db.add(Entity(case_id=case_id, entity_type=item["type"], value=value, normalized_value=item.get("normalized_value", value.upper()), confidence_score=item.get("confidence", .7))); saved += 1
        index_evidence(db, evidence)
        evidence.processing_status = "READY"
        audit(db, action="EVIDENCE_UPLOADED", actor=user, case_id=case_id, detail=f"Evidence {evidence.id}; SHA-256 {checksum}")
        db.commit(); db.refresh(evidence)
    except Exception as exc:
        if destination.exists(): destination.unlink()
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Document processing failed: {exc}")
    return {"message": "File stored and indexed", "evidence_id": evidence.id, "document_hash": checksum, "entities_extracted": saved, "processing_status": evidence.processing_status}


@router.get("/case/{case_id}")
def get_case_documents(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_case_access(case_id, db, user)
    docs = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    results = []
    for e in docs:
        uploader = db.get(User, e.uploaded_by) if e.uploaded_by else None
        chunks_count = db.query(DocumentChunk).filter(DocumentChunk.evidence_id == e.id).count()
        results.append({
            "id": e.id,
            "title": e.original_filename or e.title,
            "original_filename": e.original_filename,
            "source_type": e.source_type,
            "document_hash": e.document_hash,
            "file_size": e.file_size,
            "processing_status": e.processing_status,
            "rag_status": "INDEXED" if chunks_count > 0 else "PENDING",
            "chunks_count": chunks_count,
            "uploaded_at": e.uploaded_at,
            "uploaded_by": uploader.full_name or uploader.username if uploader else "System"
        })
    return results


@router.get("/{evidence_id}/content")
def get_document_content(evidence_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    evidence = db.get(Evidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    require_case_access(evidence.case_id, db, user)
    return {
        "id": evidence.id,
        "title": evidence.original_filename or evidence.title,
        "document_hash": evidence.document_hash,
        "content_text": evidence.content_text,
        "source_type": evidence.source_type,
        "file_size": evidence.file_size
    }


@router.post("/{evidence_id}/reindex")
def reindex_case_evidence(evidence_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    evidence = db.get(Evidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    require_case_access(evidence.case_id, db, user, write=True)
    try:
        index_evidence(db, evidence)
        evidence.processing_status = "READY"
        audit(db, action="EVIDENCE_REINDEXED", actor=user, case_id=evidence.case_id, detail=f"Evidence {evidence.id} reindexed")
        db.commit()
        return {"message": "Evidence reindexed successfully", "evidence_id": evidence.id}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reindexing failed: {exc}")


@router.get("/{evidence_id}/download")
def download_document(evidence_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    evidence = db.get(Evidence, evidence_id)
    if not evidence: raise HTTPException(status_code=404, detail="Evidence not found")
    require_case_access(evidence.case_id, db, user)
    path = settings.storage_root / str(evidence.case_id) / (evidence.stored_filename or "")
    if not path.is_file(): raise HTTPException(status_code=410, detail="Evidence file is unavailable")
    audit(db, action="EVIDENCE_DOWNLOADED", actor=user, case_id=evidence.case_id, detail=f"Evidence {evidence.id}"); db.commit()
    return FileResponse(path, media_type=evidence.mime_type or "application/octet-stream", filename=evidence.original_filename or evidence.title)
