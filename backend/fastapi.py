"""Main application entry point for Thibitisha Skills."""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure project root is in sys.path so 'backend.*' imports resolve anywhere
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import Base, engine, SessionLocal
from backend.routes.applications import router as applications_router
from backend.routes.assessments import router as assessments_router
from backend.routes.auth import router as auth_router
from backend.routes.cv import router as cv_router
from backend.routes.employers import router as employers_router
from backend.routes.jobs import router as jobs_router
from backend.routes.leaderboard import router as leaderboard_router
from backend.routes.skills import router as skills_router
from backend.routes.users import router as users_router
from backend.routes.voice_interviews import router as voice_interviews_router
from backend.seed import seed_admin, seed_skills
from backend.utils import utcnow


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directories exist
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    settings.voice_upload_path.mkdir(parents=True, exist_ok=True)

    # Initialize tables and seed initial data
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_skills(db)
            seed_admin(db)
        finally:
            db.close()
    except Exception as exc:
        import logging
        logging.getLogger("uvicorn.error").warning("Database startup notice: %s", exc)

    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Skill verification and skills-first recruitment platform backend.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware — never pair allow_credentials with wildcard origins.
origins = settings.cors_origins
if not origins:
    raise RuntimeError(
        "CORS_ORIGINS is empty. Set explicit frontend origins in backend/.env "
        "(e.g. http://localhost:5173)."
    )
if any(origin.strip() == "*" for origin in origins):
    raise RuntimeError(
        "CORS_ORIGINS must not be '*" + "' when the API uses credentialed requests. "
        "List exact frontend origins in backend/.env."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(employers_router)
app.include_router(cv_router)
app.include_router(skills_router)
app.include_router(assessments_router)
app.include_router(leaderboard_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(voice_interviews_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "documentation": "/docs",
        "redoc": "/redoc",
        "timestamp": utcnow().isoformat(),
    }


@app.get("/health", tags=["Health"])
def health_check():
    db_ok = False
    try:
        from sqlalchemy import text

        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "gemini_configured": settings.gemini_configured,
        "msingi_configured": settings.msingi_configured,
        "sms_configured": settings.sms_configured,
        "timestamp": utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.fastapi:app", host="0.0.0.0", port=8000, reload=True)

