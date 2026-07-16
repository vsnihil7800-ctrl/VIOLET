from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ----------------- Workouts -----------------
class WorkoutLogCreate(BaseModel):
    exercise_type: str = Field(..., description="e.g. Strength, Cardio, Run, Yoga")
    duration_minutes: int = Field(..., gt=0, description="Duration in minutes")
    calories_burned: float = Field(..., ge=0)
    date: Optional[datetime] = None
    notes: Optional[str] = None

class WorkoutLogResponse(WorkoutLogCreate):
    id: str
    user_id: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Weights -----------------
class WeightLogCreate(BaseModel):
    weight_kg: float = Field(..., gt=0, description="Body weight in Kilograms")
    date: Optional[datetime] = None

class WeightLogResponse(WeightLogCreate):
    id: str
    user_id: str
    date: datetime

    class Config:
        from_attributes = True


# ----------------- Meals -----------------
class MealLogCreate(BaseModel):
    meal_type: str = Field(..., description="breakfast, lunch, dinner, snack")
    food_name: str = Field(..., description="Name of food item")
    calories: float = Field(..., ge=0)
    protein_g: float = Field(0.0, ge=0)
    carbs_g: float = Field(0.0, ge=0)
    fat_g: float = Field(0.0, ge=0)
    date: Optional[datetime] = None
    image_path: Optional[str] = None

class MealLogResponse(MealLogCreate):
    id: str
    user_id: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Summaries & Analytics -----------------
class MacroTotals(BaseModel):
    protein: float
    carbs: float
    fat: float

class FitnessSummary(BaseModel):
    gym_streak: int
    today_calories_eaten: float
    today_calories_burned: float
    target_calories: float = 2200.0  # standard target calorie limit
    macro_totals: MacroTotals
    weight_history: List[WeightLogResponse]
    recent_workouts: List[WorkoutLogResponse]


class DailyCalories(BaseModel):
    date: str  # "YYYY-MM-DD"
    calories: float
