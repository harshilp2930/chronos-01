from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    DEBUG: bool = True

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/chronos1"

    # ── JWT / Security ───────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-to-a-256-bit-random-hex-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440   # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ─────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── External APIs ────────────────────────────────────────────────────────
    NASA_JPL_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()


settings = get_settings()
