import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    color = Column(String, default="indigo", nullable=False)  # "indigo" | "emerald" | "amber" | "rose" | "slate"

    # Relationship
    user = relationship("User", backref="calendar_events")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    time = Column(DateTime, nullable=False)
    is_sent = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", backref="reminders")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Relative static download URL
    category = Column(String, default="others", nullable=False)  # "personal" | "financial" | "health" | "work" | "others"
    file_size = Column(Integer, nullable=False)  # Bytes count
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", backref="documents")
