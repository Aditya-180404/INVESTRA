from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import RoleEnum

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: Optional[RoleEnum] = RoleEnum.INVESTIGATOR

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True
