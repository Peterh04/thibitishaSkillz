"""Application settings loaded from environment variables / backend/.env."""

from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

# Weak / demo values that must never be accepted as real configuration.
_FORBIDDEN_JWT = {
    "change-this-to-a-long-random-string",
    "replace-this-with-a-secure-random-secret-key-min-32-chars",
    "secret",
    "password",
}
_FORBIDDEN_DB_SNIPPETS = (
    "root:password@",
    "user:password@",
    "://:@",
)


class Settings(BaseSettings):
    """Secrets and environment-specific values come from backend/.env or the process env.

    Required (no code defaults): DATABASE_URL, JWT_SECRET_KEY.
    Optional keys have safe non-secret defaults only.
    """

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Thibitisha Skills"

    # Required secrets / connection — must be set in .env
    DATABASE_URL: str = Field(..., min_length=12)
    JWT_SECRET_KEY: str = Field(..., min_length=32)

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # MsingiAI voice interviewer (TTS / STT) — server-side only
    # Docs: https://platform.msingiai.com/docs
    MSINGI_BASE_URL: str = "https://api.msingiai.com"
    MSINGI_API_KEY: str = ""
    MSINGI_DEFAULT_VOICE_ID: str = "female3"
    VOICE_INTERVIEW_QUESTIONS: int = 5
    MAX_VOICE_ANSWER_SECONDS: int = 120

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    UPLOAD_DIR: str = ""
    MAX_CV_SIZE_MB: int = 5

    QUESTIONS_PER_ASSESSMENT: int = 10
    PASS_PERCENTAGE: float = 50
    MAX_ASSESSMENTS_PER_DAY: int = 5

    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    ADMIN_NAME: str = "Platform Admin"

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def jwt_must_be_strong(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if len(cleaned) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters (set it in backend/.env)")
        if cleaned.lower() in _FORBIDDEN_JWT or cleaned.startswith(
            "replace-this-with-a-secure-random-secret-key"
        ):
            raise ValueError(
                "JWT_SECRET_KEY is still a placeholder. Set a long random secret in backend/.env"
            )
        return cleaned

    @field_validator("DATABASE_URL")
    @classmethod
    def database_url_must_be_real(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise ValueError("DATABASE_URL is required in backend/.env")
        lowered = cleaned.lower()
        for snippet in _FORBIDDEN_DB_SNIPPETS:
            if snippet in lowered:
                raise ValueError(
                    "DATABASE_URL still uses a placeholder password. Set the real URL in backend/.env"
                )
        allowed_prefixes = (
            "mysql+",
            "mysql://",
            "sqlite+",
            "sqlite://",
            "postgresql+",
            "postgres+",
            "postgresql://",
            "postgres://",
        )
        if not lowered.startswith(allowed_prefixes):
            raise ValueError(
                "DATABASE_URL must be a SQLAlchemy URL (e.g. mysql+pymysql://... or sqlite:///:memory:)"
            )
        return cleaned

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

    @property
    def gemini_configured(self) -> bool:
        return bool(self.GEMINI_API_KEY.strip())

    @property
    def msingi_configured(self) -> bool:
        return bool(self.MSINGI_API_KEY.strip())

    @property
    def voice_upload_path(self) -> Path:
        return self.upload_path.parent / "voice"


settings = Settings()
