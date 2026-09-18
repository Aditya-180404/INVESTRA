from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.core.database import Base

class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    entity_type = Column(String, index=True) # PERSON, PHONE, VEHICLE, LOCATION, ORGANIZATION
    value = Column(String, index=True)
    normalized_value = Column(String, index=True)
    role = Column(String, nullable=True) # COMPLAINANT, VICTIM, SUSPECT, WITNESS, PERSON_OF_INTEREST, OTHER
    metadata_json = Column(String, nullable=True) # Additional details (e.g. vehicle reg/color, phone owner, DOB)
    confidence_score = Column(Float, default=1.0)
