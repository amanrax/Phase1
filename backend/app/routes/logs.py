from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.services.logging_service import LOG_COLLECTION
from app.dependencies.roles import require_admin

router = APIRouter(prefix="/logs")


@router.get("/", summary="List logs (paginated)")
async def list_logs(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(require_admin),
    level: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = {}
    if level:
        query["level"] = level.upper()
    if module:
        query["module"] = module
    if user_id:
        query["user_id"] = user_id
    if role:
        query["role"] = role
    if start or end:
        query["timestamp"] = {}
        if start:
            query["timestamp"]["$gte"] = start
        if end:
            query["timestamp"]["$lte"] = end

    skip = (page - 1) * page_size
    cursor = db[LOG_COLLECTION].find(query).sort("timestamp", -1).skip(skip).limit(page_size)
    items = await cursor.to_list(length=page_size)
    
    # Convert ObjectId to string for JSON serialization
    for item in items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
        if "timestamp" in item:
            item["timestamp"] = item["timestamp"].isoformat() if hasattr(item["timestamp"], "isoformat") else str(item["timestamp"])
    
    total = await db[LOG_COLLECTION].count_documents(query)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/stats", summary="Log statistics")
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
