from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CaseBase(BaseModel):
    case_number: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = "OPEN"

class CaseCreate(CaseBase):
    pass

class CaseResponse(CaseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
