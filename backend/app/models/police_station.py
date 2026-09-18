from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class PoliceStation(Base):
    __tablename__ = "police_stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False) # e.g. PS-SLC-01
    district = Column(String, nullable=False)
    state = Column(String, default="West Bengal", nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact = Column(String, nullable=True) # Phone or hotline
    status = Column(String, default="ACTIVE", nullable=False) # ACTIVE, INACTIVE
    jurisdiction = Column(String, nullable=True) # Description of area covered
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
