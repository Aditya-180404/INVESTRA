from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.core.database import Base

class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    entity_type = Column(String, index=True) # PERSON, PHONE, VEHICLE, LOCATION
    value = Column(String, index=True)
    normalized_value = Column(String, index=True)
    confidence_score = Column(Float, default=1.0)
