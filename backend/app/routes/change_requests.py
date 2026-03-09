# backend/app/routes/change_requests.py — Farmer profile change request management (v4.0)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.dependencies.roles import require_role, get_current_user
from app.services.logging_service import log_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/change-requests", tags=["Change Requests"])


# ── Pydantic Models ───────────────────────────────────────────────────────────

class ChangeRequestCreate(BaseModel):
    """Farmer submits a change request for specific fields."""
    field_name: str = Field(..., min_length=1, max_length=100, description="Field to change, e.g. 'phone_primary', 'village'")
    old_value: str = Field("", max_length=500, description="Current value")
    new_value: str = Field(..., min_length=1, max_length=500, description="Requested new value")
    reason: str = Field("", max_length=500, description="Optional reason for change")


class ChangeRequestDecision(BaseModel):
    """Operator/admin approves or rejects a change request."""
    decision: str = Field(..., pattern=r"^(approved|rejected)$")
    note: str = Field("", max_length=500, description="Required note when rejecting; optional when approving")

    def model_post_init(self, __context: object) -> None:
        """Enforce that a rejection reason is provided (TC-087)."""
        if self.decision == "rejected" and not self.note.strip():
            raise ValueError("A reason is required when rejecting a change request")


class ChangeRequestResponse(BaseModel):
    request_id: str
    farmer_id: str
    farmer_name: str
    field_name: str
    old_value: str
    new_value: str
    reason: str
    status: str
    decided_by: Optional[str] = None
    decision_note: Optional[str] = None
    created_at: str
    decided_at: Optional[str] = None


# ── Farmer: Create Change Request ─────────────────────────────────────────────

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Submit a profile change request (farmer only)",
)
async def create_change_request(
    payload: ChangeRequestCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["FARMER"])),
):
    """Farmer submits a request to change a profile field. Requires operator approval."""
    farmer_id = current_user.get("farmer_id")
    if not farmer_id:
        raise HTTPException(status_code=403, detail="Only farmers can submit change requests")

    # Disallow changes to protected fields (TC-080: NRC requires admin action)
    protected_fields = {"farmer_id", "nrc_number", "first_name", "last_name"}
    if payload.field_name in protected_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Field '{payload.field_name}' cannot be changed via self-service. Contact your operator.",
        )

    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer record not found")

    # TC-081: Block duplicate pending requests for the same field
    existing_pending = await db.change_requests.find_one({
        "farmer_id": farmer_id,
        "field_name": payload.field_name,
        "status": "pending",
    })
    if existing_pending:
        raise HTTPException(
            status_code=409,
            detail=f"You already have a pending request for '{payload.field_name}'. Wait for it to be reviewed before submitting another.",
        )

    farmer_name = f"{farmer.get('personal_info', {}).get('first_name', '')} {farmer.get('personal_info', {}).get('last_name', '')}".strip()

    doc = {
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "field_name": payload.field_name,
        "old_value": payload.old_value,
        "new_value": payload.new_value,
        "reason": payload.reason,
        "status": "pending",
        "decided_by": None,
        "decision_note": None,
        "created_at": datetime.now(timezone.utc),
        "decided_at": None,
    }

    result = await db.change_requests.insert_one(doc)

    await log_event(
        level="INFO", module="change_requests", action="create",
        details={"farmer_id": farmer_id, "field": payload.field_name},
        endpoint="/api/change-requests",
        user_id=farmer_id, role="FARMER",
    )

    return {
        "message": "Change request submitted successfully",
        "request_id": str(result.inserted_id),
        "status": "pending",
    }


# ── Farmer: List Own Change Requests ──────────────────────────────────────────

