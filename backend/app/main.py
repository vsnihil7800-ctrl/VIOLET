from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.endpoints import auth, users, finance, investments, fitness, productivity, schedule, ai, assistant
from app.core.config import settings
from app.core.database import Base, engine

# Automatically create tables for SQLite/dev setups on start.
# This runs before Alembic version checks, which is great for instant dev verification.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Mount static files for uploaded food images
uploads_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# CORS configurations
origins = []
if isinstance(settings.CORS_ORIGINS, list):
    origins = [str(origin) for origin in settings.CORS_ORIGINS]
else:
    origins = [settings.CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(finance.router, prefix=f"{settings.API_V1_STR}/finance", tags=["finance"])
app.include_router(investments.router, prefix=f"{settings.API_V1_STR}/investments", tags=["investments"])
app.include_router(fitness.router, prefix=f"{settings.API_V1_STR}/fitness", tags=["fitness"])
app.include_router(productivity.router, prefix=f"{settings.API_V1_STR}/productivity", tags=["productivity"])
app.include_router(schedule.router, prefix=f"{settings.API_V1_STR}/schedule", tags=["schedule"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
app.include_router(assistant.router, prefix=f"{settings.API_V1_STR}/assistant", tags=["assistant"])

@app.get("/")
def root():
    return {"message": "Welcome to Violet - AI Personal Assistant Backend API"}
