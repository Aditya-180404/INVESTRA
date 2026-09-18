from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False) # e.g. FIR-2026-104
    fir_number = Column(String, unique=True, index=True, nullable=True) # e.g. WB-SLK-2026-0042
    fir_date = Column(DateTime(timezone=True), nullable=True)
    title = Column(String, nullable=False)
    crime_type = Column(String, default="Financial Fraud") # e.g. Cybercrime, Fraud, Vehicle Theft
    crime_code = Column(String, nullable=True) # e.g. CR-101
    source_dataset = Column(String, nullable=True) # e.g. INVESTRA_Kolkata_Synthetic_Crime_Dataset.csv
    description = Column(Text, default="")
    incident_date = Column(DateTime(timezone=True), nullable=True)
    incident_location = Column(String, default="Sector V, Salt Lake, Kolkata")
    latitude = Column(Float, default=22.5804) # Kolkata Sector V default coordinate
    longitude = Column(Float, default=88.4282)
    status = Column(String, default="OPEN") # DRAFT, REGISTERED, OPEN, UNDER_INVESTIGATION, ON_HOLD, SUBMITTED_FOR_REVIEW, CLOSED
    priority = Column(String, default="MEDIUM")
    district = Column(String, nullable=True)
    incident_time = Column(String, nullable=True)
    police_station_id = Column(Integer, nullable=True)
    police_station = Column(String, nullable=True)
    complainant_name = Column(String, nullable=True)
    complainant_contact = Column(String, nullable=True)
    complainant_address = Column(String, nullable=True)
    complainant_statement = Column(Text, nullable=True)
    additional_notes = Column(Text, nullable=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_officer = Column(String, default="Inspector Arjun Das")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