@router.get(
    "/my",
    summary="List my change requests (farmer only)",
)
async def list_my_change_requests(
    status_filter: Optional[str] = Query(None, alias="status", pattern=r"^(pending|approved|rejected)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["FARMER"])),
):
    """Farmer views their own submitted change requests."""
    farmer_id = current_user.get("farmer_id")
    if not farmer_id:
        raise HTTPException(status_code=403, detail="Only farmers can view their change requests")

    query: dict = {"farmer_id": farmer_id}
    if status_filter:
        query["status"] = status_filter

    cursor = db.change_requests.find(query).sort("created_at", -1).limit(50)
    items = await cursor.to_list(length=50)

    return {
        "requests": [
            {
                "request_id": str(r["_id"]),
                "field_name": r["field_name"],
                "old_value": r.get("old_value", ""),
                "new_value": r["new_value"],
                "reason": r.get("reason", ""),
                "status": r["status"],
                "decision_note": r.get("decision_note"),
                "created_at": r["created_at"].isoformat() if isinstance(r["created_at"], datetime) else str(r["created_at"]),
                "decided_at": r["decided_at"].isoformat() if isinstance(r.get("decided_at"), datetime) else None,
            }
            for r in items
        ],
        "total": len(items),
    }


# ── Operator/Admin: List Pending Requests ─────────────────────────────────────

@router.get(
    "/pending",
    summary="List pending change requests (operator/admin)",
)
async def list_pending_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Operator/admin views pending change requests for their farmers."""
    query: dict = {"status": "pending"}

    # Operators only see requests from farmers in their assigned districts
    if "OPERATOR" in current_user.get("roles", []) and "ADMIN" not in current_user.get("roles", []):
        operator = await db.operators.find_one({"email": current_user.get("email")})
        if operator:
            districts = operator.get("assigned_districts", [])
            if districts:
                farmer_ids_cursor = db.farmers.find(
                    {"address.district_name": {"$in": districts}},
                    {"farmer_id": 1}
                )
                farmer_ids = [f["farmer_id"] async for f in farmer_ids_cursor]
                query["farmer_id"] = {"$in": farmer_ids}

    total = await db.change_requests.count_documents(query)
    cursor = db.change_requests.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)

    return {
        "requests": [
            {
                "request_id": str(r["_id"]),
                "farmer_id": r["farmer_id"],
                "farmer_name": r.get("farmer_name", ""),
                "field_name": r["field_name"],
                "old_value": r.get("old_value", ""),
                "new_value": r["new_value"],
                "reason": r.get("reason", ""),
                "status": r["status"],
                "created_at": r["created_at"].isoformat() if isinstance(r["created_at"], datetime) else str(r["created_at"]),
            }
            for r in items
        ],
        "total": total,
    }


# ── Operator/Admin: Decide on a Request ──────────────────────────────────────

@router.patch(
    "/{request_id}/decide",
    summary="Approve or reject a change request (operator/admin)",
)
async def decide_change_request(
    request_id: str,
    payload: ChangeRequestDecision,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Operator/admin approves or rejects a farmer's change request."""
    from bson import ObjectId

    try:
        obj_id = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    cr = await db.change_requests.find_one({"_id": obj_id})
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
    if cr["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {cr['status']}")

    decided_by = current_user.get("email") or current_user.get("farmer_id") or "unknown"
    now = datetime.now(timezone.utc)

    await db.change_requests.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": payload.decision,
            "decided_by": decided_by,
            "decision_note": payload.note,
            "decided_at": now,
        }},
    )

    # If approved, apply the change to the farmer record
    if payload.decision == "approved":
        field = cr["field_name"]
        new_val = cr["new_value"]
        farmer_id = cr["farmer_id"]

        # Map field names to their MongoDB paths
        field_map = {
            "phone_primary": "personal_info.phone_primary",
            "phone_secondary": "personal_info.phone_secondary",
            "email": "personal_info.email",
            "date_of_birth": "personal_info.date_of_birth",
            "village": "address.village",
            "ward": "address.ward",
            "camp": "address.camp",
            "chiefdom": "address.chiefdom_name",
            "district": "address.district_name",
            "province": "address.province_name",
            "farm_size": "farm_info.total_land_size",
            "irrigation_access": "farm_info.irrigation_access",
        }

        db_field = field_map.get(field, field)
        await db.farmers.update_one(
            {"farmer_id": farmer_id},
            {
                "$set": {db_field: new_val, "updated_at": now},
                "$push": {
                    "status_history": {
                        "status": "profile_updated",
                        "changed_by": decided_by,
                        "changed_at": now,
                        "note": f"Change request approved: {field} updated to '{new_val}'",
                    }
                },
            },
        )

    # Create a notification for the farmer
    await db.notifications.insert_one({
        "user_id": cr["farmer_id"],
        "user_type": "farmer",
        "type": "change_request_decision",
        "title": f"Change request {payload.decision}",
        "body": f"Your request to change '{cr['field_name']}' has been {payload.decision}."
               + (f" Note: {payload.note}" if payload.note else ""),
        "read": False,
        "created_at": now,
        "expires_at": None,
    })

    await log_event(
        level="INFO", module="change_requests", action=f"decide.{payload.decision}",
        details={"request_id": request_id, "farmer_id": cr["farmer_id"], "field": cr["field_name"]},
        endpoint=f"/api/change-requests/{request_id}/decide",
        user_id=decided_by, role=",".join(current_user.get("roles", [])),
    )

    return {
        "message": f"Change request {payload.decision}",
        "request_id": request_id,
        "status": payload.decision,
    }
