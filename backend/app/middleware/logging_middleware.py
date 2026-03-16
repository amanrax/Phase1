import json
import time
import traceback
import uuid
from typing import Callable, Optional, Tuple

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.services.logging_service import log_event, sanitize_body
from app.utils.security import decode_token


def _extract_identity_from_token(request: Request) -> Tuple[Optional[str], Optional[str]]:
    """Best-effort extraction of requester identity/role from bearer token."""
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth:
        return None, None

    parts = auth.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None, None

    try:
        payload = decode_token(parts[1]) or {}
    except Exception:
        return None, None

    user_id = (
        payload.get("user_id")
        or payload.get("sub")
        or payload.get("email")
        or payload.get("farmer_id")
        or payload.get("operator_id")
    )
    role = None
    roles = payload.get("roles")
    if isinstance(roles, list) and roles:
        role = str(roles[0])
    elif isinstance(payload.get("role"), str):
        role = payload.get("role")

    return (str(user_id) if user_id else None), role


class LoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable):
        request_id = str(uuid.uuid4())
        start = time.perf_counter()

        # Read body using .body() which caches in request._body so the route
        # handler can still read it. Never use request.json() here — it does
        # not guarantee cache replay through BaseHTTPMiddleware's scope wrapping.
        body_content = {}
        try:
            if request.method in {"POST", "PUT", "PATCH"}:
                raw = await request.body()   # caches → request._body
                if raw:
                    body_content = json.loads(raw)
        except Exception:
            body_content = {}

        # Collect basic context
        user = getattr(request.state, "user", None)
        user_id = getattr(user, "id", None) if user else None
        role = getattr(user, "role", None) if user else None
        if not user_id:
            token_user_id, token_role = _extract_identity_from_token(request)
            user_id = token_user_id
            role = role or token_role
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
            http_method=request.method,
            path=request.url.path,
            message=f"{request.method} {request.url.path}",
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
                details={
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                },
                endpoint=request.url.path,
                user_id=user_id,
                role=role,
                ip_address=client_ip,
                request_id=request_id,
                duration_ms=duration_ms,
                http_method=request.method,
                path=request.url.path,
                status_code=500,
                response_time_ms=duration_ms,
                message=f"ERROR {request.method} {request.url.path}: {str(exc)}",
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
            http_method=request.method,
            path=request.url.path,
            status_code=status_code,
            response_time_ms=duration_ms,
            message=f"{request.method} {request.url.path} {status_code} ({duration_ms:.1f}ms)",
        )

        return response
