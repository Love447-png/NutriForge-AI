from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "app" / "data"
KNOWLEDGE_DIR = DATA_DIR / "knowledge"
VECTOR_DIR = DATA_DIR / "vector_store"


class Settings(BaseSettings):
    app_name: str = "NutriForge"
    environment: str = "development"
    log_level: str = "INFO"
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    database_url: str = f"sqlite:///{(DATA_DIR / 'nutriforge.sqlite3').as_posix()}"
    jwt_secret_key: str = "replace-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 7
    rag_backend: str = "lexical"
    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "llama3.2:3b"
    vision_model: str = "llava:7b"
    embed_model: str = "nomic-embed-text"
    default_monthly_growth_cm: float = 0.55
    default_monthly_weight_gain_kg: float = 0.18

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


def validate_security_settings() -> None:
    env = settings.environment.strip().lower()
    secret = settings.jwt_secret_key.strip()
    weak_secrets = {"replace-me-in-production", "change-this-in-production", "default", "password"}
    if env != "development" and (len(secret) < 32 or secret in weak_secrets):
        raise RuntimeError(
            "JWT_SECRET_KEY is weak or missing. Set a strong key (32+ chars) before running in non-development environments."
        )
