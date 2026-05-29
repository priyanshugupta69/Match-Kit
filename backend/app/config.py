import ipaddress

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Postgres lives on GCP Cloud SQL, reached over the shared VPC by private IP.
    # DB_USER/DB_PASSWORD come straight from the runtime env (no secrets-manager hop).
    ENV: str = "local"
    DB_HOST: str = ""
    DB_PORT: int = 5432
    DB_NAME: str = "postgres"
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    APP_PORT: int = 9000
    # Gemini: use VERTEX_AI_API_KEY (Vertex express) or GEMINI_API_KEY (same secret, alternate name)
    VERTEX_AI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    # vertex_express = Vertex AI express key | google_ai_studio = https://aistudio.google.com/apikey
    GEMINI_CLIENT: str = "vertex_express"
    GEMINI_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    RERANK_TOP_N: int = 10

    # Auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60 * 24  # 24 hours
    VERIFICATION_TOKEN_EXPIRY_MINUTES: int = 60 * 24  # 24 hours

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3001/auth/google/callback"

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    APP_URL: str = "http://localhost:3001"

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    @model_validator(mode="after")
    def _check_db_credentials(self):
        if not (self.DB_USER and self.DB_PASSWORD and self.DB_HOST):
            raise ValueError(
                "Database not configured: set DB_HOST + DB_USER + DB_PASSWORD."
            )
        return self

    @property
    def DATABASE_URL(self) -> str:
        # SSL is skipped for localhost and RFC1918 private IPs (Cloud SQL over VPC);
        # any public hostname still gets ssl=require.
        ssl_query = "" if _is_private_or_local(self.DB_HOST) else "?ssl=require"
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}{ssl_query}"
        )


def _is_private_or_local(host: str) -> bool:
    if host == "localhost" or host.startswith("127."):
        return True
    try:
        return ipaddress.ip_address(host).is_private
    except ValueError:
        return False  # hostname (not an IP) — assume public, require SSL


settings = Settings()
