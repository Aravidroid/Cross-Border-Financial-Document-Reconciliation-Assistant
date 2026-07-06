from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Configuration
    Reads values from .env automatically.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # -----------------------------
    # FastAPI
    # -----------------------------
    APP_NAME: str = "ICFDRA Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # -----------------------------
    # PostgreSQL
    # -----------------------------
    DATABASE_URL: str

    # -----------------------------
    # AWS
    # -----------------------------
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "ap-south-1"
    AWS_BUCKET_NAME: str

    # -----------------------------
    # Gemini
    # -----------------------------
    GOOGLE_API_KEY: str

    # -----------------------------
    # FX
    # -----------------------------
    FX_API_URL: str = "https://api.frankfurter.app"
    BASE_CURRENCY: str = "USD"

    # -----------------------------
    # Upload
    # -----------------------------
    MAX_UPLOAD_SIZE_MB: int = 20

    ALLOWED_EXTENSIONS: list[str] = Field(
        default_factory=lambda: [
            "pdf",
            "png",
            "jpg",
            "jpeg",
        ]
    )


@lru_cache
def get_settings():
    """
    Returns a cached Settings object.

    The settings file is only read once during startup.
    """
    return Settings()


settings = get_settings()