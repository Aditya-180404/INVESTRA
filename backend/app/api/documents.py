import hashlib
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.case import Case
from app.models.coordination import AuditLog
from app.models.entity import Entity
from app.models.evidence import Evidence
from app.services.extraction import extract_entities

router = APIRouter(dependencies=[Depends(get_current_user)])


def extract_text_from_bytes(content: bytes, filename: str) -> str:
    """
    Extracts readable text from uploaded case files.
    Supports PDF (via PyMuPDF if available, or text extraction), TXT, CSV, LOG, and JSON.
    """
    filename_lower = filename.lower()

    if filename_lower.endswith(".pdf"):
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            if text.strip():
                return text
        except Exception:
            pass

        # Robust binary stream string extraction fallback for PDF
        text_matches = re.findall(rb"[\x20-\x7E\t\n\r]{4,}", content)
        extracted = "\n".join(m.decode("latin-1", errors="ignore") for m in text_matches)
        return extracted if extracted.strip() else "PDF binary content recorded."

    # Standard text encodings
    for encoding in ("utf-8", "latin-1", "utf-16", "ascii"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue

    return content.decode("utf-8", errors="replace")


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    case_id: int = Form(...),
    officer_badge: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a case file (FIR copy, witness statement, forensic report, vehicle seizure memo).
    Computes SHA-256 chain-of-custody hash, extracts entities, and stores evidence in PostgreSQL.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case reference not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    doc_hash = hashlib.sha256(content).hexdigest()
    text = extract_text_from_bytes(content, file.filename)
    source_type = file.filename.split(".")[-1].upper() if "." in file.filename else "DOC"

    # Check for duplicate file
    existing = db.query(Evidence).filter(Evidence.document_hash == doc_hash).first()
    if existing:
        return {
            "message": f"Document '{file.filename}' already recorded in case evidence chain.",
            "evidence_id": existing.id,
            "document_hash": doc_hash,
            "entities_extracted": 0,
            "entities": []
        }

    new_evidence = Evidence(
        case_id=case_id,
        title=file.filename,
        document_hash=doc_hash,
        source_type=source_type,
        content_text=text,
        uploaded_by=None
    )
    db.add(new_evidence)
    db.flush()

    # Agent 1 — Case Information Extraction Agent
    extracted = extract_entities(text)
    saved_entities = []

    for item in extracted:
        val = item["value"].strip()
        # Avoid duplicate entity for same case
        exists = db.query(Entity).filter(
            Entity.case_id == case_id,
            Entity.entity_type == item["type"],
            Entity.value == val
        ).first()

        if not exists:
            ent = Entity(
                case_id=case_id,
                entity_type=item["type"],
                value=val,
                normalized_value=item.get("normalized_value", val.upper()),
                confidence_score=item.get("confidence", 0.85)
            )
            db.add(ent)
            saved_entities.append(item)

    # Record Audit Log
    actor_label = officer_badge or case.created_by_officer or "Investigating Officer"
    db.add(AuditLog(
        case_id=case_id,
        action="EVIDENCE_FILE_UPLOADED",
        detail=f"Uploaded '{file.filename}' (SHA-256: {doc_hash[:12]}...); extracted {len(saved_entities)} new entities.",
        actor=actor_label
    ))

    db.commit()
    db.refresh(new_evidence)

    return {
        "message": f"File '{file.filename}' processed successfully.",
        "evidence_id": new_evidence.id,
        "document_hash": doc_hash,
        "entities_extracted": len(saved_entities),
        "entities": saved_entities
    }


@router.get("/case/{case_id}")
def get_case_documents(case_id: int, db: Session = Depends(get_db)):
    """
    Lists all evidence and case files uploaded for this case with integrity hashes.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    items = db.query(Evidence).filter(Evidence.case_id == case_id).order_by(Evidence.uploaded_at.desc()).all()
    return [
        {
            "id": ev.id,
            "title": ev.title,
            "source_type": ev.source_type,
            "document_hash": ev.document_hash,
            "uploaded_at": ev.uploaded_at,
            "preview": ev.content_text[:180] + ("..." if len(ev.content_text or "") > 180 else "")
        }
        for ev in items
    ]
