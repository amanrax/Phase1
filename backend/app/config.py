# backend/app/config.py
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List, Optional
import os
import logging


# Setup logger for config
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """
    Application settings with environment variable support.
    Uses pydantic-settings for Pydantic v2 compatibility.
    Includes validation, logging, and production-ready defaults.
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

    @field_validator('MONGODB_URL')
    @classmethod
    def validate_mongodb_url(cls, v: str) -> str:
        if not v.startswith(('mongodb://', 'mongodb+srv://')):
            raise ValueError("MONGODB_URL must start with 'mongodb://' or 'mongodb+srv://'")
        logger.info(f"✅ MongoDB URL validated: {v[:20]}...")
        return v


    # ======================================
    # JWT & Security
    # ======================================
    JWT_SECRET: str = Field(
        ..., 
        description="Secret key for JWT token signing",
        min_length=32
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token expiration time in minutes",
        ge=5,
        le=1440
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token expiration time in days",
        ge=1,
        le=90
    )
    SECRET_KEY: str = Field(
        ..., 
        description="Secret key for encryption operations",
        min_length=32
    )

    @field_validator('JWT_SECRET', 'SECRET_KEY')
    @classmethod
    def validate_secrets(cls, v: str, info) -> str:
        if len(v) < 32:
            raise ValueError(f"{info.field_name} must be at least 32 characters long")
        logger.info(f"✅ {info.field_name} validated (length: {len(v)})")
        return v


    # ======================================
    # Redis / Celery (Background Tasks)
    # ======================================
    REDIS_URL: str = Field(
        default="redis://farmer-redis:6379/0",
        description="Redis connection URL for Celery"
    )

    @field_validator('REDIS_URL')
    @classmethod
    def validate_redis_url(cls, v: str) -> str:
        if not v.startswith('redis://'):
            raise ValueError("REDIS_URL must start with 'redis://'")
        logger.info(f"✅ Redis URL validated: {v}")
        return v


    # ======================================
    # Admin Seeder Credentials
    # ======================================
    SEED_ADMIN_EMAIL: str = Field(
        ..., 
        description="Email for seeded admin account"
    )
    SEED_ADMIN_PASSWORD: str = Field(
        ..., 
        description="Password for seeded admin account",
        min_length=8
    )

    @field_validator('SEED_ADMIN_EMAIL')
    @classmethod
    def validate_admin_email(cls, v: str) -> str:
        if '@' not in v or '.' not in v:
            raise ValueError("SEED_ADMIN_EMAIL must be a valid email address")
        logger.info(f"✅ Admin email validated: {v}")
        return v

    @field_validator('SEED_ADMIN_PASSWORD')
    @classmethod
    def validate_admin_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("SEED_ADMIN_PASSWORD must be at least 8 characters long")
        logger.info(f"✅ Admin password validated (length: {len(v)})")
        return v


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
        description="Maximum file upload size in megabytes",
        ge=1,
        le=100
    )

    @field_validator('ENVIRONMENT')
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = ['development', 'staging', 'production']
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of: {allowed}")
        logger.info(f"🌍 Environment: {v.upper()}")
        return v
    
    
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
            "http://localhost",
            "capacitor://localhost",
            "ionic://localhost",
            "http://13.204.83.198:8000",
        ],
        description="Allowed CORS origins"
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
        default=["jpg", "jpeg", "png", "gif", "webp"],
        description="Allowed image file extensions"
    )
    ALLOWED_DOCUMENT_EXTENSIONS: List[str] = Field(
        default=["pdf", "doc", "docx", "txt"],
        description="Allowed document file extensions"
    )


    # ======================================
    # API Configuration
    # ======================================
    API_VERSION: str = Field(
        default="2.0.0",
        description="API version"
    )
    API_TITLE: str = Field(
        default="Zambian Farmer System API",
        description="API title"
    )
    API_DESCRIPTION: str = Field(
        default="Backend API for Zambian Farmer Registration & Support System",
        description="API description"
    )


    # ======================================
    # Performance Settings
    # ======================================
    REQUEST_TIMEOUT_SECONDS: int = Field(
        default=30,
        description="Request timeout in seconds",
        ge=5,
        le=300
    )
    MAX_CONNECTIONS: int = Field(
        default=100,
        description="Maximum concurrent connections",
        ge=10,
        le=1000
    )


    # ======================================
    # Pydantic v2 Configuration
    # ======================================
    model_config = SettingsConfigDict(
        env_file=".env.production" if os.getenv("ENVIRONMENT") == "production" else ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        validate_default=True,
    )


    def log_configuration(self):
        """Log current configuration (safe - no secrets)"""
        logger.info("=" * 60)
        logger.info("⚙️  Configuration Summary")
        logger.info("=" * 60)
        logger.info(f"   Environment: {self.ENVIRONMENT}")
        logger.info(f"   Debug Mode: {self.DEBUG}")
        logger.info(f"   MongoDB Database: {self.MONGODB_DB_NAME}")
        logger.info(f"   Redis URL: {self.REDIS_URL}")
        logger.info(f"   Upload Directory: {self.UPLOAD_DIR}")
        logger.info(f"   Max Upload Size: {self.MAX_UPLOAD_SIZE_MB}MB")
        logger.info(f"   JWT Algorithm: {self.JWT_ALGORITHM}")
        logger.info(f"   Access Token Expiry: {self.ACCESS_TOKEN_EXPIRE_MINUTES} min")
        logger.info(f"   Refresh Token Expiry: {self.REFRESH_TOKEN_EXPIRE_DAYS} days")
        logger.info(f"   CORS Origins: {len(self.CORS_ORIGINS)} configured")
        logger.info(f"   CORS Credentials: {self.CORS_ALLOW_CREDENTIALS}")
        logger.info("=" * 60)


    def is_production(self) -> bool:
        """Check if running in production"""
        return self.ENVIRONMENT == "production"
    
    
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.ENVIRONMENT == "development"


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings loader - ensures settings are loaded only once.
    Validates all settings and logs configuration on first load.
    
    Returns:
        Settings: Application settings instance
    
    Raises:
        ValidationError: If any setting is invalid
    """
    try:
        logger.info("🔧 Loading application settings...")
        settings = Settings()
        
        # Apply production overrides
        if settings.is_production():
            logger.info("🔒 Applying production security settings...")
            
            # Production CORS: Allow all origins for mobile compatibility
            settings.CORS_ALLOW_CREDENTIALS = False  # Required when using "*"
            logger.info("   CORS: Allow all origins (mobile app compatibility)")
            logger.info("   CORS: Credentials disabled (required for wildcard)")
            
            # Ensure debug is off
            if settings.DEBUG:
                logger.warning("⚠️  DEBUG mode is ON in production - forcing to False")
                settings.DEBUG = False
        
        # Log configuration summary
        settings.log_configuration()
        
        logger.info("✅ Settings loaded successfully")
        return settings
        
    except Exception as e:
        logger.error(f"❌ Failed to load settings: {e}")
        logger.error(f"   Error type: {type(e).__name__}")
        raise


# Global settings instance
settings = get_settings()


# Expose commonly used settings
__all__ = ['settings', 'get_settings', 'Settings']
