from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from pathlib import Path
import logging
import os

# Import configuration and database
from app.config import settings
from app.database import connect_to_database, close_database_connection
from app.middleware.logging_middleware import LoggingMiddleware

# Import routers
from app.routes import (
    auth,
    farmers,
    sync,
    uploads,
    farmers_qr,
    health,
    users,
    geo,
    operators,
    dashboard,
    reports,
    supplies,
    logs,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================
# Application Lifespan Management
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Zambian Farmer System API...")
    await connect_to_database()
    logger.info("✅ Application startup complete")
    yield
    logger.info("🧹 Shutting down application...")
    await close_database_connection()
    logger.info("✅ Application shutdown complete")

# ============================================
# Initialize FastAPI Application
# ============================================
app = FastAPI(
    title="Zambian Farmer System API",
    description="Backend API for Zambian Farmer Registration & Support System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    redirect_slashes=False,  # Prevent automatic trailing slash redirects
)

# ============================================
# CORS Configuration
# ============================================

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
]

# Allow overriding frontend origin via env (useful in Codespaces)
frontend_origin_env = os.getenv("FRONTEND_ORIGIN", "")
if frontend_origin_env and frontend_origin_env not in allowed_origins:
    # Add the explicit frontend origin provided via environment
    allowed_origins.append(frontend_origin_env)

# Allow GitHub Codespaces subdomains matching either port 5173/8000/3000
allow_origin_regex = r"^https:\/\/[\-a-z0-9]+-(?:5173|8000|3000)\.app\.github\.dev$"

cors_kwargs = dict(
    allow_origins=allowed_origins, # Now contains explicit origins + frontend_origin_env
    allow_origin_regex=allow_origin_regex, # Also consider regex for dynamic Codespaces origins
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    expose_headers=["Content-Length", "Content-Type", "Authorization"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

app.add_middleware(CORSMiddleware, **cors_kwargs)
app.add_middleware(LoggingMiddleware)

# Removed EnsureCORSHeadersMiddleware as CORSMiddleware with regex should handle Codespaces

# ============================================
# Register API Routers
# ============================================

# IMPORTANT FIX:
# All routers declared with prefix="/auth", "/farmers", etc.
# MUST be mounted under ONE prefix: "/api"

app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(farmers.router, prefix="/api", tags=["Farmers"])
app.include_router(geo.router, prefix="/api")
app.include_router(operators.router, prefix="/api", tags=["Operators"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(supplies.router, prefix="/api", tags=["Supply Requests"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
app.include_router(sync.router, prefix="/api", tags=["Synchronization"])
app.include_router(farmers_qr.router, prefix="/api", tags=["Farmers QR"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(logs.router, prefix="/api", tags=["Logs"])

logger.info("✅ All API routers registered")

# ============================================
# Static Files (Uploads)
# ============================================
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
logger.info("✅ Static files mounted at /uploads")

# ============================================
# Root Endpoint
# ============================================
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Zambian Farmer System API",
        "status": "running",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# ============================================
# Global Exception Handlers
# ============================================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Custom handler for Pydantic validation errors.
    Logs detailed validation errors and returns user-friendly response.
    """
    logger.error(f"Validation error on {request.method} {request.url.path}")
    logger.error(f"Request body: {await request.body()}")
    logger.error(f"Validation errors: {exc.errors()}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "body": exc.body if hasattr(exc, 'body') else None
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An error occurred"
        }
    )
