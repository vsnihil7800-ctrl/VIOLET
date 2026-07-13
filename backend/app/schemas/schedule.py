from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ----------------- Calendar Events -----------------
class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Event Title")
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    color: str = Field("indigo", description="indigo, emerald, amber, rose, slate")

class CalendarEventResponse(CalendarEventCreate):
    id: str
    user_id: str

    class Config:
        from_attributes = True


# ----------------- Reminders -----------------
class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Reminder Details")
    time: datetime

class ReminderResponse(ReminderCreate):
    id: str
    user_id: str
    is_sent: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Document Vault -----------------
class DocumentResponse(BaseModel):
    id: str
    user_id: str
    name: str
    file_path: str
    category: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Summary Analytics -----------------
class ScheduleSummary(BaseModel):
    total_reminders: int
    today_events: List[CalendarEventResponse]
    documents_count: int
