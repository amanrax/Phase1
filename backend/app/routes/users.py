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
# List Users (ADMIN only)
# =======================================================
@router.get(
    "/",
    summary="List users",
    description="List all users or filter by role (ADMIN only)"
)
async def get_users(
    request: Request,
    role: Optional[str] = Query(None, description="Filter by user role"),
    current_user: dict = Depends(require_admin),
    db = Depends(get_db)
):
    await log_event(
        level="INFO",
        module="users",
        action="list_users",
        details={"filter_role": role},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    query = {"roles": {"$in": [role]}} if role else {}
    users = await db.users.find(query).sort("created_at", -1).to_list(100)
    
    # Format response
    results = []
    for user in users:
        results.append({
            "email": user.get("email"),
            "role": user.get("roles", [])[0] if user.get("roles") else "UNKNOWN",
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat()
        })
    
    return {"users": results}


# =======================================================
# Create New User (ADMIN only)
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
    
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    password_hash = hash_password(user_data.password)
    now = datetime.now(timezone.utc)
    new_user_doc = {
        "email": email,
        "password_hash": password_hash,
        "roles": [role.value for role in user_data.roles],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    result = await db.users.insert_one(new_user_doc)
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
# Update User Status (ADMIN only)
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
    
    user = await db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.users.update_one(
        {"email": email},
        {
            "$set": {
                "is_active": status_update.is_active,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update user status")
    
    return {"message": f"User {'activated' if status_update.is_active else 'deactivated'} successfully", "email": email}


# =======================================================
# Delete User (ADMIN only)
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
    
    user = await db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting the last admin
    if "ADMIN" in user.get("roles", []):
        admin_count = await db.users.count_documents({"roles": {"$in": ["ADMIN"]}, "is_active": True})
        if admin_count <= 1:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete the last active admin account"
            )
    
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
    
    return {"message": "User deleted successfully", "email": email}
