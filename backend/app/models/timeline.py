from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), index=True, nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=True)
    event_time = Column(String, nullable=True)
    event_type = Column(String, nullable=False, index=True)
    event_title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    responsible_party = Column(String, nullable=True)
    source = Column(String, default="Investigation Record")
    category = Column(String, default="INVESTIGATION")
    is_parsed = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
