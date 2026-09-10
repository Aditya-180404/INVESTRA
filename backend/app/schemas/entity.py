from pydantic import BaseModel
from typing import Optional

class EntityBase(BaseModel):
    entity_type: str
    value: str
    normalized_value: Optional[str] = None

class EntityCreate(EntityBase):
    case_id: int
    confidence_score: Optional[float] = 1.0

class EntityResponse(EntityBase):
    id: int
    case_id: int
    confidence_score: float

    class Config:
        from_attributes = True
