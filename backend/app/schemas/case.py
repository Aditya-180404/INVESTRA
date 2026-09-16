from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CaseBase(BaseModel):
    case_number: str
    title: str
    crime_type: Optional[str] = "Financial Fraud"
    description: Optional[str] = ""
    incident_date: Optional[datetime] = None
    incident_location: Optional[str] = "Sector V, Salt Lake, Kolkata"
    latitude: Optional[float] = 22.5804
    longitude: Optional[float] = 88.4282
    status: Optional[str] = "OPEN"
    assigned_officer_id: Optional[int] = None
    created_by_officer: Optional[str] = "Inspector Arjun Das"

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    crime_type: Optional[str] = None
    status: Optional[str] = None # OPEN, UNDER_INVESTIGATION, ESCALATED, RESOLVED, CLOSED
    incident_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    investigator_note: Optional[str] = None

class CaseResponse(CaseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
