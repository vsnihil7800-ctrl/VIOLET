from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    target_calories: Optional[float] = Field(None, gt=0, description="Daily calorie goal")
    target_protein: Optional[float] = Field(None, gt=0, description="Daily protein goal in grams")

class UserPasswordReset(BaseModel):
    email: EmailStr

class UserPasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: str
    target_calories: float
    target_protein: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
