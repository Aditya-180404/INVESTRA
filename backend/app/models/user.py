from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "Administrator"
    OFFICER = "Police Officer"
    INVESTIGATOR = "Investigator"
    ANALYST = "Analyst"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    badge_number = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    rank = Column(String, default="Investigating Officer")
    station_name = Column(String, default="Salt Lake Police Station")
    station_id = Column(Integer, nullable=True) # Foreign key / link to PoliceStation
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.OFFICER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
