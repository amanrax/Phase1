from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from pathlib import Path
import logging
import os
import traceback
import time
import uuid


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
    geo_custom,
    operators,
    dashboard,
    reports,
    supplies,
    logs,
    files,
    app_version,
    ethnic_groups,
)


# ============================================
# Enhanced Logging Configuration
# ============================================
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Reduce noise from third-party libraries
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)


# ============================================
# Application Lifespan Management
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("🚀 Starting Zambian Farmer System API v2.0.0")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Debug Mode: {settings.DEBUG}")
    logger.info("=" * 60)
    
    try:
        await connect_to_database()
        logger.info("✅ Database connection established")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        raise
    
    logger.info("✅ Application startup complete")
    
    yield
    
    logger.info("🧹 Shutting down application...")
    try:
        await close_database_connection()
        logger.info("✅ Database connection closed")
    except Exception as e:
        logger.error(f"❌ Error closing database: {e}")
    
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
    redirect_slashes=False,
)


# ============================================
# Request ID Middleware (Track Every Request)
# ============================================
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    
    # Add to response headers for debugging
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    
    return response


# ============================================
# Comprehensive Request Logging Middleware
# ============================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = getattr(request.state, "request_id", "unknown")
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"[{request_id}] 📨 {request.method} {request.url.path}")
    logger.debug(f"[{request_id}]    Client: {request.client.host if request.client else 'unknown'}")
    logger.debug(f"[{request_id}]    Origin: {request.headers.get('origin', 'none')}")
    logger.debug(f"[{request_id}]    User-Agent: {request.headers.get('user-agent', 'none')[:50]}")
    
    # Log OPTIONS requests in detail
    if request.method == "OPTIONS":
        logger.info(f"[{request_id}] 🔵 CORS Preflight Request")
        logger.debug(f"[{request_id}]    Access-Control-Request-Method: {request.headers.get('access-control-request-method', 'none')}")
        logger.debug(f"[{request_id}]    Access-Control-Request-Headers: {request.headers.get('access-control-request-headers', 'none')}")
    
    try:
        response = await call_next(request)
        
        # Calculate request duration
        duration = (time.time() - start_time) * 1000
        
        # Log response
        status_emoji = "✅" if response.status_code < 400 else "⚠️" if response.status_code < 500 else "❌"
        logger.info(f"[{request_id}] {status_emoji} {response.status_code} | {duration:.2f}ms")
        
        return response
        
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"[{request_id}] ❌ Exception during request processing ({duration:.2f}ms)")
        logger.error(f"[{request_id}]    Error: {str(e)}")
        logger.error(f"[{request_id}]    Traceback:\n{traceback.format_exc()}")
        raise


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
    "http://localhost",
    "capacitor://localhost",
    "ionic://localhost",
    "http://13.204.83.198:8000",
]

frontend_origin_env = os.getenv("FRONTEND_ORIGIN", "")
if frontend_origin_env and frontend_origin_env not in allowed_origins:
    allowed_origins.append(frontend_origin_env)
    logger.info(f"Added FRONTEND_ORIGIN to CORS: {frontend_origin_env}")

allow_origin_regex = r"^https:\/\/[\-a-z0-9]+-(?:5173|8000|3000)\.app\.github\.dev$"

# Production: Allow all origins for mobile compatibility
if settings.ENVIRONMENT == "production":
    logger.info("🌍 CORS: Allowing all origins (production mode for mobile)")
    cors_kwargs = dict(
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Length", "Content-Type", "Authorization", "X-Request-ID"],
        max_age=3600,
    )
else:
    logger.info(f"🌍 CORS: Allowing specific origins ({len(allowed_origins)} configured)")
    cors_kwargs = dict(
        allow_origins=allowed_origins,
        allow_origin_regex=allow_origin_regex,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
        expose_headers=["Content-Length", "Content-Type", "Authorization", "X-Request-ID"],
        max_age=3600,
    )


