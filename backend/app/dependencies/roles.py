# backend/app/dependencies/roles.py
"""
Role-based access control (RBAC) dependencies for FastAPI routes.

Usage:
    from app.dependencies.roles import get_current_user, require_role
    
    @router.get("/admin-only")
    async def admin_route(user = Depends(require_role(["ADMIN"]))):
        return {"message": "Admin access granted"}
"""

from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.security import decode_token
from app.database import get_db
from app.models.user import UserInDB, UserRole


# ============================================
# Security Scheme (OAuth2 Bearer)
# ============================================
# This creates the "Authorize" button in FastAPI docs
security = HTTPBearer(
    scheme_name="JWT Bearer Token",
    description="Enter your JWT token (from /api/auth/login)",
    auto_error=True
)


# ============================================
# Current User Extraction
# ============================================
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """
    Extract and verify JWT token from Authorization header.
    Returns the full user document from MongoDB for standard users,
    or a constructed user dict for farmers.
    
    Args:
        credentials: HTTPBearer credentials (automatically extracted)
        db: MongoDB database instance
    
    Returns:
        dict: User document from database or constructed user dict for farmer
    
    Raises:
        HTTPException: 401 if token invalid, 404 if user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        subject: str = payload.get("sub")
        
        if subject is None:
            raise credentials_exception

        # If subject is not an email, assume it's a farmer_id
        if "@" not in subject:
            farmer = await db.farmers.find_one({"farmer_id": subject})
            if not farmer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Farmer not found",
                )
            
            # Construct a user-like dictionary for the farmer
            user = {
                "_id": farmer["_id"],
                "email": farmer.get("personal_info", {}).get("email"),
                "roles": ["FARMER"],
                "is_active": True,
                "farmer_id": farmer.get("farmer_id"),
                "full_name": f"{farmer.get('personal_info', {}).get('first_name')} {farmer.get('personal_info', {}).get('last_name')}"
            }

        # Otherwise, it's a standard user with an email
        else:
            user = await db.users.find_one({"email": subject})
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found",
                )

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user account",
            )
        
        return user
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise credentials_exception


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Get current user and verify they are active.
    
    Args:
        current_user: User from get_current_user dependency
    
    Returns:
        dict: Active user document
    
    Raises:
        HTTPException: 403 if user is inactive
    """
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    return current_user


# ============================================
# Optional Authentication (for public endpoints)
# ============================================
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> Optional[dict]:
    """
    Extract current user if token is provided, otherwise return None.
    Useful for endpoints that work with or without authentication.
    
    Args:
        credentials: Optional HTTPBearer credentials
        db: MongoDB database instance
    
    Returns:
        Optional[dict]: User document or None
    
    Usage:
        @router.get("/public-or-private")
        async def mixed_route(user = Depends(get_current_user_optional)):
            if user:
                return {"message": f"Hello {user['email']}"}
            return {"message": "Hello anonymous user"}
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        email = payload.get("sub")
        
        if email:
            user = await db.users.find_one({"email": email})
            return user
    except:
        pass
    
    return None


# ============================================
# Role-Based Access Control
# ============================================
def require_role(allowed_roles: List[str]):
    """
    Dependency factory for enforcing role-based access control (RBAC).
    
    Args:
        allowed_roles: List of allowed roles (e.g., ["ADMIN", "OPERATOR"])
    
    Returns:
        Callable: Async dependency function
    
    Usage:
        @router.post("/farmers", dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))])
        async def create_farmer():
            ...
        
        # Or get the user object:
        @router.get("/admin-only")
        async def admin_route(user = Depends(require_role(["ADMIN"]))):
            return {"admin_email": user["email"]}
    
    Raises:
        HTTPException: 403 if user doesn't have required role
    """
    async def role_checker(user: dict = Depends(get_current_user)) -> dict:
        user_roles = user.get("roles", [])
        
        # Check if user has any of the allowed roles
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}. Your roles: {user_roles}",
            )
        
        return user
    
    return role_checker


# ============================================
# Convenience Role Dependencies
# ============================================
async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """
    Require ADMIN role.
    
    Usage:
        @router.delete("/users/{user_id}")
        async def delete_user(user = Depends(require_admin)):
            ...
    """
    if UserRole.ADMIN.value not in user.get("roles", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user


async def require_operator(user: dict = Depends(get_current_user)) -> dict:
    """
    Require OPERATOR or ADMIN role.
    
    Usage:
        @router.post("/farmers")
        async def create_farmer(user = Depends(require_operator)):
            ...
    """
    user_roles = user.get("roles", [])
    if not (UserRole.OPERATOR.value in user_roles or UserRole.ADMIN.value in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator or Admin access required"
        )
    return user


async def require_farmer(user: dict = Depends(get_current_user)) -> dict:
    """
    Require FARMER role (for farmer self-service endpoints).
    
    Usage:
        @router.get("/my-profile")
        async def get_my_profile(user = Depends(require_farmer)):
            ...
    """
    if UserRole.FARMER.value not in user.get("roles", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Farmer access required"
        )
    return user


# ============================================
# Resource-Based Access Control
# ============================================
async def require_farmer_or_operator(user: dict = Depends(get_current_user)) -> dict:
    """
    Require FARMER, OPERATOR, or ADMIN role.
    Useful for endpoints where farmers can view their own data,
    and operators/admins can view all data.
    """
    user_roles = user.get("roles", [])
    allowed_roles = [UserRole.FARMER.value, UserRole.OPERATOR.value, UserRole.ADMIN.value]
    
    if not any(role in allowed_roles for role in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Farmer, Operator, or Admin access required"
        )
    return user


def can_access_farmer_data(farmer_id: str):
    """
    Check if current user can access specific farmer's data.
    - Farmers can only access their own data
    - Operators and Admins can access all farmer data
    
    Args:
        farmer_id: The farmer ID being accessed
    
    Usage:
        @router.get("/farmers/{farmer_id}")
        async def get_farmer(
            farmer_id: str,
            user = Depends(can_access_farmer_data(farmer_id))
        ):
            ...
    """
    async def checker(
        user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_db)
    ) -> dict:
        user_roles = user.get("roles", [])
        
        # Admins and operators can access all farmer data
        if UserRole.ADMIN.value in user_roles or UserRole.OPERATOR.value in user_roles:
            return user
        
        # Farmers can only access their own data
        if UserRole.FARMER.value in user_roles:
            # Find farmer record linked to this user
            farmer = await db.farmers.find_one({
                "farmer_id": farmer_id,
                "personal_info.email": user.get("email")
            })
            
            if farmer:
                return user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this farmer's data"
        )
    
    return checker
