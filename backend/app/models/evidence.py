from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    title = Column(String)
    evidence_type = Column(String, nullable=True)   # e.g. "CCTV footage", "Physical Evidence"
    document_hash = Column(String, unique=True, index=True)
    source_type = Column(String)  # PDF, CSV, TXT, DATASET_EVIDENCE
    content_text = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    original_filename = Column(String, nullable=True)
    stored_filename = Column(String, nullable=True)  # Not unique — multiple dataset records have stored_filename=None
    mime_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    extraction_status = Column(String, nullable=False, default="PENDING")
    scan_status = Column(String, nullable=False, default="NOT_SCANNED")
    processing_status = Column(String, nullable=False, default="PENDING")
