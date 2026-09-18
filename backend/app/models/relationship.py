from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.core.database import Base

class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), index=True, nullable=True)
    source_entity_id = Column(Integer, ForeignKey("entities.id"))
    target_entity_id = Column(Integer, ForeignKey("entities.id"))
    relationship_type = Column(String) # CALLED, MET, OWNED, ASSOCIATED_WITH, LOCATED_AT, SUSPECT_IN
    evidence_id = Column(Integer, ForeignKey("evidence.id"), nullable=True)
    confidence = Column(Float, default=1.0)
    verification_status = Column(String, default="UNREVIEWED")
