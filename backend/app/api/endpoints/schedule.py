import os
import uuid
import shutil
from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.schedule import CalendarEvent, Reminder, Document
from app.schemas.schedule import (
    CalendarEventCreate,
    CalendarEventResponse,
    ReminderCreate,
    ReminderResponse,
    DocumentResponse,
    ScheduleSummary
)

router = APIRouter()

# Setup Secure Vault Directory for Documents
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
VAULT_DIR = os.path.join(BASE_DIR, "uploads", "vault")
os.makedirs(VAULT_DIR, exist_ok=True)

# ----------------- Calendar Events Endpoints -----------------

@router.get("/events", response_model=List[CalendarEventResponse])
def read_events(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get all events scheduled by the user."""
    return db.query(CalendarEvent).filter(
        CalendarEvent.user_id == current_user.id
    ).order_by(CalendarEvent.start_time.asc()).all()

@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event_in: CalendarEventCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Schedule a calendar event."""
    if event_in.end_time <= event_in.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
        
    db_event = CalendarEvent(
        user_id=current_user.id,
        title=event_in.title,
        description=event_in.description,
        start_time=event_in.start_time,
        end_time=event_in.end_time,
        color=event_in.color.lower()
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.delete("/events/{id}", status_code=status.HTTP_200_OK)
def delete_event(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Cancel a calendar event."""
    db_event = db.query(CalendarEvent).filter(
        CalendarEvent.id == id, CalendarEvent.user_id == current_user.id
    ).first()
    
    if not db_event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
        
    db.delete(db_event)
    db.commit()
    return {"detail": "Calendar event successfully deleted"}


# ----------------- Reminders Endpoints -----------------

@router.get("/reminders", response_model=List[ReminderResponse])
def read_reminders(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get active reminders (sorted by deadline chronological)."""
    return db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.is_sent == False
    ).order_by(Reminder.time.asc()).all()

@router.post("/reminders", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    reminder_in: ReminderCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Register a reminder alert."""
    db_reminder = Reminder(
        user_id=current_user.id,
        title=reminder_in.title,
        time=reminder_in.time
    )
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.delete("/reminders/{id}", status_code=status.HTTP_200_OK)
def delete_reminder(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a reminder."""
    db_reminder = db.query(Reminder).filter(
        Reminder.id == id, Reminder.user_id == current_user.id
    ).first()
    
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    db.delete(db_reminder)
    db.commit()
    return {"detail": "Reminder successfully deleted"}


# ----------------- Document Secure Vault Endpoints -----------------

@router.get("/documents", response_model=List[DocumentResponse])
def read_documents(
    q: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve list of vault files, supporting keyword search queries and categories."""
    query = db.query(Document).filter(Document.user_id == current_user.id)
    
    if category and category.lower() != "all":
        query = query.filter(Document.category == category.lower())
        
    if q:
        query = query.filter(Document.name.ilike(f"%{q}%"))
        
    return query.order_by(Document.created_at.desc()).all()

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    category: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Upload document to secure locker vault."""
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    dest_path = os.path.join(VAULT_DIR, unique_filename)
    
    # Track file size dynamically
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    # Save file on local vault disk path
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    relative_path = f"/uploads/vault/{unique_filename}"
    
    db_doc = Document(
        user_id=current_user.id,
        name=file.filename,
        file_path=relative_path,
        category=category.lower(),
        file_size=file_size
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@router.delete("/documents/{id}", status_code=status.HTTP_200_OK)
def delete_document(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a document from database and delete local physical file from vault disk."""
    db_doc = db.query(Document).filter(
        Document.id == id, Document.user_id == current_user.id
    ).first()
    
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Remove physical file from uploads/vault/
    filename = os.path.basename(db_doc.file_path)
    file_path = os.path.join(VAULT_DIR, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Failed to remove physical file: {e}")
            
    db.delete(db_doc)
    db.commit()
    return {"detail": "Document successfully deleted"}


# ----------------- Schedule summary -----------------

@router.get("/summary", response_model=ScheduleSummary)
def read_schedule_summary(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve schedule count indexes."""
    reminders_count = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.is_sent == False
    ).count()
    
    # Today's events query
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == current_user.id,
        (func.date(CalendarEvent.start_time) == today_str) |
        (func.date(CalendarEvent.end_time) == today_str)
    ).order_by(CalendarEvent.start_time.asc()).all()
    
    doc_count = db.query(Document).filter(
        Document.user_id == current_user.id
    ).count()
    
    return ScheduleSummary(
        total_reminders=reminders_count,
        today_events=today_events,
        documents_count=doc_count
    )
