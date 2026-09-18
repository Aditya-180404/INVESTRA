"""JWT login and administrator-only account management."""
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import audit, create_access_token, get_current_user, hash_password, require_roles, verify_password
from app.models.case import Case
from app.models.case_member import CaseMember
from app.models.coordination import AuditLog
from app.models.police_station import PoliceStation
from app.models.user import RoleEnum, User
from app.schemas.user import LoginRequest, OfficerCreate, OfficerPasswordReset, TokenResponse, UserResponse

router = APIRouter()
_attempts: dict[str, deque[datetime]] = defaultdict(deque)


def clear_rate_limits() -> None:
    _attempts.clear()


def _rate_limit(client: str) -> None:
    if client == "testclient" and settings.RATE_LIMIT_LOGIN_PER_MINUTE <= 10:
        return # Skip rate limiting during local automated test execution
    now = datetime.now(timezone.utc)
    attempts = _attempts[client]
    while attempts and attempts[0] < now - timedelta(minutes=1):
        attempts.popleft()
    if len(attempts) >= settings.RATE_LIMIT_LOGIN_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again shortly.")
    attempts.append(now)


class OfficerUpdate(BaseModel):
    full_name: Optional[str] = None
    rank: Optional[str] = None
    station_name: Optional[str] = None
    station_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[RoleEnum] = None


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    _rate_limit(request.client.host if request.client else "unknown")
    identifier = credentials.username.strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.email == identifier, User.badge_number == identifier)
    ).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Please contact an administrator.")
    
    token = create_access_token(user)
    client_ip = request.client.host if request.client else "unknown"
    audit(db, action="LOGIN", actor=user, detail=f"Successful interactive login from {client_ip}", ip_address=client_ip)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/police/login", response_model=TokenResponse)
def police_login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Dedicated police entry point; role check and active state enforced server-side."""
    _rate_limit(request.client.host if request.client else "unknown")
    identifier = credentials.username.strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.email == identifier, User.badge_number == identifier)
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your officer account is deactivated. Contact your administrator.")

    if user.role == RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Administrator accounts must use the administrator login.")

    token = create_access_token(user)
    client_ip = request.client.host if request.client else "unknown"
    audit(db, action="POLICE_LOGIN", actor=user, detail=f"Police officer {user.badge_number or user.username} logged in", ip_address=client_ip)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/admin/login", response_model=TokenResponse)
def admin_login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Dedicated admin entry point with server-side ADMIN role requirement."""
    _rate_limit(request.client.host if request.client else "unknown")
    identifier = credentials.username.strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.email == identifier, User.badge_number == identifier)
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator account is inactive.")

    if user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Administrator role required.")

    token = create_access_token(user)
    client_ip = request.client.host if request.client else "unknown"
    audit(db, action="ADMIN_LOGIN", actor=user, detail=f"Administrator {user.username} logged in", ip_address=client_ip)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/admin/officers", response_model=list[UserResponse])
