# backend/app/routes/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Request
from app.database import get_db
from app.dependencies.roles import require_admin
from app.models.user import UserCreate, UserOut, UserRole
from app.utils.security import hash_password
from app.services.logging_service import log_event
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])


class UpdateStatusRequest(BaseModel):
    is_active: bool


# =======================================================
# List Users (ADMIN only) - WITH PROPER CACHE BUSTING
# =======================================================
@router.get(
    "/",
    summary="List users",
    description="List all users or filter by role (ADMIN only)"
)
async def get_users(
    request: Request,
    role: Optional[str] = Query(None, description="Filter by user role"),
    include_inactive: bool = Query(False, description="Include inactive users"),
    current_user: dict = Depends(require_admin),
    db = Depends(get_db)
):
    """
    List all users with proper filtering and sorting.
    
    Returns actual current data from database without caching issues.
    """
    await log_event(
        level="INFO",
        module="users",
        action="list_users",
        details={"filter_role": role, "include_inactive": include_inactive},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    # Build query
    query = {}
    
    # Filter by role if specified
    if role:
        query["roles"] = {"$in": [role.upper()]}
    
    # Filter by active status (default: only active users)
    if not include_inactive:
        query["is_active"] = True
    
    # Fetch users from database (sorted by creation date, newest first)
    users = await db.users.find(query).sort("created_at", -1).to_list(200)
    
    # Format response
    results = []
    for user in users:
        # Safely get role (handle both single role and array)
        roles = user.get("roles", [])
        if roles and isinstance(roles, list):
            role_display = roles[0]
        else:
            role_display = "UNKNOWN"
        
        results.append({
            "_id": str(user.get("_id")),
            "email": user.get("email"),
            "role": role_display,
            "roles": roles,  # Include full roles array for frontend
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat(),
            "last_login": user.get("last_login").isoformat() if user.get("last_login") else None,
            "full_name": user.get("full_name"),
            "phone": user.get("phone")
        })
    
    await log_event(
        level="INFO",
        module="users",
        action="list_users_success",
        details={"count": len(results), "query": query},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    return {"users": results, "total": len(results)}


# =======================================================
# Create New User (ADMIN only) - WITH SYNC TO OPERATORS
# =======================================================
@router.post(
    "/",
    response_model=UserOut,
    summary="Create new user",
    description="Create a new user account (ADMIN only)"
)
async def create_user(
    request: Request,
    user_data: UserCreate,
    current_user: dict = Depends(require_admin),
    db = Depends(get_db)
):
    """
    Create a new user with proper role assignment and operator sync.
    """
    email = user_data.email.lower().strip()
    
    await log_event(
        level="INFO",
        module="users",
        action="create_user_attempt",
        details={"target_email": email, "target_roles": [r.value for r in user_data.roles]},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    # Hash password
    password_hash = hash_password(user_data.password)
    now = datetime.now(timezone.utc)
    
    # Create user document
    new_user_doc = {
        "email": email,
        "password_hash": password_hash,
        "roles": [role.value for role in user_data.roles],
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("email")
    }
    
    # Insert user
    result = await db.users.insert_one(new_user_doc)
    user_id = str(result.inserted_id)
    
    # If creating an OPERATOR, ensure they have an operator record
    if "OPERATOR" in [r.value for r in user_data.roles]:
        from uuid import uuid4
        operator_id = "OP" + uuid4().hex[:8].upper()
        
        operator_doc = {
            "operator_id": operator_id,
            "user_id": user_id,
            "email": email,
            "full_name": user_data.email.split('@')[0],  # Default name from email
            "phone": None,
            "assigned_regions": [],
            "assigned_districts": [],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        
        await db.operators.insert_one(operator_doc)
        
        await log_event(
            level="INFO",
            module="users",
            action="operator_profile_created",
            details={"operator_id": operator_id, "email": email},
            endpoint=str(request.url),
            user_id=current_user.get("email"),
            role="ADMIN",
            ip_address=request.client.host if request.client else None
        )
    
    # Fetch created user
    new_user = await db.users.find_one({"_id": result.inserted_id})
    
    await log_event(
        level="INFO",
        module="users",
        action="create_user_success",
        details={"target_email": email, "target_roles": [role.value for role in user_data.roles]},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    return UserOut.from_mongo(new_user)


# =======================================================
# Get Current User (self-view, any authenticated)
# =======================================================
@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user",
    description="Get authenticated user info"
)
async def get_me(current_user: dict = Depends(require_admin)):
    """
    Returns info about the currently authenticated admin user.
    """
    return UserOut.from_mongo(current_user)


# =======================================================
# Update User Status (ADMIN only) - WITH OPERATOR SYNC
# =======================================================
@router.patch(
    "/{email}/status",
    summary="Update user status",
    description="Activate or deactivate a user account (ADMIN only)"
)
async def update_user_status(
    request: Request,
    email: str,
    status_update: UpdateStatusRequest,
    current_user: dict = Depends(require_admin),
    db = Depends(get_db)
):
    """
    Update user status with proper operator synchronization.
    """
    email = email.lower().strip()
    
    await log_event(
        level="INFO",
        module="users",
        action="update_user_status",
        details={"target_email": email, "new_status": status_update.is_active},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    # Find user
    user = await db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user status
    result = await db.users.update_one(
        {"email": email},
        {
            "$set": {
                "is_active": status_update.is_active,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # If user is an operator, update operator status too
    if "OPERATOR" in user.get("roles", []):
        await db.operators.update_one(
            {"email": email},
            {
                "$set": {
                    "is_active": status_update.is_active,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        await log_event(
            level="INFO",
            module="users",
            action="operator_status_synced",
            details={"email": email, "is_active": status_update.is_active},
            endpoint=str(request.url),
            user_id=current_user.get("email"),
            role="ADMIN",
            ip_address=request.client.host if request.client else None
        )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update user status")
    
    return {
        "message": f"User {'activated' if status_update.is_active else 'deactivated'} successfully",
        "email": email,
        "is_active": status_update.is_active
    }


# =======================================================
# Delete User (ADMIN only) - WITH PROPER CLEANUP
# =======================================================
@router.delete(
    "/{email}",
    summary="Delete user",
    description="Permanently delete a user account (ADMIN only)"
)
async def delete_user(
    request: Request,
    email: str,
    current_user: dict = Depends(require_admin),
    db = Depends(get_db)
):
    """
    Delete user with proper cleanup of operator records and safety checks.
    """
    email = email.lower().strip()
    
    await log_event(
        level="INFO",
        module="users",
        action="delete_user_attempt",
        details={"target_email": email},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    # Find user
    user = await db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Safety check: Prevent deleting the last admin
    if "ADMIN" in user.get("roles", []):
        admin_count = await db.users.count_documents({
            "roles": {"$in": ["ADMIN"]},
            "is_active": True
        })
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the last active admin account"
            )
    
    # Safety check: Prevent deleting yourself
    if email == current_user.get("email"):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    # Delete operator record if exists
    if "OPERATOR" in user.get("roles", []):
        operator_result = await db.operators.delete_one({"email": email})
        if operator_result.deleted_count > 0:
            await log_event(
                level="INFO",
                module="users",
                action="operator_record_deleted",
                details={"email": email},
                endpoint=str(request.url),
                user_id=current_user.get("email"),
                role="ADMIN",
                ip_address=request.client.host if request.client else None
            )
    
    # Delete user
    result = await db.users.delete_one({"email": email})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Failed to delete user")
    
    await log_event(
        level="INFO",
        module="users",
        action="delete_user_success",
        details={"target_email": email},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "message": "User deleted successfully",
        "email": email,
        "deleted_at": datetime.now(timezone.utc).isoformat()
    }
