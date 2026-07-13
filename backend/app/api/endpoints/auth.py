import hashlib
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserPasswordReset, UserPasswordResetConfirm
from app.schemas.token import Token, TokenRefreshRequest

router = APIRouter()

def hash_token(token: str) -> str:
    """Fast SHA-256 hashing for database storage of session refresh tokens."""
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system."
        )
    
    # Create user
    db_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=security.get_password_hash(user_in.password),
        is_active=True,
        is_superuser=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(login_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Any:
    """Login with username (email) and password (standard OAuth2 / JSON compatible)."""
    user = db.query(User).filter(User.email == login_data.username).first()
    if not user or not security.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Generate tokens
    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)
    
    # Save hashed refresh token to user
    user.hashed_refresh_token = hash_token(refresh_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/login-json", response_model=Token)
def login_json(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    """Alternative login for clients submitting raw JSON content."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)
    
    user.hashed_refresh_token = hash_token(refresh_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
def refresh(token_data: TokenRefreshRequest, db: Session = Depends(get_db)) -> Any:
    """Refresh tokens using a valid, active refresh token."""
    try:
        payload = security.decode_token(token_data.refresh_token, is_refresh=True)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid refresh token payload"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expired or invalid refresh token"
        )
    
    # Fetch user
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or inactive"
        )
    
    # Validate stored refresh token hash
    incoming_hash = hash_token(token_data.refresh_token)
    if not user.hashed_refresh_token or user.hashed_refresh_token != incoming_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Refresh token revoked or invalid"
        )
        
    # Rotate tokens: Issue a new pair
    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)
    
    # Save the new refresh token's hash
    user.hashed_refresh_token = hash_token(refresh_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)) -> Any:
    """Invalidate current refresh token (logout)."""
    current_user.hashed_refresh_token = None
    db.commit()
    return {"detail": "Successfully logged out"}

@router.post("/reset-password-request")
def reset_password_request(reset_data: UserPasswordReset, db: Session = Depends(get_db)) -> Any:
    """Simulate a password reset token request (output to console)."""
    user = db.query(User).filter(User.email == reset_data.email).first()
    if user:
        # Generate token using access token creation helper, expiring in 10 minutes
        reset_token = security.create_access_token(subject=user.email, expires_delta=timedelta(minutes=10))
        # Print reset link to terminal for demonstration
        print(f"\n[RESET PASSWORD LINK] (Copy link below to reset):\nhttp://localhost:5173/reset-password?token={reset_token}\n")
    return {"detail": "If the email exists, a password reset link has been generated."}

@router.post("/reset-password")
def reset_password(confirm_data: UserPasswordResetConfirm, db: Session = Depends(get_db)) -> Any:
    """Reset password using the reset token."""
    try:
        payload = security.decode_token(confirm_data.token, is_refresh=False)
        email = payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = security.get_password_hash(confirm_data.new_password)
    user.hashed_refresh_token = None  # Invalidate current session on password change
    db.commit()
    
    return {"detail": "Password successfully reset"}
