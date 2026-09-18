from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PoliceStationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    district: str = Field(..., min_length=2, max_length=100)
    state: str = Field(default="West Bengal", max_length=100)
    address: str = Field(..., min_length=5, max_length=500)
    latitude: float
    longitude: float
    contact: Optional[str] = None
    status: str = Field(default="ACTIVE") # ACTIVE, INACTIVE
    jurisdiction: Optional[str] = None

class PoliceStationCreate(PoliceStationBase):
    pass

class PoliceStationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact: Optional[str] = None
    status: Optional[str] = None
    jurisdiction: Optional[str] = None

class PoliceStationResponse(PoliceStationBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    officers_count: Optional[int] = 0

    class Config:
        from_attributes = True
