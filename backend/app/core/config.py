import os
from typing import List, Union
from pydantic import ConfigDict, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Violet AI Personal Assistant"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = "sqlite:///./violet.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_postgres_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v
    
    JWT_SECRET_KEY: str = "violet-local-development-secret-key-32-bytes-long-for-jwt-signing"
    JWT_REFRESH_SECRET_KEY: str = "violet-local-development-refresh-secret-key-32-bytes-long-for-jwt-signing"
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Live pricing feed for stocks (free tier: https://finnhub.io/register)
    FINNHUB_API_KEY: str = ""
    
    # CORS Origins. Can be a JSON-formatted list of strings.
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"]

    @field_validator("CORS_ORIGINS")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        import json
        return json.loads(v)

    # Use model_config for Pydantic v2
    model_config = ConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
# Print loaded database URL just to verify pathing during development
print(f"Loaded config database URL: {settings.DATABASE_URL}")
