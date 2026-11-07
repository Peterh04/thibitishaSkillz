"""Application settings loaded from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    """Values come from backend/.env or the process environment."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Thibitisha Skills"
    DATABASE_URL: str = (
        "mysql+pymysql://root:password@localhost:3306/thibitisha_skills?charset=utf8mb4"
    )
    JWT_SECRET_KEY: str = "change-this-to-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    UPLOAD_DIR: str = ""
    MAX_CV_SIZE_MB: int = 5

    QUESTIONS_PER_ASSESSMENT: int = 10
    PASS_PERCENTAGE: float = 50
    MAX_ASSESSMENTS_PER_DAY: int = 5

    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    ADMIN_NAME: str = "Platform Admin"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def upload_path(self) -> Path:
        if self.UPLOAD_DIR:
            return Path(self.UPLOAD_DIR)
        return BASE_DIR / "uploads" / "cvs"

    @property
    def max_cv_bytes(self) -> int:
        return self.MAX_CV_SIZE_MB * 1024 * 1024


settings = Settings()
