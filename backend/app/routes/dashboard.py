# backend/app/routes/dashboard.py
from fastapi import APIRouter, Depends, Request
from app.database import get_db
from app.dependencies.roles import require_role
from app.services.logging_service import log_event
from datetime import datetime

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
        # Safe extraction with defaults
        personal_info = f.get("personal_info") or {}
        address = f.get("address") or {}
        
        # Get names with fallback
        first_name = personal_info.get("first_name") or ""
        last_name = personal_info.get("last_name") or ""
        
        # Build full name safely
        full_name = f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = "Unknown"
        
        recent_results.append({
            "farmer_id": f.get("farmer_id") or "N/A",
            "name": full_name,
            "district": address.get("district_name") or address.get("district") or "N/A",
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
