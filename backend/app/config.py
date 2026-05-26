import json

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ENV=production pulls DB_USER+DB_PASSWORD from AWS Secrets Manager via DB_SECRET_ARN.
    # ENV=local (default) requires DB_USER+DB_PASSWORD to be set directly.
    ENV: str = "local"
    DB_SECRET_ARN: str = ""
    DB_HOST: str = ""
    DB_PORT: int = 5432
    DB_NAME: str = "postgres"
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    AWS_REGION: str = "us-east-1"
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
    def _load_db_credentials(self):
        if self.ENV == "production" and not (self.DB_USER and self.DB_PASSWORD):
            if not self.DB_SECRET_ARN:
                raise ValueError("ENV=production requires DB_SECRET_ARN (or pre-set DB_USER+DB_PASSWORD).")
            import boto3
            client = boto3.client("secretsmanager", region_name=self.AWS_REGION)
            secret = json.loads(client.get_secret_value(SecretId=self.DB_SECRET_ARN)["SecretString"])
            self.DB_USER = secret["username"]
            self.DB_PASSWORD = secret["password"]
        if not (self.DB_USER and self.DB_PASSWORD and self.DB_HOST):
            raise ValueError(
                "Database not configured: set ENV=production + DB_SECRET_ARN + DB_HOST for AWS, "
                "or DB_USER + DB_PASSWORD + DB_HOST for local dev."
            )
        return self

    @property
    def DATABASE_URL(self) -> str:
        is_local_host = self.DB_HOST in ("localhost", "127.0.0.1") or self.DB_HOST.startswith("127.")
        ssl_query = "" if is_local_host else "?ssl=require"
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}{ssl_query}"
        )


settings = Settings()