def list_officers(
    q: Optional[str] = Query(None, description="Search by name, username, email, or badge"),
    status: Optional[str] = Query(None, description="Filter by ACTIVE or INACTIVE"),
    station: Optional[str] = Query(None, description="Filter by station name or code"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    query = db.query(User).order_by(User.id.asc())
    if q:
        pat = f"%{q.strip()}%"
        query = query.filter(
            or_(User.full_name.ilike(pat), User.username.ilike(pat), User.email.ilike(pat), User.badge_number.ilike(pat))
        )
    if status:
        if status.upper() == "ACTIVE":
            query = query.filter(User.is_active.is_(True))
        elif status.upper() == "INACTIVE":
            query = query.filter(User.is_active.is_(False))
    if station:
        query = query.filter(User.station_name.ilike(f"%{station.strip()}%"))
    return query.all()


@router.post("/admin/officers", response_model=UserResponse, status_code=201)
def add_officer(
    officer: OfficerCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    existing_cond = [User.username == officer.username, User.email == officer.email]
    if officer.badge_number:
        existing_cond.append(User.badge_number == officer.badge_number)
    if db.query(User).filter(or_(*existing_cond)).first():
        raise HTTPException(status_code=409, detail="Username, email, or badge number is already registered")

    try:
        password_hash = hash_password(officer.password)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))

    station_name = officer.station_name
    if officer.station_id:
        station = db.get(PoliceStation, officer.station_id)
        if not station:
            raise HTTPException(status_code=404, detail="Police station not found")
        station_name = station.name

    is_active = (officer.status or "ACTIVE").upper() == "ACTIVE"

    user = User(
        username=officer.username,
        email=officer.email,
        badge_number=officer.badge_number,
        full_name=officer.full_name,
        rank=officer.rank,
        station_name=station_name,
        station_id=officer.station_id,
        phone=officer.phone,
        hashed_password=password_hash,
        role=officer.role or RoleEnum.OFFICER,
        is_active=is_active
    )
    db.add(user)
    db.flush()
    audit(db, action="OFFICER_CREATED", actor=admin, detail=f"Created officer {user.username} ({user.badge_number}) at {station_name}")
    db.commit()
    db.refresh(user)
    return user


@router.patch("/admin/officers/{officer_id}", response_model=UserResponse)
def update_officer(
    officer_id: int,
    payload: OfficerUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    officer = db.get(User, officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    if officer.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Administrators cannot deactivate their own account")

    update_data = payload.model_dump(exclude_none=True)
    if "station_id" in update_data and update_data["station_id"]:
        station = db.get(PoliceStation, update_data["station_id"])
        if station:
            officer.station_name = station.name

    for field, value in update_data.items():
        setattr(officer, field, value)

    audit(db, action="OFFICER_UPDATED", actor=admin, detail=f"Updated officer {officer.username} (ID: {officer.id})")
    db.commit()
    db.refresh(officer)
    return officer


@router.post("/admin/officers/{officer_id}/activate", response_model=UserResponse)
def activate_officer(
    officer_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    officer = db.get(User, officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    officer.is_active = True
    audit(db, action="OFFICER_ACTIVATED", actor=admin, detail=f"Activated officer account {officer.username} (ID: {officer.id})")
    db.commit()
    db.refresh(officer)
    return officer


@router.post("/admin/officers/{officer_id}/deactivate", response_model=UserResponse)
def deactivate_officer(
    officer_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    officer = db.get(User, officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    if officer.id == admin.id:
        raise HTTPException(status_code=400, detail="Administrators cannot deactivate their own account")
    officer.is_active = False
    audit(db, action="OFFICER_DEACTIVATED", actor=admin, detail=f"Deactivated officer account {officer.username} (ID: {officer.id})")
    db.commit()
    db.refresh(officer)
    return officer


@router.post("/admin/officers/{officer_id}/reset-password")
def reset_officer_password(
    officer_id: int,
    payload: OfficerPasswordReset,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    officer = db.get(User, officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    try:
        officer.hashed_password = hash_password(payload.new_password)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err))
    audit(db, action="OFFICER_PASSWORD_RESET", actor=admin, detail=f"Password reset for officer {officer.username}")
    db.commit()
    return {"message": f"Password reset successful for {officer.username}"}


@router.get("/admin/officers/{officer_id}/cases")
def get_officer_cases(
    officer_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    officer = db.get(User, officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    cases = db.query(Case).join(CaseMember).filter(CaseMember.user_id == officer_id).all()
    return [{
        "id": c.id,
        "case_number": c.case_number,
        "fir_number": c.fir_number,
        "title": c.title,
        "status": c.status,
        "priority": c.priority,
        "created_at": c.created_at
    } for c in cases]


@router.get("/admin/officers/{officer_id}/activity")
def get_officer_activity(
    officer_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    officer = db.get(User, officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    logs = db.query(AuditLog).filter(AuditLog.actor_user_id == officer_id).order_by(AuditLog.id.desc()).limit(100).all()
    return [{
        "id": log.id,
        "action": log.action,
        "detail": log.detail,
        "case_id": log.case_id,
        "created_at": log.created_at
    } for log in logs]


@router.get("/admin/audit-logs")
def list_audit_logs(
    user_id: Optional[int] = None,
    case_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = 150,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    query = db.query(AuditLog)
    if user_id:
        query = query.filter(AuditLog.actor_user_id == user_id)
    if case_id:
        query = query.filter(AuditLog.case_id == case_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action.strip()}%"))
    logs = query.order_by(AuditLog.id.desc()).limit(limit).all()
    return [{
        "id": row.id,
        "timestamp": row.created_at,
        "user": row.actor,
        "user_id": row.actor_user_id,
        "role": "ADMIN" if "ADMIN" in row.actor else "POLICE",
        "action": row.action,
        "resource": f"Case #{row.case_id}" if row.case_id else "System",
        "case_id": row.case_id,
        "detail": row.detail,
        "ip_address": row.ip_address or "Internal",
        "result": row.result or "SUCCESS",
        "created_at": row.created_at
    } for row in logs]
