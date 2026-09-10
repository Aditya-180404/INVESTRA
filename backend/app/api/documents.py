from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import hashlib
import fitz  # PyMuPDF
from typing import List

from app.core.database import get_db
from app.models.evidence import Evidence
from app.models.entity import Entity
from app.services.extraction import extract_entities

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    case_id: int = Form(...),
    db: Session = Depends(get_db)
):
    # 1. Read file content
    content = await file.read()
    
    # 2. Extract Text based on file type
    text = ""
    if file.filename.endswith(".pdf"):
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                text += page.get_text()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    else:
        # Assume text/csv
        try:
            text = content.decode("utf-8")
        except:
            raise HTTPException(status_code=400, detail="Only UTF-8 text or PDF files are supported currently.")
            
    # 3. Hash for integrity
    doc_hash = hashlib.sha256(content).hexdigest()
    
    # Check if already exists
    existing = db.query(Evidence).filter(Evidence.document_hash == doc_hash).first()
    if existing:
         return {"message": "Document already uploaded", "evidence_id": existing.id}
         
    # 4. Save Evidence
    new_evidence = Evidence(
        case_id=case_id,
        title=file.filename,
        document_hash=doc_hash,
        source_type=file.filename.split(".")[-1].upper(),
        content_text=text,
        uploaded_by=1 # Mock user for MVP
    )
    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)
    
    # 5. Extract Entities
    extracted = extract_entities(text)
    saved_entities = []
    
    for item in extracted:
        ent = Entity(
            case_id=case_id,
            entity_type=item["type"],
            value=item["value"],
            normalized_value=item.get("normalized_value"),
            confidence_score=item.get("confidence", 1.0)
        )
        db.add(ent)
        saved_entities.append(item)
        
    db.commit()
    
    return {
        "message": "Document processed successfully", 
        "evidence_id": new_evidence.id,
        "entities_extracted": len(saved_entities),
        "entities": saved_entities
    }
