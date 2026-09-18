"""Authentication, authorization, and audit helpers."""
from datetime import datetime, timedelta, timezone
from typing import Iterable
import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import RoleEnum, User
from app.models.case_member import CaseMember
from app.models.coordination import AuditLog


def hash_password(password: str) -> str:
    if len(password) < 12:
        raise ValueError("Passwords must be at least 12 characters long")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user: User) -> str:
    if not settings.JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not configured")
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user.id), "role": user.role.value, "iat": now,
                       "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)},
                      settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def get_current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(authorization[7:], settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Active account required")
    return user


def require_roles(*roles: RoleEnum):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user
    return dependency


def require_case_access(case_id: int, db: Session, user: User, write: bool = False) -> None:
    if user.role == RoleEnum.ADMIN:
        return
    membership = db.query(CaseMember).filter(CaseMember.case_id == case_id, CaseMember.user_id == user.id).first()
    if not membership or (write and membership.permission not in {"EDITOR", "OWNER"}):
        raise HTTPException(status_code=403, detail="You are not authorized for this case")


def audit(db: Session, *, action: str, actor: User, case_id: int | None = None, detail: str = "", ip_address: str | None = None, result: str = "SUCCESS") -> None:
    actor_label = f"{actor.username} ({actor.role.value if hasattr(actor.role, 'value') else actor.role})"
    db.add(AuditLog(case_id=case_id, action=action, detail=detail, actor=actor_label, actor_user_id=actor.id, ip_address=ip_address, result=result))
