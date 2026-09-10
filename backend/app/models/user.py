from sqlalchemy import Column, Integer, String, Boolean, Enum
import enum
from app.core.database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "Administrator"
    INVESTIGATOR = "Investigator"
    ANALYST = "Analyst"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(RoleEnum), default=RoleEnum.INVESTIGATOR)
    is_active = Column(Boolean, default=True)
