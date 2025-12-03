# backend/app/routes/operators.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from uuid import uuid4
from datetime import datetime, timezone
from app.database import get_db
from app.dependencies.roles import require_role, require_admin, get_current_user
from app.utils.security import hash_password
from app.models.user import UserRole
from bson import ObjectId # Import ObjectId
from app.services.logging_service import log_event


router = APIRouter(prefix="/operators", tags=["Operators"])


# ---------------------------
# Pydantic schemas
# ---------------------------
class OperatorCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., example="Alice Tembo")
    phone: Optional[str] = Field(None, example="+260971234567")
    password: str = Field(..., min_length=8)
    assigned_regions: Optional[List[str]] = Field(default_factory=list)
    assigned_districts: Optional[List[str]] = Field(default_factory=list)


class OperatorUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    assigned_regions: Optional[List[str]] = None
    assigned_districts: Optional[List[str]] = None
    is_active: Optional[bool] = None


class OperatorOut(BaseModel):
    operator_id: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    assigned_regions: List[str] = Field(default_factory=list)
    assigned_districts: List[str] = Field(default_factory=list)
    is_active: bool
    created_at: datetime
    farmer_count: int = 0


# ---------------------------
# Helper functions
# ---------------------------
def _doc_to_operator(doc: dict) -> Dict[str, Any]:
    if not doc:
        return {}
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def _get_operator_stats(operator_id: str, db):
    """Quick stats for an operator."""
    # Get operator to check assigned districts
    operator_doc = await db.operators.find_one({"operator_id": operator_id})
    assigned_districts = operator_doc.get("assigned_districts", []) if operator_doc else []
    
    # Build query based on district assignment or created_by
    if assigned_districts:
        # Count farmers in assigned districts
        farmer_query = {"address.district_name": {"$in": assigned_districts}}
    else:
        # No districts assigned - count only farmers created by this operator
        farmer_query = {"created_by": operator_id}
    
    farmer_count = await db.farmers.count_documents(farmer_query)
    from datetime import timedelta
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recent_query = {**farmer_query, "created_at": {"$gte": recent_cutoff}}
    recent_count = await db.farmers.count_documents(recent_query)
    pipeline = [
        {"$match": farmer_query},
        {
            "$group": {
                "_id": None,
                "total_land": {"$sum": {"$ifNull": ["$farm_info.farm_size_hectares", 0]}},
                "avg_land": {"$avg": {"$ifNull": ["$farm_info.farm_size_hectares", 0]}},
            }
        },
    ]
    agg = await db.farmers.aggregate(pipeline).to_list(length=1)
    total_land = agg[0]["total_land"] if agg else 0
    avg_land = agg[0]["avg_land"] if agg else 0
    return {
        "farmer_count": farmer_count,
        "recent_registrations_30d": recent_count,
        "total_land_hectares": total_land,
        "avg_land_hectares": avg_land,
    }


