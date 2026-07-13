from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ----------------- Todo Checklist -----------------
class TodoItemCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Task Title")
    priority: str = Field("medium", description="low, medium, high")
    due_date: Optional[datetime] = None

class TodoItemUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None

class TodoItemResponse(TodoItemCreate):
    id: str
    user_id: str
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Sticky Notes -----------------
class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Note Title")
    content: str = Field("", description="Markdown or rich text notepad body")
    color: str = Field("slate", description="Card theme color")
    is_pinned: bool = Field(False)

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    is_pinned: Optional[bool] = None

class NoteResponse(NoteCreate):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----------------- Coding Streaks -----------------
class CodingStreakCreate(BaseModel):
    commits_count: int = Field(0, ge=0)
    minutes_coded: int = Field(0, ge=0)
    date: Optional[datetime] = None

class CodingStreakResponse(CodingStreakCreate):
    id: str
    user_id: str
    date: datetime

    class Config:
        from_attributes = True


# ----------------- Summaries & Analytics -----------------
class ProductivitySummary(BaseModel):
    coding_streak: int
    pending_todos_count: int
    total_notes_count: int
    top_todos: List[TodoItemResponse]
    recent_notes: List[NoteResponse]
