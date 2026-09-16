import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import RoleEnum, User
from app.schemas.user import LoginRequest, OfficerCreate, TokenResponse, UserCreate, UserResponse

router = APIRouter()


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    authorization: Optional[str] = Header(None), db: Session = Depends(get_db)
) -> User:
    """Require a valid bearer token for every investigation-data endpoint."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("user_id")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Active officer account required")
    return user


def check_admin_url_encoding(
    admin_key: Optional[str] = Query(None, description="URL-encoded Admin Access Key"),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Access-Key")
) -> bool:
    """
    Validates administrator access protected by URL encoding.
    Accepts the key as either a query param or header in URL-encoded form:
    %49%4e%56%45%53%54%52%41%5f%41%44%4d%49%4e%5f%32%30%32%36
    or decoded: INVESTRA_ADMIN_2026.
    """
    candidate = admin_key or x_admin_key
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Administrator Gateway is protected by URL encoding. Provide the encoded security token."
        )

    # 1. Check direct raw match
    if candidate.strip() == settings.ADMIN_SECRET_RAW:
        return True

    # 2. Check direct URL-encoded match (case-insensitive hex)
    if candidate.strip().upper() == settings.ADMIN_URL_ENCODED_KEY.upper():
        return True

    # 3. Decode candidate and check against raw
    try:
        decoded = urllib.parse.unquote(candidate).strip()
        if decoded == settings.ADMIN_SECRET_RAW:
            return True
    except Exception:
        pass

    # 4. Check double-encoded
    try:
        decoded_once = urllib.parse.unquote(candidate).strip()
        decoded_twice = urllib.parse.unquote(decoded_once).strip()
        if decoded_twice == settings.ADMIN_SECRET_RAW:
            return True
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Security Violation: Invalid URL-encoded Administrator Token. Verification failed."
    )


class StatusToggleRequest(BaseModel):
    is_active: bool


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Officer and Admin login using Username or Badge Number.
    """
    identifier = credentials.username.strip()
    user = db.query(User).filter(
        (User.username == identifier) | (User.badge_number == identifier) | (User.email == identifier)
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Verify your badge number / username and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Contact Headquarters Administrator."
        )

    token = create_access_token({
        "sub": user.username,
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "badge_number": user.badge_number
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/admin/verify")
def verify_admin_key_endpoint(
    admin_key: Optional[str] = Query(None),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Access-Key")
):
    """
    Demonstrates and validates URL encoding security for the Administrator Gateway.
    """
    is_valid = False
    try:
        check_admin_url_encoding(admin_key, x_admin_key)
        is_valid = True
    except HTTPException:
        is_valid = False

    return {
        "valid": is_valid,
        "protection": "URL_ENCODING",
        "expected_encoded": settings.ADMIN_URL_ENCODED_KEY,
        "expected_raw": settings.ADMIN_SECRET_RAW,
        "received": admin_key or x_admin_key or None,
        "decoded_received": urllib.parse.unquote(admin_key or x_admin_key or "") if (admin_key or x_admin_key) else None
    }


@router.get("/admin/officers", response_model=List[UserResponse])
def list_officers(
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin_url_encoding)
):
    """
    Protected Administrator endpoint: Lists all police officers stored in PostgreSQL.
    """
    officers = db.query(User).order_by(User.id.asc()).all()
    return officers


@router.post("/admin/officers", response_model=UserResponse)
def add_new_officer(
    officer: OfficerCreate,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin_url_encoding)
):
    """
    Protected Administrator endpoint: Provisions and registers a new Police Officer.
    """
    if db.query(User).filter(User.username == officer.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == officer.email).first():
        raise HTTPException(status_code=400, detail="Email already registered in police roster")
    if officer.badge_number and db.query(User).filter(User.badge_number == officer.badge_number).first():
        raise HTTPException(status_code=400, detail="Police Badge Number already assigned to another officer")

    new_officer = User(
        username=officer.username,
        email=officer.email,
        badge_number=officer.badge_number,
        full_name=officer.full_name,
        rank=officer.rank,
        station_name=officer.station_name,
        hashed_password=hash_password(officer.password),
        role=officer.role or RoleEnum.OFFICER,
        is_active=True
    )
    db.add(new_officer)
    db.commit()
    db.refresh(new_officer)
    return new_officer


@router.patch("/admin/officers/{officer_id}/status", response_model=UserResponse)
def toggle_officer_status(
    officer_id: int,
    payload: StatusToggleRequest,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin_url_encoding)
):
    """
    Protected Administrator endpoint: Activates or suspends an officer's access.
    """
    officer = db.query(User).filter(User.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    officer.is_active = payload.is_active
    db.commit()
    db.refresh(officer)
    return officer
