from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.note import NoteColumn, NoteEntry
from app.schemas.note import (
    NoteColumnCreate,
    NoteColumnResponse,
    NoteEntryCreate,
    NoteEntryUpdate,
    NoteEntryResponse,
)

router = APIRouter()

# ----------------- Column Endpoints -----------------

@router.get("/columns", response_model=List[NoteColumnResponse])
def read_note_columns(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """List all note columns (with their entries) for the current user."""
    return (
        db.query(NoteColumn)
        .options(joinedload(NoteColumn.entries))
        .filter(NoteColumn.user_id == current_user.id)
        .order_by(NoteColumn.position, NoteColumn.created_at)
        .all()
    )


@router.post("/columns", response_model=NoteColumnResponse, status_code=status.HTTP_201_CREATED)
def create_note_column(
    column_in: NoteColumnCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new named column (e.g. 'Watchlist', 'Ideas')."""
    existing_count = db.query(NoteColumn).filter(NoteColumn.user_id == current_user.id).count()

    db_column = NoteColumn(
        user_id=current_user.id,
        title=column_in.title,
        position=existing_count,
    )
    db.add(db_column)
    db.commit()
    db.refresh(db_column)
    return db_column


@router.delete("/columns/{column_id}", status_code=status.HTTP_200_OK)
def delete_note_column(
    column_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a column and all entries inside it."""
    db_column = db.query(NoteColumn).filter(
        NoteColumn.id == column_id,
        NoteColumn.user_id == current_user.id
    ).first()

    if not db_column:
        raise HTTPException(status_code=404, detail="Column not found")

    db.delete(db_column)
    db.commit()
    return {"detail": f"Deleted column {column_id}"}


# ----------------- Entry Endpoints -----------------

@router.post(
    "/columns/{column_id}/entries",
    response_model=NoteEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_note_entry(
    column_id: str,
    entry_in: NoteEntryCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Add an entry to a column the current user owns."""
    db_column = db.query(NoteColumn).filter(
        NoteColumn.id == column_id,
        NoteColumn.user_id == current_user.id
    ).first()

    if not db_column:
        raise HTTPException(status_code=404, detail="Column not found")

    db_entry = NoteEntry(column_id=column_id, content=entry_in.content)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.put("/entries/{entry_id}", response_model=NoteEntryResponse)
def update_note_entry(
    entry_id: str,
    entry_in: NoteEntryUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Edit an entry's content. Ownership is verified via the parent column."""
    db_entry = (
        db.query(NoteEntry)
        .join(NoteColumn, NoteEntry.column_id == NoteColumn.id)
        .filter(NoteEntry.id == entry_id, NoteColumn.user_id == current_user.id)
        .first()
    )

    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db_entry.content = entry_in.content
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.delete("/entries/{entry_id}", status_code=status.HTTP_200_OK)
def delete_note_entry(
    entry_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a single entry. Ownership is verified via the parent column."""
    db_entry = (
        db.query(NoteEntry)
        .join(NoteColumn, NoteEntry.column_id == NoteColumn.id)
        .filter(NoteEntry.id == entry_id, NoteColumn.user_id == current_user.id)
        .first()
    )

    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(db_entry)
    db.commit()
    return {"detail": f"Deleted entry {entry_id}"}
