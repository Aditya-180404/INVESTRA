from pydantic import BaseModel
from typing import Optional

class RelationshipBase(BaseModel):
    source_entity_id: int
    target_entity_id: int
    relationship_type: str

class RelationshipCreate(RelationshipBase):
    evidence_id: Optional[int] = None
    confidence: Optional[float] = 1.0

class RelationshipResponse(RelationshipBase):
    id: int
    evidence_id: Optional[int]
    confidence: float
    verification_status: str

    class Config:
        from_attributes = True
