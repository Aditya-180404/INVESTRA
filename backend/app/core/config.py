from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "INVESTRA"
    DATABASE_URL: str = "sqlite:///./investra.db"
    SECRET_KEY: str = "super_secret_key_for_hackathon_only_replace_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
