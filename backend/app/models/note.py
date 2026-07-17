import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Integer, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class NoteColumn(Base):
    __tablename__ = "note_columns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)  # e.g. "Watchlist", "Ideas", "Recipes"
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", backref="note_columns")
    entries = relationship(
        "NoteEntry",
        backref="column",
        cascade="all, delete-orphan",
        order_by="NoteEntry.created_at",
    )


class NoteEntry(Base):
    __tablename__ = "note_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    column_id = Column(String, ForeignKey("note_columns.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
