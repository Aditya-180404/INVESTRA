from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class StationRecommendation(Base):
    __tablename__ = "station_recommendations"

    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey("cases.id"), index=True, nullable=False)
    station_name = Column(String, nullable=False)
    area = Column(String, nullable=False)
    score = Column(Float, nullable=False)
    priority = Column(String, nullable=False)
    reasons_json = Column(Text, nullable=False)
    selected = Column(Boolean, default=False, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InformationRequest(Base):
    __tablename__ = "information_requests"

    id = Column(Integer, primary_key=True)
    request_code = Column(String, unique=True, index=True, nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), index=True, nullable=False)
    station_id = Column(Integer, ForeignKey("station_recommendations.id"), nullable=False)
    station_name = Column(String, nullable=False)
    status = Column(String, default="DRAFT", nullable=False)
    body = Column(Text, nullable=False)
    approved_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class StationResponse(Base):
    __tablename__ = "station_responses"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("information_requests.id"), index=True, nullable=False)
    result = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    source_reference = Column(String, nullable=False)
    verification_status = Column(String, default="PENDING", nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey("cases.id"), index=True, nullable=True)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=False)
    actor = Column(String, default="Investigator", nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    ip_address = Column(String, nullable=True)
    result = Column(String, default="SUCCESS", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
