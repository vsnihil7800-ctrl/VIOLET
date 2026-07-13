import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class TodoItem(Base):
    __tablename__ = "todo_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    priority = Column(String, default="medium", nullable=False)  # "low" | "medium" | "high"
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", backref="todos")


class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, default="", nullable=False)  # holds rich text / markdown strings
    color = Column(String, default="slate", nullable=False)  # card styling color theme
    is_pinned = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    user = relationship("User", backref="notes_list")


class CodingStreak(Base):
    __tablename__ = "coding_streaks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    commits_count = Column(Integer, default=0, nullable=False)
    minutes_coded = Column(Integer, default=0, nullable=False)

    # Relationship
    user = relationship("User", backref="coding_streaks")
