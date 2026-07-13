import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False)  # "user" | "violet"
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", backref="chat_messages")
