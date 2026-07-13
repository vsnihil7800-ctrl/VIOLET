from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(deps.get_current_user)) -> Any:
    """Get profile of current logged-in user."""
    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update profile details of current logged-in user."""
    if user_in.email is not None:
        # Check if email exists elsewhere
        existing_user = db.query(User).filter(User.email == user_in.email).filter(User.id != current_user.id).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered to another account"
            )
        current_user.email = user_in.email
        
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
        
    if user_in.password is not None:
        current_user.hashed_password = get_password_hash(user_in.password)
        # Invalidate current session on password change to trigger re-auth
        current_user.hashed_refresh_token = None
        
    db.commit()
    db.refresh(current_user)
    return current_user
