# backend/app/routes/logs.py
# Paginated log viewer endpoints — admin only (P7)
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.services.logging_service import LOG_COLLECTION
from app.dependencies.roles import require_admin

router = APIRouter()


@router.get("/", summary="List logs (paginated, newest first)")
async def list_logs(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(require_admin),
    level: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    http_method: Optional[str] = Query(None, description="HTTP method: GET, POST, PUT, PATCH, DELETE"),
    date_from: Optional[str] = Query(None, description="ISO date e.g. 2026-01-01"),
    date_to: Optional[str] = Query(None, description="ISO date e.g. 2026-03-31"),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    query: dict = {}
    if level:
        query["level"] = level.upper()
    if module:
        query["module"] = module
    if user_id:
        query["user_id"] = user_id
    if role:
        query["role"] = role
    if http_method:
        query["details.method"] = http_method.upper()

    ts_filter: dict = {}
    resolved_start = start
    resolved_end = end
    if date_from and not resolved_start:
        try:
            resolved_start = datetime.fromisoformat(date_from)
        except ValueError:
            pass
    if date_to and not resolved_end:
        try:
            resolved_end = datetime.fromisoformat(date_to)
        except ValueError:
            pass
    if resolved_start:
        ts_filter["$gte"] = resolved_start
    if resolved_end:
        ts_filter["$lte"] = resolved_end
    if ts_filter:
        query["timestamp"] = ts_filter

    skip = (page - 1) * page_size
    cursor = db[LOG_COLLECTION].find(query).sort("timestamp", -1).skip(skip).limit(page_size)
    items = await cursor.to_list(length=page_size)

    for item in items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
        if "timestamp" in item:
            item["timestamp"] = (
                item["timestamp"].isoformat()
                if hasattr(item["timestamp"], "isoformat")
                else str(item["timestamp"])
            )

    total = await db[LOG_COLLECTION].count_documents(query)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/stats", summary="Log statistics by level and module")
async def log_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    pipeline = [
        {"$group": {"_id": {"level": "$level", "module": "$module"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    data = await db[LOG_COLLECTION].aggregate(pipeline).to_list(length=1000)
    return {"stats": data}

