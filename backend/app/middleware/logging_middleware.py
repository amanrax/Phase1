import time
import uuid
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.services.logging_service import log_event, sanitize_body


class LoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable):
        request_id = str(uuid.uuid4())
        start = time.perf_counter()

        # Try to read request body safely
        body_content = {}
        try:
            if request.method in {"POST", "PUT", "PATCH"}:
                body_content = await request.json()
        except Exception:
            body_content = {}

        # Collect basic context
        user = getattr(request.state, "user", None)
        user_id = getattr(user, "id", None) if user else None
        role = getattr(user, "role", None) if user else None
        client_ip = request.client.host if request.client else None

        # Pre-request log (DEBUG)
        await log_event(
            level="DEBUG",
            module="middleware",
            action="request",
            details={"method": request.method, "path": request.url.path, "body": sanitize_body(body_content)},
            endpoint=request.url.path,
            user_id=user_id,
            role=role,
            ip_address=client_ip,
            request_id=request_id,
        )

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000.0
            await log_event(
                level="ERROR",
                module="middleware",
                action="error",
                details={"method": request.method, "path": request.url.path, "error": str(exc)},
                endpoint=request.url.path,
                user_id=user_id,
                role=role,
                ip_address=client_ip,
                request_id=request_id,
                duration_ms=duration_ms,
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000.0

        # Post-response log (INFO)
        await log_event(
            level="INFO",
            module="middleware",
            action="response",
            details={
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
            },
            endpoint=request.url.path,
            user_id=user_id,
            role=role,
            ip_address=client_ip,
            request_id=request_id,
            duration_ms=duration_ms,
        )

        return response
