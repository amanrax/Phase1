# backend/app/config.py
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    """
    Application settings with environment variable support.
    Uses pydantic-settings for Pydantic v2 compatibility.
    """
    
    # ======================================
    # MongoDB Configuration
    # ======================================
    MONGODB_URL: str = Field(
        ..., 
        description="MongoDB connection string (mongodb+srv://...)"
    )
    MONGODB_DB_NAME: str = Field(
        default="zambian_farmer_db",
        description="MongoDB database name"
    )

    # ======================================
    # JWT & Security
    # ======================================
    JWT_SECRET: str = Field(
        ..., 
        description="Secret key for JWT token signing"
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token expiration time in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token expiration time in days"
    )
    SECRET_KEY: str = Field(
        ..., 
        description="Secret key for encryption operations"
    )

    # ======================================
    # Redis / Celery (Background Tasks)
    # ======================================
    REDIS_URL: str = Field(
        default="redis://farmer-redis:6379/0",
        description="Redis connection URL for Celery"
    )

    # ======================================
    # Admin Seeder Credentials
    # ======================================
    SEED_ADMIN_EMAIL: str = Field(
        ..., 
        description="Email for seeded admin account"
    )
    SEED_ADMIN_PASSWORD: str = Field(
        ..., 
        description="Password for seeded admin account"
    )

    # ======================================
    # Application Settings
    # ======================================
    DEBUG: bool = Field(
        default=False,
        description="Enable debug mode (set to False in production)"
    )
    ENVIRONMENT: str = Field(
        default="development",
        description="Environment: development, staging, production"
    )
    UPLOAD_DIR: str = Field(
        default="/app/uploads",
        description="Base directory for file uploads"
    )
    MAX_UPLOAD_SIZE_MB: int = Field(
        default=10,
        description="Maximum file upload size in megabytes"
    )
    
    # ======================================
    # CORS Configuration
    # ======================================
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:8000",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:8000",
            "http://127.0.0.1:5173",
            "http://13.204.83.198:8000",
            "https://cem-backend-alb-v2-1010955380.ap-south-1.elb.amazonaws.com",
        ],
        description="Allowed CORS origins (do NOT use '*' in production)"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )
    CORS_ALLOW_METHODS: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        description="Allowed HTTP methods for CORS"
    )
    CORS_ALLOW_HEADERS: List[str] = Field(
        default=["*"],
        description="Allowed headers for CORS"
    )

    # ======================================
    # File Upload Settings
    # ======================================
    ALLOWED_IMAGE_EXTENSIONS: List[str] = Field(
        default=["jpg", "jpeg", "png"],
        description="Allowed image file extensions"
    )
    ALLOWED_DOCUMENT_EXTENSIONS: List[str] = Field(
        default=["pdf", "doc", "docx"],
        description="Allowed document file extensions"
    )

    # ======================================
    # Pydantic v2 Configuration
    # ======================================
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra environment variables
        validate_default=True,
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings loader - ensures settings are loaded only once.
    
    Returns:
        Settings: Application settings instance
    """
    return Settings()


# Global settings instance
settings = get_settings()

# Production override: if running in production, restrict CORS to the EC2 host only.
# IMPORTANT: remove or refine this to your production domains before long-term use.
try:
    if settings.ENVIRONMENT == "production":
        settings.CORS_ORIGINS = [
            "http://13.204.83.198:8000",
        ]
        settings.CORS_ALLOW_CREDENTIALS = True
        settings.CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH","OPTIONS"]
        settings.CORS_ALLOW_HEADERS = ["*"]
except Exception:
    # If settings object is immutable or assignment fails, skip override
    pass

# Usage:
# from app.config import settings
# print(settings.MONGODB_URL)
