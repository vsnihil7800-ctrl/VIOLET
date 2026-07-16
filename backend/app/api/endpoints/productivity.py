from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.productivity import TodoItem, Note, CodingStreak
from app.schemas.productivity import (
    TodoItemCreate,
    TodoItemUpdate,
    TodoItemResponse,
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    CodingStreakCreate,
    CodingStreakResponse,
    ProductivitySummary
)

router = APIRouter()

# ----------------- Coding Streak Calculator Helper -----------------
def calculate_coding_streak(db: Session, user_id: str) -> int:
    """Calculate consecutive daily coding streaks (commits > 0 or minutes > 0)."""
    db_dates = db.query(func.date(CodingStreak.date)).filter(
        CodingStreak.user_id == user_id,
        (CodingStreak.commits_count > 0) | (CodingStreak.minutes_coded > 0)
    ).distinct().order_by(func.date(CodingStreak.date).desc()).all()
    
    if not db_dates:
        return 0
        
    dates = []
    for row in db_dates:
        date_str = row[0]
        if isinstance(date_str, str):
            dates.append(datetime.strptime(date_str, "%Y-%m-%d").date())
        else:
            dates.append(date_str)
            
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    
    if dates[0] != today and dates[0] != yesterday:
        return 0
        
    streak = 0
    current_date = dates[0]
    
    for d in dates:
        if d == current_date:
            streak += 1
            current_date = current_date - timedelta(days=1)
        elif d > current_date:
            # multiple logs same day
            continue
        else:
            break
            
    return streak


# ----------------- Todo Item Checklist Endpoints -----------------