# ---------------------------
# Routes
# ---------------------------
@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
    summary="Create operator",
    description="Admin only. Creates user and operator profile."
)
async def create_operator(payload: OperatorCreate, db=Depends(get_db), current_user: dict = Depends(require_admin)):
    await log_event(
        level="INFO",
        module="operators",
        action="create_attempt",
        details={"email": payload.email},
        endpoint="/api/operators",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
    email = payload.email.lower().strip()

    # Check if user exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Create user record
    now = datetime.now(timezone.utc)
    user_doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "roles": [UserRole.OPERATOR.value],
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    user_res = await db.users.insert_one(user_doc)
    user_id = str(user_res.inserted_id)

    operator_id = "OP" + uuid4().hex[:8].upper()
    operator_doc = {
        "operator_id": operator_id,
        "user_id": user_id,
        "email": email,
        "full_name": payload.full_name,
        "phone": payload.phone,
        "assigned_regions": payload.assigned_regions or [],
        "assigned_districts": payload.assigned_districts or [],
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.operators.insert_one(operator_doc)

    out = OperatorOut(
        operator_id=operator_id,
        email=email,
        full_name=payload.full_name,
        phone=payload.phone,
        assigned_regions=operator_doc["assigned_regions"],
        assigned_districts=operator_doc["assigned_districts"],
        is_active=True,
        created_at=now,
        farmer_count=0,
    )
    await log_event(
        level="INFO",
        module="operators",
        action="create_success",
        details={"operator_id": operator_id, "email": email},
        endpoint="/api/operators",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
    return {"message": "Operator created", "operator": out.dict()}


@router.get(
    "/",
    dependencies=[Depends(require_admin)],
    summary="List operators",
    description="Admin only. List operator profiles, with per-operator stats."
)
async def list_operators(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    region: Optional[str] = None,
    is_active: Optional[bool] = None,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    await log_event(
        level="DEBUG",
        module="operators",
        action="list_query",
        details={"skip": skip, "limit": limit, "region": region, "is_active": is_active},
        endpoint="/api/operators",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
    query = {}
    if region:
        query["assigned_regions"] = region
    if is_active is not None:
        query["is_active"] = is_active

    cursor = db.operators.find(query).skip(skip).limit(limit)
    ops = await cursor.to_list(length=limit)

    results = []
    for op in ops:
        op_doc = _doc_to_operator(op)
        stats = await _get_operator_stats(op_doc["operator_id"], db)
        op_doc["farmer_count"] = stats["farmer_count"]
        results.append(op_doc)

    return {"count": len(results), "results": results}


@router.get(
    "/{operator_id}",
    dependencies=[Depends(require_role([UserRole.ADMIN.value, UserRole.OPERATOR.value]))],
    summary="Get operator",
    description="Get details and stats of specific operator."
)
async def get_operator(operator_id: str, db=Depends(get_db), current_user: dict = Depends(require_role([UserRole.ADMIN.value, UserRole.OPERATOR.value]))):
    await log_event(
        level="DEBUG",
        module="operators",
        action="get_attempt",
        details={"operator_id": operator_id},
        endpoint=f"/api/operators/{operator_id}",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])),
    )
    op = await db.operators.find_one({"operator_id": operator_id})
    if not op:
        await log_event(
            level="WARNING",
            module="operators",
            action="get_not_found",
            details={"operator_id": operator_id},
            endpoint=f"/api/operators/{operator_id}",
            user_id=current_user.get("email"),
            role=",".join(current_user.get("roles", [])),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")
    op_doc = _doc_to_operator(op)
    stats = await _get_operator_stats(operator_id, db)
    op_doc.update(stats)
    return op_doc


@router.put(
    "/{operator_id}",
    dependencies=[Depends(require_admin)],
    summary="Update operator",
    description="Admin only. Update operator details or deactivate."
)
async def update_operator(operator_id: str, payload: OperatorUpdate, db=Depends(get_db), current_user: dict = Depends(require_admin)):
    await log_event(
        level="INFO",
        module="operators",
        action="update_attempt",
        details={"operator_id": operator_id},
        endpoint=f"/api/operators/{operator_id}",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
    op = await db.operators.find_one({"operator_id": operator_id})
    if not op:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")

    # Build update dict, excluding None values and empty lists
    update_data = {}
    for key, value in payload.dict().items():
        if value is not None:
            # Skip empty lists for assigned_districts/assigned_regions
            if isinstance(value, list) and len(value) == 0 and key in ['assigned_districts', 'assigned_regions']:
                continue
            update_data[key] = value
    
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.operators.update_one({"operator_id": operator_id}, {"$set": update_data})

    # If 'is_active' status is being updated for the operator, update the corresponding user's 'is_active' status as well.
    if "is_active" in update_data:
        user_id_value = op.get("user_id")
        filter_id = None
        try:
            # Support both string and ObjectId forms in existing data
            if isinstance(user_id_value, str):
                filter_id = ObjectId(user_id_value)
            else:
                filter_id = user_id_value
        except Exception:
            filter_id = None

        # Fallback by email if user_id is missing or invalid
        if not filter_id:
            user_doc = await db.users.find_one({"email": op.get("email")})
            filter_id = user_doc.get("_id") if user_doc else None

        if filter_id:
            await db.users.update_one(
                {"_id": filter_id},
                {"$set": {"is_active": update_data["is_active"]}}
            )

    updated = await db.operators.find_one({"operator_id": operator_id})
    return _doc_to_operator(updated)


@router.delete(
    "/{operator_id}",
    dependencies=[Depends(require_admin)],
    summary="Delete operator",
    description="Admin only. Only allowed if operator has no assigned farmers."
)
async def delete_operator(operator_id: str, db=Depends(get_db)):
    op = await db.operators.find_one({"operator_id": operator_id})
    if not op:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")

    farmer_count = await db.farmers.count_documents({"created_by": operator_id})
    if farmer_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete operator with {farmer_count} assigned farmers",
        )

    await db.operators.delete_one({"operator_id": operator_id})
    await db.users.delete_one({"_id": op["user_id"]})
    return {"message": "Operator deleted"}


@router.get(
    "/{operator_id}/farmers",
    dependencies=[Depends(require_role([UserRole.ADMIN.value, UserRole.OPERATOR.value]))],
    summary="List operator's farmers",
    description="Get farmers created by this operator."
)
async def get_operator_farmers(
    operator_id: str,
    skip: int = 0,
    limit: int = 50,
    db=Depends(get_db)
):
    cursor = db.farmers.find({"created_by": operator_id}).skip(skip).limit(limit)
    farmers = await cursor.to_list(length=limit)
    for f in farmers:
        f.pop("_id", None)
    return {"count": len(farmers), "results": farmers}


@router.get(
    "/{operator_id}/stats",
    dependencies=[Depends(require_admin)],
    summary="Get operator statistics",
    description="Admin only. Returns aggregated statistics for this operator."
)
async def operator_statistics(operator_id: str, db=Depends(get_db)):
    op = await db.operators.find_one({"operator_id": operator_id})
    if not op:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")

    stats = await _get_operator_stats(operator_id, db)
    return {"operator_id": operator_id, "operator_name": op.get("full_name"), **stats}
