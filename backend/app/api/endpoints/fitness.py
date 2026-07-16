import os
import uuid
import shutil
from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.fitness import WorkoutLog, WeightLog, MealLog, FitnessGoal
from app.schemas.fitness import (
    WorkoutLogCreate,
    WorkoutLogResponse,
    WeightLogCreate,
    WeightLogResponse,
    MealLogCreate,
    MealLogResponse,
    MacroTotals,
    FitnessSummary,
    FitnessGoalUpdate,
    FitnessGoalResponse
)

router = APIRouter()

# Setup Upload Directory for Meal Images
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "food")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------- Gym Streak Calculator Helper -----------------
def calculate_gym_streak(db: Session, user_id: str) -> int:
    """Calculate the current consecutive daily workout streak."""
    # Fetch distinct dates only (without time component) in descending order
    # SQLite func.date returns string "YYYY-MM-DD"
    db_dates = db.query(func.date(WorkoutLog.date)).filter(
        WorkoutLog.user_id == user_id
    ).distinct().order_by(func.date(WorkoutLog.date).desc()).all()
    
    if not db_dates:
        return 0
        
    # Convert string rows to date objects
    dates = []
    for row in db_dates:
        date_str = row[0]
        if isinstance(date_str, str):
            dates.append(datetime.strptime(date_str, "%Y-%m-%d").date())
        else:
            dates.append(date_str)
            
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    
    # If the user hasn't worked out today or yesterday, streak is broken
    if dates[0] != today and dates[0] != yesterday:
        return 0
        
    streak = 0
    current_date = dates[0]
    
    for d in dates:
        if d == current_date:
            streak += 1
            current_date = current_date - timedelta(days=1)
        elif d > current_date:
            # Multiple workouts on same calendar day
            continue
        else:
            # Missed a calendar day - streak ends
            break
            
    return streak


# ----------------- Goals Helper -----------------
def get_or_create_goal(db: Session, user_id: str) -> FitnessGoal:
    """Fetch the user's fitness goal row, creating a default one on first access."""
    goal = db.query(FitnessGoal).filter(FitnessGoal.user_id == user_id).first()
    if not goal:
        goal = FitnessGoal(user_id=user_id)
        db.add(goal)
        db.commit()
        db.refresh(goal)
    return goal


# ----------------- Goals Endpoints -----------------