# ============================================
# CORS Preflight Handler (Runs FIRST)
# ============================================
@app.middleware("http")
async def preflight_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        request_id = getattr(request.state, "request_id", "unknown")
        
        origin = request.headers.get("origin") or "*"
        request_method = request.headers.get("access-control-request-method", "")
        request_headers = request.headers.get("access-control-request-headers", "*")
        
        logger.info(f"[{request_id}] ✈️  Handling OPTIONS preflight")
        logger.debug(f"[{request_id}]    Origin: {origin}")
        logger.debug(f"[{request_id}]    Requested Method: {request_method}")
        logger.debug(f"[{request_id}]    Requested Headers: {request_headers}")
        
        allow_headers = ",".join(settings.CORS_ALLOW_HEADERS) if settings.CORS_ALLOW_HEADERS != ["*"] else request_headers
        allow_methods = ",".join(settings.CORS_ALLOW_METHODS)
        
        headers = {
            "Access-Control-Allow-Origin": "*" if settings.ENVIRONMENT == "production" else origin,
            "Access-Control-Allow-Methods": allow_methods,
            "Access-Control-Allow-Headers": allow_headers,
            "Access-Control-Allow-Credentials": "false" if settings.ENVIRONMENT == "production" else "true",
            "Access-Control-Max-Age": "3600",
            "X-Request-ID": request_id,
        }
        
        logger.info(f"[{request_id}] ✅ Returning 200 OK for preflight")
        return Response(status_code=200, content=b"", headers=headers)
    
    return await call_next(request)


# Add CORS middleware
app.add_middleware(CORSMiddleware, **cors_kwargs)
app.add_middleware(LoggingMiddleware)


# ============================================
# Cache Control Middleware
# ============================================
@app.middleware("http")
async def cache_control_middleware(request: Request, call_next):
    response = await call_next(request)
    
    try:
        path = request.url.path or ""
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Vary"] = response.headers.get("Vary", "Origin, Authorization")
    except Exception as e:
        logger.warning(f"Failed to set cache headers: {e}")
    
    return response


# ============================================
# Global OPTIONS Fallback
# ============================================
@app.options("/{full_path:path}", include_in_schema=False)
async def global_options(full_path: str, request: Request):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] 🔄 Global OPTIONS handler for /{full_path}")
    
    origin = request.headers.get("origin") or "*"
    allow_headers = ",".join(settings.CORS_ALLOW_HEADERS) if settings.CORS_ALLOW_HEADERS != ["*"] else request.headers.get("access-control-request-headers", "*")
    allow_methods = ",".join(settings.CORS_ALLOW_METHODS)
    
    headers = {
        "Access-Control-Allow-Origin": "*" if settings.ENVIRONMENT == "production" else origin,
        "Access-Control-Allow-Methods": allow_methods,
        "Access-Control-Allow-Headers": allow_headers,
        "Access-Control-Allow-Credentials": "false" if settings.ENVIRONMENT == "production" else "true",
        "Access-Control-Max-Age": "3600",
        "X-Request-ID": request_id,
    }
    
    return Response(status_code=200, content=b"", headers=headers)


# ============================================
# Register API Routers
# ============================================
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(farmers.router, prefix="/api", tags=["Farmers"])
app.include_router(geo.router, prefix="/api")
app.include_router(geo_custom.router, prefix="/api")
app.include_router(ethnic_groups.router, prefix="/api", tags=["Ethnic Groups"])
app.include_router(operators.router, prefix="/api", tags=["Operators"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(supplies.router, prefix="/api", tags=["Supply Requests"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
app.include_router(files.router, prefix="/api", tags=["Files"])
app.include_router(sync.router, prefix="/api", tags=["Synchronization"])
app.include_router(farmers_qr.router, prefix="/api", tags=["Farmers QR"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(logs.router, prefix="/api", tags=["Logs"])
app.include_router(app_version.router, tags=["App Version"])

logger.info("✅ All API routers registered")


# ============================================
# Static Files
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
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "health": "/api/health"
    }


# ============================================
# Global Exception Handlers
# ============================================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(f"[{request_id}] ❌ Validation Error on {request.method} {request.url.path}")
    logger.error(f"[{request_id}]    Errors: {exc.errors()}")
    
    try:
        body = await request.body()
        logger.error(f"[{request_id}]    Request Body: {body.decode('utf-8')[:500]}")
    except:
        pass
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "request_id": request_id
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(f"[{request_id}] ❌ Unhandled Exception on {request.method} {request.url.path}")
    logger.error(f"[{request_id}]    Error Type: {type(exc).__name__}")
    logger.error(f"[{request_id}]    Error Message: {str(exc)}")
    logger.error(f"[{request_id}]    Traceback:\n{traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "request_id": request_id,
            "type": type(exc).__name__ if settings.DEBUG else None
        }
    )
