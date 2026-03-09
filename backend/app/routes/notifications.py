# backend/app/routes/notifications.py — In-app notification system (v4.0)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.dependencies.roles import get_current_user
from app.services.logging_service import log_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── Pydantic Models ───────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    """Internal use — create a notification for a user."""
    user_id: str
    user_type: str = Field(..., pattern=r"^(farmer|operator|admin)$")
    type: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field("", max_length=1000)


# ── Get my notifications ──────────────────────────────────────────────────────

@router.get(
    "",
    summary="List my notifications",
)
async def list_my_notifications(
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Returns notifications for the current user, newest first."""
    user_id = current_user.get("farmer_id") or current_user.get("email") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Cannot determine user identity")

    query: dict = {"user_id": user_id}
    if unread_only:
        query["read"] = False

    total = await db.notifications.count_documents(query)
    unread_count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    cursor = db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)

    return {
        "notifications": [
            {
                "id": str(n["_id"]),
                "type": n.get("type", "general"),
                "title": n.get("title", ""),
                "body": n.get("body", ""),
                "read": n.get("read", False),
                "created_at": n["created_at"].isoformat() if isinstance(n.get("created_at"), datetime) else str(n.get("created_at", "")),
            }
            for n in items
        ],
        "total": total,
        "unread_count": unread_count,
    }


# ── Unread count ──────────────────────────────────────────────────────────────

@router.get(
    "/unread-count",
    summary="Get count of unread notifications",
)
async def get_unread_count(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("farmer_id") or current_user.get("email") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Cannot determine user identity")

    count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {"unread_count": count}


# ── Mark as read ──────────────────────────────────────────────────────────────

@router.patch(
    "/{notification_id}/read",
    summary="Mark a notification as read",
)
async def mark_as_read(
    notification_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from bson import ObjectId
    try:
        obj_id = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    user_id = current_user.get("farmer_id") or current_user.get("email") or current_user.get("sub")
    result = await db.notifications.update_one(
        {"_id": obj_id, "user_id": user_id},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Marked as read"}


# ── Mark all as read ─────────────────────────────────────────────────────────

@router.patch(
    "/mark-all-read",
    summary="Mark all notifications as read",
)
async def mark_all_read(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("farmer_id") or current_user.get("email") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Cannot determine user identity")

    now = datetime.now(timezone.utc)
    result = await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True, "read_at": now}},
    )
    return {"message": f"Marked {result.modified_count} notifications as read"}


# ── Delete a notification ─────────────────────────────────────────────────────

@router.delete(
    "/{notification_id}",
    summary="Delete a notification",
)
async def delete_notification(
    notification_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from bson import ObjectId
    try:
        obj_id = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    user_id = current_user.get("farmer_id") or current_user.get("email") or current_user.get("sub")
    result = await db.notifications.delete_one({"_id": obj_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification deleted"}
