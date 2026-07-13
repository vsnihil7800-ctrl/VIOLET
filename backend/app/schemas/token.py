from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class LoginRequest(BaseModel):
    username: str  # OAuth2 standard requires username field, which is email for us
    password: str
