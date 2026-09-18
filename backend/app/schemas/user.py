from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import RoleEnum

class UserBase(BaseModel):
    username: str
    email: EmailStr
    badge_number: Optional[str] = None
    full_name: Optional[str] = None
    rank: Optional[str] = "Investigating Officer"
    station_name: Optional[str] = "Salt Lake Police Station"
    station_id: Optional[int] = None
    phone: Optional[str] = None
    role: Optional[RoleEnum] = RoleEnum.OFFICER

class UserCreate(UserBase):
    password: str

class OfficerCreate(BaseModel):
    badge_number: Optional[str] = None
    full_name: str
    username: str
    email: EmailStr
    phone: Optional[str] = None
    rank: str = "Investigating Officer"
    station_name: Optional[str] = "Salt Lake Police Station"
    station_id: Optional[int] = None
    password: str
    status: Optional[str] = "ACTIVE"
    role: Optional[RoleEnum] = RoleEnum.OFFICER

class OfficerPasswordReset(BaseModel):
    new_password: str

class LoginRequest(BaseModel):
    username: str # Can be username, email, or badge number
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
