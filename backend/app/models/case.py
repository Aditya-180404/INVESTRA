from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False) # e.g. FIR-2026-104
    title = Column(String, nullable=False)
    crime_type = Column(String, default="Financial Fraud") # e.g. Cybercrime, Fraud, Vehicle Theft
    description = Column(Text, default="")
    incident_date = Column(DateTime(timezone=True), nullable=True)
    incident_location = Column(String, default="Sector V, Salt Lake, Kolkata")
    latitude = Column(Float, default=22.5804) # Kolkata Sector V default coordinate
    longitude = Column(Float, default=88.4282)
    status = Column(String, default="OPEN") # OPEN, UNDER_INVESTIGATION, ESCALATED, RESOLVED, CLOSED
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_officer = Column(String, default="Inspector Arjun Das")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
