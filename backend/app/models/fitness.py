import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    exercise_type = Column(String, nullable=False)  # e.g., "Strength", "Cardio", "Yoga"
    duration_minutes = Column(Integer, nullable=False)
    calories_burned = Column(Float, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    user = relationship("User", backref="workouts")


class WeightLog(Base):
    __tablename__ = "weight_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    weight_kg = Column(Float, nullable=False)

    # Relationship
    user = relationship("User", backref="weights")


class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    meal_type = Column(String, nullable=False)  # "breakfast", "lunch", "dinner", "snack"
    food_name = Column(String, nullable=False)
    calories = Column(Float, nullable=False)
    protein_g = Column(Float, default=0.0, nullable=False)
    carbs_g = Column(Float, default=0.0, nullable=False)
    fat_g = Column(Float, default=0.0, nullable=False)
    image_path = Column(String, nullable=True)  # Image path for OCR files uploads
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", backref="meals")
