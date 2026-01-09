# backend/app/services/report_service.py
"""
Reporting service for farmer system analytics and aggregated stats.
"""

from typing import Dict, List, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase


class ReportService:
    """Service for generating various reports/analytics."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.farmers = db.farmers
        self.operators = db.operators
        self.users = db.users

    async def dashboard_summary(self) -> Dict[str, Any]:
        """High-level metrics for admin dashboard."""
        total_farmers = await self.farmers.count_documents({})
        total_operators = await self.operators.count_documents({})
        total_users = await self.users.count_documents({})

        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        farmers_this_month = await self.farmers.count_documents({"created_at": {"$gte": month_start}})

        return {
            "timestamp": datetime.utcnow(),
            "metrics": {
                "farmers_total": total_farmers,
                "operators_total": total_operators,
                "users_total": total_users,
                "farmers_registered_this_month": farmers_this_month,
            },
        }

    async def farmers_by_region(self) -> List[Dict[str, Any]]:
        """Aggregate farmer counts by province and district."""
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "province": "$address.province_name",
                        "district": "$address.district_name",
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.province": 1, "_id.district": 1}},
        ]
        results = await self.farmers.aggregate(pipeline).to_list(length=None)

        return [
            {
                "province": r["_id"]["province"],
                "district": r["_id"]["district"],
                "farmer_count": r["count"],
            }
            for r in results
        ]

    async def operator_performance(self) -> List[Dict[str, Any]]:
        """Aggregate operator performance stats (total farmers registered and recent registrations last 30 days)."""
        cutoff = datetime.utcnow() - timedelta(days=30)
        pipeline = [
            {
                "$group": {
                    "_id": "$created_by",
                    "total_farmers": {"$sum": 1},
                    "recent_farmers": {
                        "$sum": {
                            "$cond": [
                                {"$gte": ["$created_at", cutoff]},
                                1,
                                0,
                            ]
                        }
                    },
                }
            },
            {"$sort": {"total_farmers": -1}},
        ]
        results = await self.farmers.aggregate(pipeline).to_list(length=None)

        out = []
        for r in results:
            op = await self.operators.find_one({"operator_id": r["_id"]}, {"full_name": 1, "email": 1})
            out.append(
                {
                    "operator_id": r["_id"],
                    "operator_name": op.get("full_name") if op else "Unknown",
                    "email": op.get("email") if op else None,
                    "total_farmers": r["total_farmers"],
                    "recent_farmers_30d": r["recent_farmers"],
                }
            )
        return out

    async def activity_trends(self, days: int = 14) -> List[Dict[str, Any]]:
        """Daily registration counts for past `days` days."""
        start = datetime.utcnow() - timedelta(days=days)
        pipeline = [
            {"$match": {"created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$created_at"},
                        "month": {"$month": "$created_at"},
                        "day": {"$dayOfMonth": "$created_at"},
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
        ]
        results = await self.farmers.aggregate(pipeline).to_list(length=None)

        return [
            {
                "date": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}",
                "registrations": r["count"],
            }
            for r in results
        ]
