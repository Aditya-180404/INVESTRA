from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "INVESTRA"
    # Keep local development self-contained. Docker and production provide this
    # setting explicitly, so they use PostgreSQL instead.
    DATABASE_URL: str = "sqlite:///./investra.db"
    # Deliberately empty by default: deployment must provide a strong secret.
    JWT_SECRET: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for investigation shifts

    CORS_ORIGINS: str = "http://localhost:5173"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024
    STORAGE_PATH: str = "./storage/evidence"
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "qwen3.5:0.8b"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 10

    @property
    def storage_root(self) -> Path:
        return Path(self.STORAGE_PATH).resolve()

    class Config:
        env_file = ".env"

settings = Settings()
