from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "INVESTRA"
    # Keep local development self-contained. Docker and production provide this
    # setting explicitly, so they use PostgreSQL instead.
    DATABASE_URL: str = "sqlite:///./investra.db"
    SECRET_KEY: str = "super_secret_key_investra_police_intel_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for investigation shifts

    # Administrator URL encoding protection
    # Encoded token representation of INVESTRA_ADMIN_2026
    ADMIN_URL_ENCODED_KEY: str = "%49%4e%56%45%53%54%52%41%5f%41%44%4d%49%4e%5f%32%30%32%36"
    ADMIN_SECRET_RAW: str = "INVESTRA_ADMIN_2026"

    class Config:
        env_file = ".env"

settings = Settings()
