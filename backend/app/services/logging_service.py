from typing import Any, Dict, Optional
from datetime import datetime
import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database


LOG_COLLECTION = "system_logs"


async def log_event(
    level: str,
    module: str,
    action: str,
    details: Optional[Dict[str, Any]] = None,
    endpoint: Optional[str] = None,
    user_id: Optional[str] = None,
    role: Optional[str] = None,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
    duration_ms: Optional[float] = None,
    db: Optional[AsyncIOMotorDatabase] = None,
    # P7 — top-level HTTP fields required by spec
    http_method: Optional[str] = None,
    path: Optional[str] = None,
    status_code: Optional[int] = None,
    response_time_ms: Optional[float] = None,
    message: Optional[str] = None,
) -> None:
    """Insert a structured log entry into MongoDB.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        module: Logical module/component producing the log
        action: Short action name (e.g., "login", "create_famer")
        details: Arbitrary structured payload, sanitized
        endpoint: API path or function
        user_id: Actor user id if present
        role: Actor role
        ip_address: Client IP
        request_id: Correlation id
        duration_ms: Optional performance timing
        db: Optional db handle; if not provided, a collection will be resolved via get_database
        http_method: HTTP verb (GET, POST, etc.) — top-level per spec
        path: Request URL path — top-level per spec
        status_code: HTTP response status code — top-level per spec
        response_time_ms: Response time in ms — top-level per spec (aliases duration_ms)
        message: Human-readable log message — top-level per spec
    """

    if details is None:
        details = {}

    doc = {
        "timestamp": datetime.utcnow(),
        "level": level.upper(),
        "module": module,
        "endpoint": endpoint,
        "user_id": user_id,
        "role": role,
        "action": action,
        "details": details,
        "ip_address": ip_address,
        "request_id": request_id or str(uuid.uuid4()),
        "duration_ms": duration_ms,
        # P7 — top-level fields required by spec
        "http_method": http_method,
        "path": path,
        "status_code": status_code,
        "response_time_ms": response_time_ms if response_time_ms is not None else duration_ms,
        "message": message,
    }

    try:
        # Get database - either passed in or from global instance
        if db is not None:
            collection = db[LOG_COLLECTION]
        else:
            db_instance = get_database()
            collection = db_instance[LOG_COLLECTION]
        
        await collection.insert_one(doc)
    except Exception as e:
        # Silently fail to avoid breaking requests if logging fails
        # In production, consider a fallback like file logging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to write log entry: {e}")


def sanitize_body(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize sensitive fields in request/response payloads."""
    redactions = {"password", "token", "access_token", "refresh_token", "Authorization"}
    sanitized: Dict[str, Any] = {}
    for k, v in payload.items():
        if k in redactions:
            sanitized[k] = "***REDACTED***"
        else:
            sanitized[k] = v
    return sanitized