@router.get("/todos", response_model=List[TodoItemResponse])
def read_todos(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's checklist. Sorts incomplete items first, then priority descending, then created_at."""
    return db.query(TodoItem).filter(
        TodoItem.user_id == current_user.id
    ).order_by(
        TodoItem.completed.asc(),
        # custom sorting for priority levels: high, medium, low
        case(
            (TodoItem.priority == "high", 1),
            (TodoItem.priority == "medium", 2),
            else_=3
        ).asc(),
        TodoItem.created_at.desc()
    ).all()

@router.post("/todos", response_model=TodoItemResponse, status_code=status.HTTP_201_CREATED)
def create_todo(
    todo_in: TodoItemCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new task."""
    db_todo = TodoItem(
        user_id=current_user.id,
        title=todo_in.title,
        priority=(todo_in.priority or "medium").lower(),
        due_date=todo_in.due_date
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

@router.patch("/todos/{id}", response_model=TodoItemResponse)
def update_todo(
    id: str,
    todo_in: TodoItemUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Toggle status or update other properties of a to-do item."""
    db_todo = db.query(TodoItem).filter(
        TodoItem.id == id, TodoItem.user_id == current_user.id
    ).first()
    
    if not db_todo:
        raise HTTPException(status_code=404, detail="To-do task not found")
        
    update_data = todo_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_todo, field, value)
        
    db.commit()
    db.refresh(db_todo)
    return db_todo

@router.delete("/todos/{id}", status_code=status.HTTP_200_OK)
def delete_todo(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a task."""
    db_todo = db.query(TodoItem).filter(
        TodoItem.id == id, TodoItem.user_id == current_user.id
    ).first()
    
    if not db_todo:
        raise HTTPException(status_code=404, detail="To-do task not found")
        
    db.delete(db_todo)
    db.commit()
    return {"detail": "Task successfully deleted"}


# ----------------- Sticky Notes Notepad Endpoints -----------------

@router.get("/notes", response_model=List[NoteResponse])
def read_notes(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's stickies notes list. Sorts pinned notes first, then updated_at descending."""
    return db.query(Note).filter(
        Note.user_id == current_user.id
    ).order_by(
        Note.is_pinned.desc(),
        Note.updated_at.desc()
    ).all()

@router.post("/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    note_in: NoteCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create a notepad entry."""
    db_note = Note(
        user_id=current_user.id,
        title=note_in.title,
        content=note_in.content,
        color=note_in.color.lower(),
        is_pinned=note_in.is_pinned
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@router.patch("/notes/{id}", response_model=NoteResponse)
def update_note(
    id: str,
    note_in: NoteUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update title, markdown body content, colors, or pinned layout flags."""
    db_note = db.query(Note).filter(
        Note.id == id, Note.user_id == current_user.id
    ).first()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Notepad entry not found")
        
    update_data = note_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_note, field, value)
        
    db.commit()
    db.refresh(db_note)
    return db_note

@router.delete("/notes/{id}", status_code=status.HTTP_200_OK)
def delete_note(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a notepad entry."""
    db_note = db.query(Note).filter(
        Note.id == id, Note.user_id == current_user.id
    ).first()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Notepad entry not found")
        
    db.delete(db_note)
    db.commit()
    return {"detail": "Note successfully deleted"}


# ----------------- Coding Streaks Endpoints -----------------

@router.get("/streaks", response_model=List[CodingStreakResponse])
def read_streaks(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get coding activity history logs."""
    return db.query(CodingStreak).filter(
        CodingStreak.user_id == current_user.id
    ).order_by(CodingStreak.date.desc()).all()

@router.post("/streaks", response_model=CodingStreakResponse, status_code=status.HTTP_201_CREATED)
def create_streak_log(
    streak_in: CodingStreakCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Log coding minutes and commits. Aggregates activity if entry for date already exists."""
    log_date = streak_in.date or datetime.now(timezone.utc)
    date_str = log_date.strftime("%Y-%m-%d")
    
    existing = db.query(CodingStreak).filter(
        CodingStreak.user_id == current_user.id,
        func.date(CodingStreak.date) == date_str
    ).first()
    
    if existing:
        existing.commits_count += streak_in.commits_count
        existing.minutes_coded += streak_in.minutes_coded
        db.commit()
        db.refresh(existing)
        return existing
        
    db_streak = CodingStreak(
        user_id=current_user.id,
        date=log_date,
        commits_count=streak_in.commits_count,
        minutes_coded=streak_in.minutes_coded
    )
    db.add(db_streak)
    db.commit()
    db.refresh(db_streak)
    return db_streak

@router.delete("/streaks/{id}", status_code=status.HTTP_200_OK)
def delete_streak_log(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a coding streak log entry."""
    db_streak = db.query(CodingStreak).filter(
        CodingStreak.id == id, CodingStreak.user_id == current_user.id
    ).first()

    if not db_streak:
        raise HTTPException(status_code=404, detail="Coding streak log not found")

    db.delete(db_streak)
    db.commit()
    return {"detail": "Coding streak log successfully deleted"}


# ----------------- Workspace Summary Endpoint -----------------

@router.get("/summary", response_model=ProductivitySummary)
def read_productivity_summary(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve workspace checklist stats, active coding streaks, and latest stickies notes."""
    streak = calculate_coding_streak(db, current_user.id)
    
    pending_count = db.query(TodoItem).filter(
        TodoItem.user_id == current_user.id,
        TodoItem.completed == False
    ).count()
    
    notes_count = db.query(Note).filter(
        Note.user_id == current_user.id
    ).count()
    
    # Fetch top 3 pending to-dos (ordered by priority: high, medium, low)
    top_todos = db.query(TodoItem).filter(
        TodoItem.user_id == current_user.id,
        TodoItem.completed == False
    ).order_by(
        case(
            (TodoItem.priority == "high", 1),
            (TodoItem.priority == "medium", 2),
            else_=3
        ).asc(),
        TodoItem.created_at.desc()
    ).limit(3).all()
    
    # Fetch recent 5 notes
    recent_notes = db.query(Note).filter(
        Note.user_id == current_user.id
    ).order_by(
        Note.is_pinned.desc(),
        Note.updated_at.desc()
    ).limit(5).all()
    
    return ProductivitySummary(
        coding_streak=streak,
        pending_todos_count=pending_count,
        total_notes_count=notes_count,
        top_todos=top_todos,
        recent_notes=recent_notes
    )
