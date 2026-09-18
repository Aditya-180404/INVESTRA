from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class EntityInCase(BaseModel):
    entity_type: str = Field(..., min_length=2, max_length=64) # PERSON, VEHICLE, PHONE, LOCATION, ORGANIZATION
    value: str = Field(..., min_length=1, max_length=512)
    role: Optional[str] = None # COMPLAINANT, VICTIM, SUSPECT, WITNESS, PERSON_OF_INTEREST, OTHER
    metadata: Optional[Dict[str, Any]] = None

class CaseBase(BaseModel):
    case_number: str = Field(..., min_length=3, max_length=80)
    fir_number: Optional[str] = None
    fir_date: Optional[datetime] = None
    title: str = Field(..., min_length=3, max_length=160)
    crime_type: Optional[str] = "Financial Fraud"
    description: Optional[str] = ""
    incident_date: Optional[datetime] = None
    incident_time: Optional[str] = None
    incident_location: Optional[str] = "Sector V, Salt Lake, Kolkata"
    district: Optional[str] = None
    latitude: Optional[float] = 22.5804
    longitude: Optional[float] = 88.4282
    status: Optional[str] = "OPEN" # DRAFT, REGISTERED, OPEN, UNDER_INVESTIGATION, ON_HOLD, SUBMITTED_FOR_REVIEW, CLOSED
    priority: Optional[str] = "MEDIUM"
    police_station_id: Optional[int] = None
    police_station: Optional[str] = None
    complainant_name: Optional[str] = None
    complainant_contact: Optional[str] = None
    complainant_address: Optional[str] = None
    complainant_statement: Optional[str] = None
    additional_notes: Optional[str] = None

class CaseCreate(CaseBase):
    entities: Optional[List[EntityInCase]] = []

    @model_validator(mode="after")
    def validate_fir_payload(self):
        # The wizard identifies a formal FIR with fir_number. Formal FIRs
        # require the same fields that the intake UI marks with an asterisk.
        if self.fir_number:
            required = {
                "complainant_name": self.complainant_name,
                "description": self.description,
                "incident_location": self.incident_location,
                "latitude": self.latitude,
                "longitude": self.longitude,
            }
            missing = [name for name, value in required.items() if value is None or (isinstance(value, str) and not value.strip())]
            if missing:
                raise ValueError(f"Required FIR fields missing: {', '.join(missing)}")
        return self

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    fir_number: Optional[str] = None
    fir_date: Optional[datetime] = None
    description: Optional[str] = None
    crime_type: Optional[str] = None
    status: Optional[str] = None # DRAFT, REGISTERED, OPEN, UNDER_INVESTIGATION, ON_HOLD, SUBMITTED_FOR_REVIEW, CLOSED
    priority: Optional[str] = None
    incident_location: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    police_station_id: Optional[int] = None
    police_station: Optional[str] = None
    complainant_name: Optional[str] = None
    complainant_contact: Optional[str] = None
    complainant_address: Optional[str] = None
    complainant_statement: Optional[str] = None
    additional_notes: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    investigator_note: Optional[str] = None

class CaseResponse(CaseBase):
    id: int
    assigned_officer_id: Optional[int] = None
    created_by_officer: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