@router.get("/goals", response_model=FitnessGoalResponse)
def read_goals(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get the user's current calorie/macro goals (creates defaults if none set yet)."""
    return get_or_create_goal(db, current_user.id)

@router.put("/goals", response_model=FitnessGoalResponse)
def update_goals(
    goal_in: FitnessGoalUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update the user's daily calorie/protein/carb/fat goals."""
    goal = get_or_create_goal(db, current_user.id)
    goal.target_calories = goal_in.target_calories
    goal.target_protein_g = goal_in.target_protein_g
    goal.target_carbs_g = goal_in.target_carbs_g
    goal.target_fat_g = goal_in.target_fat_g
    db.commit()
    db.refresh(goal)
    return goal


# ----------------- Workout Logs Endpoints -----------------

@router.get("/workouts", response_model=List[WorkoutLogResponse])
def read_workouts(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's historic workouts."""
    return db.query(WorkoutLog).filter(
        WorkoutLog.user_id == current_user.id
    ).order_by(WorkoutLog.date.desc()).all()

@router.post("/workouts", response_model=WorkoutLogResponse, status_code=status.HTTP_201_CREATED)
def create_workout(
    workout_in: WorkoutLogCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Log a workout session."""
    db_workout = WorkoutLog(
        user_id=current_user.id,
        exercise_type=workout_in.exercise_type,
        duration_minutes=workout_in.duration_minutes,
        calories_burned=workout_in.calories_burned,
        date=workout_in.date or datetime.now(timezone.utc),
        notes=workout_in.notes
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return db_workout

@router.delete("/workouts/{id}", status_code=status.HTTP_200_OK)
def delete_workout(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a workout log entry."""
    db_workout = db.query(WorkoutLog).filter(
        WorkoutLog.id == id, WorkoutLog.user_id == current_user.id
    ).first()
    
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout log not found")
        
    db.delete(db_workout)
    db.commit()
    return {"detail": "Workout log successfully deleted"}


# ----------------- Weight Tracking Endpoints -----------------

@router.get("/weights", response_model=List[WeightLogResponse])
def read_weights(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get weight log history (sorted chronological for line chart rendering)."""
    return db.query(WeightLog).filter(
        WeightLog.user_id == current_user.id
    ).order_by(WeightLog.date.asc()).all()

@router.post("/weights", response_model=WeightLogResponse, status_code=status.HTTP_201_CREATED)
def create_weight(
    weight_in: WeightLogCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Record body weight."""
    db_weight = WeightLog(
        user_id=current_user.id,
        weight_kg=weight_in.weight_kg,
        date=weight_in.date or datetime.now(timezone.utc)
    )
    db.add(db_weight)
    db.commit()
    db.refresh(db_weight)
    return db_weight


# ----------------- Meals & Calories Endpoints -----------------

@router.get("/meals", response_model=List[MealLogResponse])
def read_meals(
    date: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get meal logs. Defaults to today's date if not specified."""
    query = db.query(MealLog).filter(MealLog.user_id == current_user.id)
    
    if date:
        # Filter by specific date e.g. "YYYY-MM-DD"
        query = query.filter(func.date(MealLog.date) == date)
    else:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query = query.filter(func.date(MealLog.date) == today)
        
    return query.order_by(MealLog.created_at.desc()).all()

@router.post("/meals", response_model=MealLogResponse, status_code=status.HTTP_201_CREATED)
def create_meal(
    meal_in: MealLogCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Log a meal."""
    db_meal = MealLog(
        user_id=current_user.id,
        meal_type=meal_in.meal_type.lower(),
        food_name=meal_in.food_name,
        calories=meal_in.calories,
        protein_g=meal_in.protein_g,
        carbs_g=meal_in.carbs_g,
        fat_g=meal_in.fat_g,
        date=meal_in.date or datetime.now(timezone.utc),
        image_path=meal_in.image_path
    )
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal

@router.delete("/meals/{id}", status_code=status.HTTP_200_OK)
def delete_meal(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a meal log entry."""
    db_meal = db.query(MealLog).filter(
        MealLog.id == id, MealLog.user_id == current_user.id
    ).first()
    
    if not db_meal:
        raise HTTPException(status_code=404, detail="Meal log not found")
        
    db.delete(db_meal)
    db.commit()
    return {"detail": "Meal log successfully deleted"}


# ----------------- Image Upload Pipeline endpoint -----------------

@router.post("/meals/upload-image")
def upload_food_image(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Upload a meal photo. Saves the file and returns a mock OCR calorie estimation."""
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save the file locally
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Relative path accessible via static mounting
    relative_path = f"/uploads/food/{unique_filename}"
    
    # Simulated computer vision response prepped for Phase 8 OCR/AI integration
    return {
        "image_path": relative_path,
        "food_name": "Grilled Chicken Caesar Salad",
        "calories": 480.0,
        "protein_g": 38.0,
        "carbs_g": 14.0,
        "fat_g": 26.0
    }


# ----------------- Summary Analytics Endpoint -----------------

@router.get("/summary", response_model=FitnessSummary)
def read_fitness_summary(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve fitness statistics, gym streaks, weight line chart values, and today's calories."""
    # 1. Gym Streak
    streak = calculate_gym_streak(db, current_user.id)
    
    # 2. Today's calorie totals
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_meals = db.query(MealLog).filter(
        MealLog.user_id == current_user.id,
        func.date(MealLog.date) == today_str
    ).all()
    
    today_calories_eaten = sum(m.calories for m in today_meals)
    protein = sum(m.protein_g for m in today_meals)
    carbs = sum(m.carbs_g for m in today_meals)
    fat = sum(m.fat_g for m in today_meals)
    
    # 3. Today's calories burned
    today_workouts = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == current_user.id,
        func.date(WorkoutLog.date) == today_str
    ).all()
    today_calories_burned = sum(w.calories_burned for w in today_workouts)
    
    # 4. Weight history (Limit to last 10 entries for graph readability)
    weights = db.query(WeightLog).filter(
        WeightLog.user_id == current_user.id
    ).order_by(WeightLog.date.asc()).limit(10).all()
    
    # 5. Recent workouts (Last 5)
    recent = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == current_user.id
    ).order_by(WorkoutLog.date.desc()).limit(5).all()
    
    # 6. User's calorie/macro goals (creates defaults on first access)
    goal = get_or_create_goal(db, current_user.id)
    
    return FitnessSummary(
        gym_streak=streak,
        today_calories_eaten=today_calories_eaten,
        today_calories_burned=today_calories_burned,
        target_calories=goal.target_calories,
        target_protein_g=goal.target_protein_g,
        target_carbs_g=goal.target_carbs_g,
        target_fat_g=goal.target_fat_g,
        macro_totals=MacroTotals(protein=protein, carbs=carbs, fat=fat),
        weight_history=weights,
        recent_workouts=recent
    )
