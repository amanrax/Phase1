# backend/app/utils/security.py
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings
import hmac
import hashlib
import base64
from typing import Optional, Dict, Any


# ==============================
# Password Hashing
# ==============================
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash password using bcrypt (max 72 chars).
    
    Args:
        password: Plain text password
    
    Returns:
        str: Hashed password
    """
    return pwd_ctx.hash(password[:72])


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify plain password against hashed password.
    
    Args:
        plain: Plain text password
        hashed: Hashed password from database
    
    Returns:
        bool: True if password matches
    """
    return pwd_ctx.verify(plain, hashed)


# ==============================
# JWT Tokens
# ==============================
def get_utc_now() -> datetime:
    """
    Get current UTC time as timezone-aware datetime.
    Replaces deprecated datetime.utcnow().
    
    Returns:
        datetime: Current UTC time (timezone-aware)
    """
    return datetime.now(timezone.utc)


def create_token(
    subject: str, 
    expires_minutes: int, 
    token_type: str,
    additional_claims: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generic JWT creator with expiry and custom claims.
    
    Args:
        subject: Token subject (usually email or user_id)
        expires_minutes: Token expiration in minutes
        token_type: Type of token ("access" or "refresh")
        additional_claims: Optional additional JWT claims (e.g., roles)
    
    Returns:
        str: Encoded JWT token
    """
    now = get_utc_now()
    expire = now + timedelta(minutes=expires_minutes)
    
    payload = {
        "sub": subject,
        "type": token_type,
        "exp": expire,
        "iat": now,
        "aud": "zambian_farmer_system",
    }
    
    # Add additional claims if provided
    if additional_claims:
        payload.update(additional_claims)
    
    return jwt.encode(
        payload, 
        settings.JWT_SECRET, 
        algorithm=settings.JWT_ALGORITHM
    )


def create_access_token(
    subject: str, 
    roles: Optional[list] = None
) -> str:
    """
    Create short-lived access token (default 30 minutes).
    
    Args:
        subject: User email or identifier
        roles: User roles to embed in token
    
    Returns:
        str: Encoded access token
    """
    # Normalize roles to uppercase (handle legacy lowercase values)
    if roles:
        roles = [role.upper() if isinstance(role, str) else role for role in roles]
    
    additional_claims = {"roles": roles} if roles else {}
    return create_token(
        subject, 
        settings.ACCESS_TOKEN_EXPIRE_MINUTES, 
        "access",
        additional_claims
    )


def create_refresh_token(subject: str) -> str:
    """
    Create long-lived refresh token (default 7 days).
    
    Args:
        subject: User email or identifier
    
    Returns:
        str: Encoded refresh token
    """
    minutes = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60
    return create_token(subject, minutes, "refresh")


def decode_token(token: str, verify_audience: bool = True) -> dict:
    """
    Decode and verify JWT token.
    
    Args:
        token: JWT token string
        verify_audience: Whether to verify the audience claim
    
    Returns:
        dict: Decoded token payload
    
    Raises:
        ValueError: If token is invalid or expired
    """
    try:
        options = {
            "verify_aud": verify_audience,
            "verify_exp": True,
        }
        
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience="zambian_farmer_system" if verify_audience else None,
            options=options,
        )
    except JWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")


def get_token_expiry_seconds(token_type: str = "access") -> int:
    """
    Get token expiration time in seconds.
    
    Args:
        token_type: Type of token ("access" or "refresh")
    
    Returns:
        int: Expiration time in seconds
    """
    if token_type == "access":
        return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    elif token_type == "refresh":
        return settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    else:
        return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


# ==============================
# QR Code Signing & Verification
# ==============================
def sign_qr_payload(data: dict) -> str:
    """
    Create secure HMAC-SHA256 signature for QR payload.
    
    Args:
        data: QR payload dict with "farmer_id" and "timestamp"
    
    Returns:
        str: Base64-encoded signature
    
    Raises:
        ValueError: If required fields are missing
    
    Example:
        >>> data = {"farmer_id": "ZM12345", "timestamp": "2025-11-17T12:00:00Z"}
        >>> signature = sign_qr_payload(data)
    """
    farmer_id = data.get("farmer_id")
    timestamp = data.get("timestamp")
    
    if not farmer_id or not timestamp:
        raise ValueError("Missing farmer_id or timestamp for QR signing")
    
    # Create canonical message for signing
    msg = f"{farmer_id}|{timestamp}"
    
    # Generate HMAC-SHA256 signature
    sig = hmac.new(
        settings.SECRET_KEY.encode(), 
        msg.encode(), 
        hashlib.sha256
    ).digest()
    
    # Return URL-safe base64 encoded signature
    return base64.urlsafe_b64encode(sig).decode()


def verify_qr_signature(payload: dict) -> bool:
    """
    Validate a QR code's signature using the server secret.
    
    Args:
        payload: QR payload dict with "farmer_id", "timestamp", and "signature"
    
    Returns:
        bool: True if signature is valid, False otherwise
    
    Example:
        >>> payload = {
        ...     "farmer_id": "ZM12345",
        ...     "timestamp": "2025-11-17T12:00:00Z",
        ...     "signature": "xyz..."
        ... }
        >>> is_valid = verify_qr_signature(payload)
    """
    try:
        # Generate expected signature
        expected = sign_qr_payload(payload)
        provided = payload.get("signature", "")
        
        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected, provided)
    except Exception:
        return False


def generate_qr_data(farmer_id: str) -> dict:
    """
    Generate complete QR code data with signature.
    
    Args:
        farmer_id: Unique farmer identifier
    
    Returns:
        dict: QR code payload with farmer_id, timestamp, and signature
    
    Example:
        >>> qr_data = generate_qr_data("ZM12345")
        >>> print(qr_data)
        {
            "farmer_id": "ZM12345",
            "timestamp": "2025-11-17T12:34:56.789123+00:00",
            "signature": "xyz..."
        }
    """
    timestamp = get_utc_now().isoformat()
    
    data = {
        "farmer_id": farmer_id,
        "timestamp": timestamp,
    }
    
    # Add signature
    data["signature"] = sign_qr_payload(data)
    
    return data


# ==============================
# Password Validation
# ==============================
def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength against security requirements.
    
    Args:
        password: Password to validate
    
    Returns:
        tuple: (is_valid, error_message)
    
    Requirements:
        - At least 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special character (optional but recommended)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    # Optional: Check for special characters
    # special_chars = "!@#$%^&*()_+-=[]{}|;:',.<>?/"
    # if not any(c in special_chars for c in password):
    #     return False, "Password should contain at least one special character"
    
    return True, None
