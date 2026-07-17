from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


# ----------------- Entries -----------------
class NoteEntryCreate(BaseModel):
    content: str = Field(..., min_length=1)

class NoteEntryUpdate(BaseModel):
    content: str = Field(..., min_length=1)

class NoteEntryResponse(BaseModel):
    id: str
    column_id: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----------------- Columns -----------------
class NoteColumnCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=60)

class NoteColumnResponse(BaseModel):
    id: str
    user_id: str
    title: str
    position: int
    created_at: datetime
    entries: List[NoteEntryResponse] = []

    class Config:
        from_attributes = True
