from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.core.database import Base

class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Integer, primary_key=True, index=True)
    source_entity_id = Column(Integer, ForeignKey("entities.id"))
    target_entity_id = Column(Integer, ForeignKey("entities.id"))
    relationship_type = Column(String) # CALLED, MET, OWNED
    evidence_id = Column(Integer, ForeignKey("evidence.id"))
    confidence = Column(Float, default=1.0)
    verification_status = Column(String, default="UNREVIEWED")
