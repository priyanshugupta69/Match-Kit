from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    NEON_ENDPOINT: str = ""
    ANTHROPIC_API_KEY: str = ""
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    RERANK_TOP_N: int = 10

    model_config = {"env_file": ".env"}


settings = Settings()
