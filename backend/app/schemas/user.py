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
    role: Optional[RoleEnum] = RoleEnum.OFFICER

class UserCreate(UserBase):
    password: str

class OfficerCreate(BaseModel):
    badge_number: str
    full_name: str
    rank: str = "Investigating Officer"
    station_name: str = "Salt Lake Police Station"
    email: EmailStr
    username: str
    password: str
    role: Optional[RoleEnum] = RoleEnum.OFFICER

class LoginRequest(BaseModel):
    username: str # Can be username or badge number
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
