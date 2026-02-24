# backend/app/routes/dashboard.py
from fastapi import APIRouter, Depends, Request
from app.database import get_db
from app.dependencies.roles import require_role
from app.services.logging_service import log_event
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    summary="Get dashboard stats",
    description="Returns key dashboard statistics for admin/operator. Auth required."
)
async def get_dashboard_stats(
    request: Request,
    db = Depends(get_db),
    current_user = Depends(require_role(["ADMIN", "OPERATOR"]))
):
    """
    Get comprehensive dashboard statistics with accurate counts.
    
    Returns:
        dict: Dashboard statistics including:
            - farmers: total, active, pending, verified, rejected counts + recent list
            - users: total count (all users)
            - operators: total count
            - admins: total count (users with ADMIN role)
    """
    await log_event(
        level="INFO",
        module="dashboard",
        action="get_stats",
        details={},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    # ============================================
    # 1. FARMERS STATISTICS
    # ============================================
    # Total farmers (all statuses)
    total_farmers = await db.farmers.count_documents({})
    
    # Active farmers (is_active = True)
    active_farmers = await db.farmers.count_documents({"is_active": True})
    
    # Farmers by registration status
    verified_farmers = await db.farmers.count_documents({
        "registration_status": {"$in": ["verified", "approved"]}
    })
    
    pending_farmers = await db.farmers.count_documents({
        "registration_status": {"$in": ["pending", "registered", "under_review"]}
    })
    
    rejected_farmers = await db.farmers.count_documents({
        "registration_status": "rejected"
    })
    
    # Recent farmers (last 5, sorted by creation date)
    recent_farmers_cursor = db.farmers.find({}).sort("created_at", -1).limit(5)
    recent_farmers = await recent_farmers_cursor.to_list(5)

    # Format recent farmer data safely
    recent_results = []
    for f in recent_farmers:
        # Support both flat full_name and split first/last name
        personal_info = f.get("personal_info") or {}
        location = f.get("location") or f.get("address") or {}

        full_name = (
            personal_info.get("full_name")
            or f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip()
            or f.get("name")
            or "Unknown"
        )

        district = (
            location.get("district")
            or location.get("district_name")
            or f.get("district")
            or "N/A"
        )

        recent_results.append({
            "farmer_id": f.get("farmer_id") or "N/A",
            "name": full_name,
            "district": district,
            "created_at": f.get("created_at"),
            "registration_status": f.get("registration_status") or "registered",
            "is_active": f.get("is_active", True)
        })

    # ============================================
    # 2. USERS STATISTICS
    # ============================================
    # Total users (all roles)
    total_users = await db.users.count_documents({})
    
    # Active users only
    active_users = await db.users.count_documents({"is_active": True})
    
    # Count by role
    admin_count = await db.users.count_documents({
        "roles": {"$in": ["ADMIN"]},
        "is_active": True
    })
    
    operator_role_count = await db.users.count_documents({
        "roles": {"$in": ["OPERATOR"]},
        "is_active": True
    })
    
    farmer_user_count = await db.users.count_documents({
        "roles": {"$in": ["FARMER"]},
        "is_active": True
    })
    
    # ============================================
    # 3. OPERATORS STATISTICS
    # ============================================
    # Total operators (from operators collection)
    operators_count = await db.operators.count_documents({})
    
    # Active operators
    active_operators = await db.operators.count_documents({"is_active": True})
    
    # ============================================
    # 4. SYSTEM HEALTH METRICS
    # ============================================
    # Farmers needing attention (inactive but not rejected)
    inactive_farmers = await db.farmers.count_documents({
        "is_active": False,
        "registration_status": {"$ne": "rejected"}
    })
    
    # Users needing attention (inactive)
    inactive_users = await db.users.count_documents({"is_active": False})
    
    # ============================================
    # 5. BUILD RESPONSE
    # ============================================
    return {
        "farmers": {
            "total": total_farmers,
            "active": active_farmers,
            "inactive": total_farmers - active_farmers,
            "verified": verified_farmers,
            "pending": pending_farmers,
            "rejected": rejected_farmers,
            "recent": recent_results,
            "needs_attention": inactive_farmers
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": inactive_users,
            "by_role": {
                "admin": admin_count,
                "operator": operator_role_count,
                "farmer": farmer_user_count
            }
        },
        "operators": {
            "total": operators_count,
            "active": active_operators,
            "inactive": operators_count - active_operators
        },
        "system": {
            "total_entities": total_farmers + total_users + operators_count,
            "needs_attention": inactive_farmers + inactive_users
        },
        "generated_at": datetime.now().isoformat()
    }


@router.get(
    "/analytics",
    summary="Get rich analytics data for charts",
    description="Returns aggregated analytics data for dashboard charts. Admin/Operator only."
)
async def get_analytics(
    request: Request,
    db=Depends(get_db),
    current_user=Depends(require_role(["ADMIN", "OPERATOR"]))
):
    """Returns chart-ready analytics: monthly trends, regional distribution, crops, livestock."""

    # --- 1. Monthly registrations (last 12 months) ---
    twelve_months_ago = datetime.utcnow() - timedelta(days=365)
    monthly_pipeline = [
        {"$match": {"created_at": {"$gte": twelve_months_ago}}},
        {"$group": {
            "_id": {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    monthly_cursor = db.farmers.aggregate(monthly_pipeline)
    monthly_raw = await monthly_cursor.to_list(length=100)

    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_registrations = [
        {
            "month": f"{month_names[r['_id']['month']]} {r['_id']['year']}",
            "farmers": r["count"]
        }
        for r in monthly_raw
    ]

    # --- 2. Farmers by Province ---
    province_pipeline = [
        {"$group": {
            "_id": {"$ifNull": ["$location.province", "$personal_info.province", "Unknown"]},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    province_cursor = db.farmers.aggregate(province_pipeline)
    province_raw = await province_cursor.to_list(length=10)
    farmers_by_province = [
        {"province": r["_id"] or "Unknown", "farmers": r["count"]}
        for r in province_raw
    ]

    # --- 3. Farmers by District (top 10) ---
    district_pipeline = [
        {"$group": {
            "_id": {"$ifNull": ["$location.district", "$personal_info.district", "Unknown"]},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    district_cursor = db.farmers.aggregate(district_pipeline)
    district_raw = await district_cursor.to_list(length=10)
    farmers_by_district = [
        {"district": r["_id"] or "Unknown", "farmers": r["count"]}
        for r in district_raw
    ]

    # --- 4. Crops distribution ---
    all_farmers = await db.farmers.find(
        {}, {"farm_details.crops": 1, "personal_info.crops": 1}
    ).to_list(length=5000)

    crop_counts: dict = defaultdict(int)
    for f in all_farmers:
        fd = f.get("farm_details") or f.get("personal_info") or {}
        crops = fd.get("crops") or []
        if isinstance(crops, list):
            for c in crops:
                if c:
                    crop_counts[str(c).strip()] += 1

    crops_distribution = sorted(
        [{"crop": k, "count": v} for k, v in crop_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    # --- 5. Livestock distribution ---
    livestock_counts: dict = defaultdict(int)
    for f in all_farmers:
        fd = f.get("farm_details") or {}
        animals = fd.get("livestock") or []
        if isinstance(animals, list):
            for a in animals:
                if a:
                    livestock_counts[str(a).strip()] += 1

    livestock_distribution = sorted(
        [{"animal": k, "count": v} for k, v in livestock_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:8]

    # --- 6. Active vs Inactive ---
    total = await db.farmers.count_documents({})
    active = await db.farmers.count_documents({"is_active": True})
    status_breakdown = [
        {"status": "Active", "count": active},
        {"status": "Inactive", "count": total - active}
    ]

    return {
        "monthly_registrations": monthly_registrations,
        "farmers_by_province": farmers_by_province,
        "farmers_by_district": farmers_by_district,
        "crops_distribution": crops_distribution,
        "livestock_distribution": livestock_distribution,
        "status_breakdown": status_breakdown,
        "generated_at": datetime.utcnow().isoformat()
    }

