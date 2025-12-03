# backend/app/routes/reports.py
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.database import get_db
from app.dependencies.roles import require_role
from app.services.logging_service import log_event

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard", dependencies=[Depends(require_role(["ADMIN"]))])
async def dashboard_summary(db=Depends(get_db), current_user: dict = Depends(require_role(["ADMIN"]))):
    """
    High-level admin dashboard summary:
     - total farmers
     - total operators
     - active users
     - farmers registered this month
    """
    await log_event(
        level="INFO",
        module="reports",
        action="dashboard_summary",
        endpoint="/api/reports/dashboard",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
    total_farmers = await db.farmers.count_documents({})
    total_operators = await db.operators.count_documents({})
    total_users = await db.users.count_documents({})

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    farmers_this_month = await db.farmers.count_documents({"created_at": {"$gte": month_start}})

    return {
        "timestamp": datetime.utcnow(),
        "metrics": {
            "farmers_total": total_farmers,
            "operators_total": total_operators,
            "users_total": total_users,
            "farmers_registered_this_month": farmers_this_month,
        }
    }


@router.get("/farmers-by-region", dependencies=[Depends(require_role(["ADMIN"]))])
async def farmers_by_region(db=Depends(get_db), current_user: dict = Depends(require_role(["ADMIN"]))):
    """
    Aggregate farmer counts by province/district for admin geographic analytics.
    """
    await log_event(
        level="INFO",
        module="reports",
        action="farmers_by_region",
        endpoint="/api/reports/farmers-by-region",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
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
    results = await db.farmers.aggregate(pipeline).to_list(length=None)
    formatted = [
        {
            "province": r["_id"]["province"],
            "district": r["_id"]["district"],
            "farmer_count": r["count"],
        }
        for r in results
    ]
    return {"generated_at": datetime.utcnow(), "regions": formatted}


@router.get("/operator-performance", dependencies=[Depends(require_role(["ADMIN"]))])
async def operator_performance(db=Depends(get_db), current_user: dict = Depends(require_role(["ADMIN"]))):
    """
    Aggregate stats per operator: total farmers registered, recent registrations (30d).
    """
    await log_event(
        level="INFO",
        module="reports",
        action="operator_performance",
        endpoint="/api/reports/operator-performance",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
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
    results = await db.farmers.aggregate(pipeline).to_list(length=None)

    out = []
    for r in results:
        # created_by stores the email, so look up operator by email
        op = await db.operators.find_one({"email": r["_id"]}, {"full_name": 1, "email": 1, "operator_id": 1})
        
        # If not found in operators, check if it's an admin user
        if not op:
            user = await db.users.find_one({"email": r["_id"]}, {"full_name": 1, "email": 1})
            if user:
                op = {"full_name": user.get("full_name", "Admin User"), "email": user.get("email")}
        
        out.append(
            {
                "operator_id": r["_id"],
                "operator_name": op.get("full_name") if op else r["_id"],  # Use email if name not found
                "email": op.get("email") if op else r["_id"],
                "total_farmers": r["total_farmers"],
                "recent_farmers_30d": r["recent_farmers"],
            }
        )
    return {"generated_at": datetime.utcnow(), "operators": out}


@router.get("/activity-trends", dependencies=[Depends(require_role(["ADMIN"]))])
async def activity_trends(db=Depends(get_db)):
    """
    Daily registration count for past 14 days for charting.
    """
    days = 14
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
    results = await db.farmers.aggregate(pipeline).to_list(length=None)
    formatted = [
        {
            "date": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}",
            "registrations": r["count"],
        }
        for r in results
    ]
    return {"generated_at": datetime.utcnow(), "trends": formatted}


@router.get("/farmers-details", dependencies=[Depends(require_role(["ADMIN"]))])
async def farmers_details_report(db=Depends(get_db)):
    """
    Complete farmer details report with all personal and farm information.
    """
    farmers = await db.farmers.find({}, {
        "farmer_id": 1,
        "personal_info": 1,
        "address": 1,
        "farm_info": 1,
        "registration_status": 1,
        "created_by": 1,
        "created_at": 1,
        "_id": 0
    }).sort("created_at", -1).to_list(length=None)
    
    # Format the data for better readability
    formatted_farmers = []
    for farmer in farmers:
        personal_info = farmer.get("personal_info", {})
        address = farmer.get("address", {})
        farm_info = farmer.get("farm_info", {})
        
        # Get crops list
        crops_list = farm_info.get("crops_grown", [])
        if not crops_list:
            crops_list = []
        
        # Format names
        first_name = personal_info.get("first_name", "")
        last_name = personal_info.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip()
        
        formatted_farmers.append({
            "farmer_id": farmer.get("farmer_id", ""),
            "full_name": full_name if full_name else "N/A",
            "nrc_number": personal_info.get("nrc", ""),
            "phone_primary": personal_info.get("phone_primary", ""),
            "phone_secondary": personal_info.get("phone_secondary", ""),
            "gender": personal_info.get("gender", ""),
            "date_of_birth": personal_info.get("date_of_birth", ""),
            "province": address.get("province_name", ""),
            "district": address.get("district_name", ""),
            "constituency": address.get("constituency_name", ""),
            "ward": address.get("ward_name", ""),
            "village": address.get("village", ""),
            "total_land_size": farm_info.get("farm_size_hectares", 0),
            "crops": ", ".join(crops_list) if crops_list else "None",
            "years_farming": farm_info.get("years_farming", 0),
            "registration_status": farmer.get("registration_status", ""),
            "registered_by": farmer.get("created_by", ""),
            "registration_date": farmer.get("created_at", "").strftime("%Y-%m-%d") if farmer.get("created_at") else "",
        })
    
    return {
        "generated_at": datetime.utcnow(),
        "total_farmers": len(formatted_farmers),
        "farmers": formatted_farmers
    }
