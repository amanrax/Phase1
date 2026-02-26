# backend/app/services/analytics_service.py
# MongoDB aggregation pipelines for analytics dashboard — cached in Redis (15 min TTL)
import json
import os
from collections import defaultdict
from datetime import datetime, timedelta

import redis.asyncio as aioredis

from app.database import AsyncIOMotorDatabase

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CACHE_TTL = 15 * 60  # 15 minutes in seconds
KEY_PREFIX = "analytics:"


def _redis() -> aioredis.Redis:
    """Create a short-lived async Redis client."""
    return aioredis.from_url(REDIS_URL, decode_responses=True)


async def _get_cached(key: str) -> dict | None:
    try:
        async with _redis() as r:
            raw = await r.get(key)
            if raw:
                return json.loads(raw)
    except Exception:
        pass
    return None


async def _set_cached(key: str, data: dict) -> None:
    try:
        async with _redis() as r:
            await r.setex(key, CACHE_TTL, json.dumps(data, default=str))
    except Exception:
        pass


# ── Individual aggregation helpers ───────────────────────────────────────────

async def monthly_registrations(db: AsyncIOMotorDatabase) -> list[dict]:
    twelve_months_ago = datetime.utcnow() - timedelta(days=365)
    pipeline = [
        {"$match": {"created_at": {"$gte": twelve_months_ago}}},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    raw = await db.farmers.aggregate(pipeline).to_list(length=100)
    return [
        {"month": f"{month_names[r['_id']['month']]} {r['_id']['year']}", "farmers": r["count"]}
        for r in raw
    ]


async def farmers_by_province(db: AsyncIOMotorDatabase) -> list[dict]:
    pipeline = [
        {
            "$group": {
                "_id": {"$ifNull": ["$location.province", "$personal_info.province", "Unknown"]},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    raw = await db.farmers.aggregate(pipeline).to_list(length=10)
    return [{"province": r["_id"] or "Unknown", "farmers": r["count"]} for r in raw]


async def farmers_by_district(db: AsyncIOMotorDatabase) -> list[dict]:
    pipeline = [
        {
            "$group": {
                "_id": {"$ifNull": ["$location.district", "$personal_info.district", "Unknown"]},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    raw = await db.farmers.aggregate(pipeline).to_list(length=10)
    return [{"district": r["_id"] or "Unknown", "farmers": r["count"]} for r in raw]


async def crops_distribution(db: AsyncIOMotorDatabase) -> list[dict]:
    all_farmers = await db.farmers.find(
        {}, {"farm_details.crops": 1, "personal_info.crops": 1}
    ).to_list(length=5000)

    crop_counts: dict[str, int] = defaultdict(int)
    for f in all_farmers:
        fd = f.get("farm_details") or f.get("personal_info") or {}
        for c in (fd.get("crops") or []):
            if c:
                crop_counts[str(c).strip()] += 1

    return sorted(
        [{"crop": k, "count": v} for k, v in crop_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]


async def livestock_distribution(db: AsyncIOMotorDatabase) -> list[dict]:
    all_farmers = await db.farmers.find(
        {}, {"farm_details.livestock": 1}
    ).to_list(length=5000)

    counts: dict[str, int] = defaultdict(int)
    for f in all_farmers:
        fd = f.get("farm_details") or {}
        for a in (fd.get("livestock") or []):
            if a:
                counts[str(a).strip()] += 1

    return sorted(
        [{"animal": k, "count": v} for k, v in counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:8]


async def status_breakdown(db: AsyncIOMotorDatabase) -> list[dict]:
    total = await db.farmers.count_documents({})
    active = await db.farmers.count_documents({"is_active": True})
    return [
        {"status": "Active", "count": active},
        {"status": "Inactive", "count": total - active},
    ]


async def farmers_by_operator(db: AsyncIOMotorDatabase) -> list[dict]:
    pipeline = [
        {"$match": {"operator_id": {"$ne": None}}},
        {"$group": {"_id": "$operator_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    raw = await db.farmers.aggregate(pipeline).to_list(length=10)
    result = []
    for r in raw:
        op = await db.operators.find_one({"operator_id": r["_id"]}, {"full_name": 1})
        result.append({
            "operator": op.get("full_name", r["_id"]) if op else r["_id"],
            "farmers": r["count"],
        })
    return result


# ── Full analytics bundle (cached) ───────────────────────────────────────────

async def get_full_analytics(db: AsyncIOMotorDatabase) -> dict:
    """Return all analytics metrics. Results are Redis-cached for 15 minutes."""
    cache_key = f"{KEY_PREFIX}full"
    cached = await _get_cached(cache_key)
    if cached:
        cached["from_cache"] = True
        return cached

    data = {
        "monthly_registrations": await monthly_registrations(db),
        "farmers_by_province": await farmers_by_province(db),
        "farmers_by_district": await farmers_by_district(db),
        "crops_distribution": await crops_distribution(db),
        "livestock_distribution": await livestock_distribution(db),
        "status_breakdown": await status_breakdown(db),
        "farmers_by_operator": await farmers_by_operator(db),
        "generated_at": datetime.utcnow().isoformat(),
        "from_cache": False,
    }

    await _set_cached(cache_key, data)
    return data
