import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, String, Float
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    hashed_refresh_token = Column(String, nullable=True)
    target_calories = Column(Float, nullable=False, default=3000.0, server_default="3000.0")
    target_protein = Column(Float, nullable=False, default=110.0, server_default="110.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
