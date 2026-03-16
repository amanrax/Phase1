# backend/app/routes/supplies.py — Advanced supply request management for farmers and admins
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.database import get_db
from app.dependencies.roles import require_role
from app.services.logging_service import log_event
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import logging
import re

router = APIRouter(prefix="/supplies", tags=["Supply Requests"])
_log = logging.getLogger("supplies")

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class SupplyItem(BaseModel):
    name: str
    quantity_value: float = Field(..., gt=0)
    quantity_unit: str  # bags, kg, liters, units, tonnes, crates, boxes, litres, pieces

class SupplyRequestCreate(BaseModel):
    category: str                          # Seeds, Fertilizers, Pesticides, Tools, Equipment, Storage, Transport, Other
    items: List[SupplyItem]
    urgency: str = "medium"                # low, medium, high, critical
    delivery_location: str
    preferred_delivery_date: Optional[str] = None   # ISO date string
    purpose: str                           # Why they need these supplies
    season: Optional[str] = None           # e.g., "2025/2026"
    farm_size_covered: Optional[float] = None  # hectares
    budget_estimate: Optional[float] = None    # ZMW
    contact_phone: Optional[str] = None    # Override phone for this request
    notes: Optional[str] = None

class SupplyRequestEdit(BaseModel):
    category: Optional[str] = None
    items: Optional[List[SupplyItem]] = None
    urgency: Optional[str] = None
    delivery_location: Optional[str] = None
    preferred_delivery_date: Optional[str] = None
    purpose: Optional[str] = None
    season: Optional[str] = None
    farm_size_covered: Optional[float] = None
    budget_estimate: Optional[float] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None

class SupplyRequestUpdate(BaseModel):
    status: str                            # pending, approved, processing, dispatched, fulfilled, rejected, cancelled
    admin_notes: Optional[str] = None
    estimated_delivery_date: Optional[str] = None
    fulfilled_items: Optional[List[str]] = None  # Which items were actually provided

class CancelRequest(BaseModel):
    reason: Optional[str] = None


# ─── Helper ───────────────────────────────────────────────────────────────────

def _format_request(req: dict) -> dict:
    """Serialize a MongoDB supply request document to a JSON-safe dict."""
    return {
        "id":                     str(req.get("_id", "")),
        "request_ref":            req.get("request_ref", ""),
        "farmer_id":              req.get("farmer_id", ""),
        "farmer_email":           req.get("farmer_email", ""),
        "farmer_name":            req.get("farmer_name", ""),
        "farmer_phone":           req.get("farmer_phone", ""),
        "farmer_district":        req.get("farmer_district", ""),
        "farmer_province":        req.get("farmer_province", ""),
        "category":               req.get("category", ""),
        "items":                  req.get("items", []),
        "urgency":                req.get("urgency", "medium"),
        "delivery_location":      req.get("delivery_location", ""),
        "preferred_delivery_date":req.get("preferred_delivery_date"),
        "purpose":                req.get("purpose", ""),
        "season":                 req.get("season"),
        "farm_size_covered":      req.get("farm_size_covered"),
        "budget_estimate":        req.get("budget_estimate"),
        "contact_phone":          req.get("contact_phone"),
        "notes":                  req.get("notes"),
        "status":                 req.get("status", "pending"),
        "admin_notes":            req.get("admin_notes"),
        "estimated_delivery_date":req.get("estimated_delivery_date"),
        "fulfilled_items":        req.get("fulfilled_items", []),
        "status_history":         req.get("status_history", []),
        "created_at":             req.get("created_at").isoformat() if req.get("created_at") else None,
        "updated_at":             req.get("updated_at").isoformat() if req.get("updated_at") else None,
    }


def _make_ref(db_sequence: int) -> str:
    """Generate a human-readable request reference like SR-2026-00042."""
    year = datetime.now(timezone.utc).year
    return f"SR-{year}-{str(db_sequence).zfill(5)}"


async def _log(request: Request, level: str, action: str, details: dict, current_user: dict):
    try:
        await log_event(
            level=level,
            module="supplies",
            action=action,
            details=details,
            endpoint=str(request.url),
            user_id=current_user.get("email"),
            role=(current_user.get("roles") or [""])[0],
            ip_address=request.client.host if request.client else None,
        )
    except Exception as exc:
        _log.warning("log_event failed: %s", exc)


# ─── FARMER Endpoints ─────────────────────────────────────────────────────────

@router.post("/request", summary="Create supply request (Farmer)")
async def create_supply_request(
    request: Request,
    body: SupplyRequestCreate,
    current_user: dict = Depends(require_role(["FARMER"])),
    db=Depends(get_db),
):
    await _log(request, "INFO", "create_request.attempt",
               {"category": body.category, "urgency": body.urgency, "item_count": len(body.items)}, current_user)

    # Validation
    valid_categories = {"Seeds", "Fertilizers", "Pesticides", "Tools", "Equipment",
                        "Storage", "Transport", "Irrigation", "Other"}
    if body.category not in valid_categories:
        raise HTTPException(400, f"Invalid category. Choose from: {', '.join(sorted(valid_categories))}")

    valid_urgency = {"low", "medium", "high", "critical"}
    if body.urgency not in valid_urgency:
        raise HTTPException(400, "Urgency must be: low, medium, high, or critical")

    if not body.items:
        raise HTTPException(400, "At least one supply item is required")

    valid_units = {"bags", "kg", "liters", "litres", "units", "tonnes", "crates", "boxes", "pieces", "rolls", "drums"}
    for item in body.items:
        if not item.name.strip():
            raise HTTPException(400, "Item name cannot be empty")
        if item.quantity_unit.lower() not in valid_units:
            raise HTTPException(400, f"Invalid unit '{item.quantity_unit}'. Valid: {', '.join(sorted(valid_units))}")

    if not body.delivery_location.strip():
        raise HTTPException(400, "Delivery location is required")

    if not body.purpose.strip():
        raise HTTPException(400, "Purpose is required — explain why you need these supplies")

    # Fetch farmer profile — prefer farmer_id (set for all farmer tokens), fallback to email
    farmer = None
    if current_user.get("farmer_id"):
        farmer = await db.farmers.find_one({"farmer_id": current_user["farmer_id"]})
    if not farmer and current_user.get("email"):
        farmer = await db.farmers.find_one({"personal_info.email": current_user.get("email")})
    if not farmer:
        await _log(request, "ERROR", "create_request.farmer_not_found",
                   {"farmer_id": current_user.get("farmer_id"), "email": current_user.get("email")}, current_user)
        raise HTTPException(404, "Farmer profile not found. Ensure your account is linked to a farmer record.")

    pi = farmer.get("personal_info", {})
    addr = farmer.get("address", {})
    farmer_name = f"{pi.get('first_name', '')} {pi.get('last_name', '')}".strip() or farmer.get("full_name", "")

    # Generate sequential reference
    total = await db.supply_requests.count_documents({})
    ref = _make_ref(total + 1)

    now = datetime.now(timezone.utc)
    doc = {
        "request_ref":            ref,
        "farmer_id":              farmer.get("farmer_id", ""),
        "farmer_email":           current_user.get("email") or farmer.get("personal_info", {}).get("email", ""),
        "farmer_name":            farmer_name,
        "farmer_phone":           body.contact_phone or pi.get("phone_primary", ""),
        "farmer_district":        addr.get("district_name", ""),
        "farmer_province":        addr.get("province_name", ""),
        "category":               body.category,
        "items":                  [i.dict() for i in body.items],
        "urgency":                body.urgency,
        "delivery_location":      body.delivery_location.strip(),
        "preferred_delivery_date":body.preferred_delivery_date,
        "purpose":                body.purpose.strip(),
        "season":                 body.season,
        "farm_size_covered":      body.farm_size_covered,
        "budget_estimate":        body.budget_estimate,
        "contact_phone":          body.contact_phone,
        "notes":                  body.notes,
        "status":                 "pending",
        "admin_notes":            None,
        "estimated_delivery_date":None,
        "fulfilled_items":        [],
        "status_history": [
            {
                "status":     "pending",
                "changed_by": current_user.get("email") or current_user.get("farmer_id", "farmer"),
                "role":       "FARMER",
                "note":       "Request submitted",
                "timestamp":  now.isoformat(),
            }
        ],
        "created_at":             now,
        "updated_at":             now,
    }

    result = await db.supply_requests.insert_one(doc)
    doc_id = str(result.inserted_id)

    await _log(request, "INFO", "create_request.success",
               {"request_id": doc_id, "ref": ref, "farmer_id": farmer.get("farmer_id")}, current_user)

    return {
        "message": "Supply request created successfully",
        "request_id": doc_id,
        "request_ref": ref,
        "status": "pending",
    }


@router.post("", summary="Create supply request (Farmer) — alias")
async def create_supply_request_alias(
    request: Request,
    body: SupplyRequestCreate,
    current_user: dict = Depends(require_role(["FARMER"])),
    db=Depends(get_db),
):
    """Alias for clients using POST /api/supplies instead of /api/supplies/request."""
    return await create_supply_request(request, body, current_user, db)


@router.get("/my-requests", summary="Get farmer's own supply requests")
async def get_my_supply_requests(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_role(["FARMER"])),
    db=Depends(get_db),
):
    await _log(request, "INFO", "get_my_requests",
               {"filters": {"status": status, "category": category}}, current_user)

    # Use farmer_id as the primary ownership key (always present for farmer tokens)
    farmer_filter: dict = {"farmer_id": current_user["farmer_id"]} if current_user.get("farmer_id") else {"farmer_email": current_user.get("email")}
    query: dict = dict(farmer_filter)
    if status:
        query["status"] = status.lower()
    if category:
        query["category"] = category
    if urgency:
        query["urgency"] = urgency.lower()

    try:
        total = await db.supply_requests.count_documents(query)
        docs = await db.supply_requests.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        result = [_format_request(d) for d in docs]

        # Compute status summary for this farmer
        pipeline = [
            {"$match": farmer_filter},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        agg = await db.supply_requests.aggregate(pipeline).to_list(length=20)
        summary = {row["_id"]: row["count"] for row in agg}

        await _log(request, "INFO", "get_my_requests.success", {"count": total}, current_user)
        return {"requests": result, "total": total, "summary": summary, "limit": limit, "skip": skip}
    except Exception as exc:
        _log.error("get_my_requests failed: %s", exc, exc_info=True)
        await _log(request, "ERROR", "get_my_requests.error", {"error": str(exc)}, current_user)
        raise HTTPException(500, "Failed to fetch supply requests")


@router.get("/my-requests/{request_id}", summary="Get single supply request (Farmer)")
async def get_single_supply_request_farmer(
    request: Request,
    request_id: str,
    current_user: dict = Depends(require_role(["FARMER"])),
    db=Depends(get_db),
):
    from bson import ObjectId
    await _log(request, "INFO", "get_single_request", {"request_id": request_id}, current_user)

    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(400, "Invalid request ID format")

    ownership = {"farmer_id": current_user["farmer_id"]} if current_user.get("farmer_id") else {"farmer_email": current_user.get("email")}
    doc = await db.supply_requests.find_one({"_id": oid, **ownership})
    if not doc:
        await _log(request, "WARNING", "get_single_request.not_found", {"request_id": request_id}, current_user)
        raise HTTPException(404, "Supply request not found or does not belong to you")

    await _log(request, "INFO", "get_single_request.success", {"request_id": request_id}, current_user)
    return _format_request(doc)


@router.patch("/cancel/{request_id}", summary="Farmer cancels own pending request")
async def cancel_supply_request(
    request: Request,
    request_id: str,
    body: CancelRequest,
    current_user: dict = Depends(require_role(["FARMER"])),
    db=Depends(get_db),
):
    from bson import ObjectId
    await _log(request, "INFO", "cancel_request.attempt",
               {"request_id": request_id}, current_user)

    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(400, "Invalid request ID format")

    ownership = {"farmer_id": current_user["farmer_id"]} if current_user.get("farmer_id") else {"farmer_email": current_user.get("email")}
    doc = await db.supply_requests.find_one({"_id": oid, **ownership})
    if not doc:
        raise HTTPException(404, "Supply request not found or does not belong to you")

    if doc.get("status") not in ("pending",):
        raise HTTPException(
            400,
            f"Cannot cancel a request with status '{doc.get('status')}'. Only pending requests can be cancelled."
        )

    now = datetime.now(timezone.utc)
    history_entry = {
        "status":     "cancelled",
        "changed_by": current_user.get("email") or current_user.get("farmer_id", "farmer"),
        "role":       "FARMER",
        "note":       body.reason or "Cancelled by farmer",
        "timestamp":  now.isoformat(),
    }

    await db.supply_requests.update_one(
        {"_id": oid},
        {
            "$set":  {"status": "cancelled", "updated_at": now},
            "$push": {"status_history": history_entry},
        },
    )

    await _log(request, "INFO", "cancel_request.success",
               {"request_id": request_id, "reason": body.reason}, current_user)
    return {"message": "Request cancelled successfully", "request_id": request_id}


@router.patch("/farmer-edit/{request_id}", summary="Farmer edits own pending request")
async def farmer_edit_supply_request(
    request: Request,
    request_id: str,
    body: SupplyRequestEdit,
    current_user: dict = Depends(require_role(["FARMER"])),
    db=Depends(get_db),
):
    from bson import ObjectId
    await _log(request, "INFO", "farmer_edit.attempt",
               {"request_id": request_id}, current_user)

    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(400, "Invalid request ID format")

    ownership = {"farmer_id": current_user["farmer_id"]} if current_user.get("farmer_id") else {"farmer_email": current_user.get("email")}
    doc = await db.supply_requests.find_one({"_id": oid, **ownership})
    if not doc:
        raise HTTPException(404, "Supply request not found or does not belong to you")

    if doc.get("status") != "pending":
        raise HTTPException(
            400,
            f"Cannot edit a request with status '{doc.get('status')}'. Only pending requests can be edited."
        )

    update_fields: dict = {"updated_at": datetime.now(timezone.utc)}
    payload = body.dict(exclude_unset=True)

    if "items" in payload:
        update_fields["items"] = [i.dict() if hasattr(i, "dict") else i for i in (body.items or [])]
    for key in ("category", "urgency", "delivery_location", "preferred_delivery_date",
                "purpose", "season", "farm_size_covered", "budget_estimate", "contact_phone", "notes"):
        if key in payload and payload[key] is not None:
            update_fields[key] = payload[key]

    await db.supply_requests.update_one({"_id": oid}, {"$set": update_fields})

    await _log(request, "INFO", "farmer_edit.success",
               {"request_id": request_id, "fields": list(update_fields.keys())}, current_user)
    return {"message": "Request updated successfully", "request_id": request_id}


# ─── ADMIN Endpoints ──────────────────────────────────────────────────────────

@router.get("/categories", summary="List valid supply categories (public)")
async def list_supply_categories():
    """Return the list of valid supply request categories."""
    categories = sorted(["Seeds", "Fertilizers", "Pesticides", "Tools", "Equipment",
                         "Storage", "Transport", "Irrigation", "Other"])
    return [{"name": c, "label": c} for c in categories]


@router.get("/all-requests", summary="Get all supply requests — alias for /all (Admin)")
async def get_all_supply_requests_alias(
    request: Request,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    farmer_id: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_role(["ADMIN"])),  # Admin only — operators should not see all supply requests
    db=Depends(get_db),
):
    query: dict = {}
    if status:
        query["status"] = status.lower()
    if category:
        query["category"] = category
    if farmer_id:
        query["farmer_id"] = farmer_id
    total = await db.supply_requests.count_documents(query)
    docs = await db.supply_requests.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    return {"requests": [_format_request(d) for d in docs], "total": total}


@router.get("/all", summary="Get all supply requests (Admin)")
async def get_all_supply_requests(
    request: Request,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    farmer_id: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Search by farmer name or ref"),
    limit: int = Query(200, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_role(["ADMIN"])),  # Admin only — operators must not access all supply requests
    db=Depends(get_db),
):
    await _log(request, "INFO", "admin_get_all",
               {"filters": {"status": status, "category": category, "urgency": urgency}}, current_user)

    query: dict = {}
    if status:
        query["status"] = status.lower()
    if category:
        query["category"] = category
    if urgency:
        query["urgency"] = urgency.lower()
    if farmer_id:
        query["farmer_id"] = farmer_id
    if province:
        query["farmer_province"] = {"$regex": re.escape(province), "$options": "i"}
    if search:
        safe_search = re.escape(search)
        query["$or"] = [
            {"farmer_name":  {"$regex": safe_search, "$options": "i"}},
            {"request_ref":  {"$regex": safe_search, "$options": "i"}},
            {"farmer_id":    {"$regex": safe_search, "$options": "i"}},
        ]

    try:
        total = await db.supply_requests.count_documents(query)
        docs  = await db.supply_requests.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        result = [_format_request(d) for d in docs]

        await _log(request, "INFO", "admin_get_all.success", {"total": total, "returned": len(result)}, current_user)
        return {"requests": result, "total": total, "limit": limit, "skip": skip}
    except Exception as exc:
        _log.error("admin_get_all failed: %s", exc, exc_info=True)
        await _log(request, "ERROR", "admin_get_all.error", {"error": str(exc)}, current_user)
        raise HTTPException(500, "Failed to fetch supply requests")


@router.get("/stats", summary="Supply request statistics (Admin)")
async def get_supply_stats(
    request: Request,
    current_user: dict = Depends(require_role(["ADMIN"])),
    db=Depends(get_db),
):
    await _log(request, "INFO", "admin_stats", {}, current_user)

    try:
        by_status   = await db.supply_requests.aggregate([
            {"$group": {"_id": "$status",   "count": {"$sum": 1}}}
        ]).to_list(length=20)

        by_urgency  = await db.supply_requests.aggregate([
            {"$group": {"_id": "$urgency",  "count": {"$sum": 1}}}
        ]).to_list(length=20)

        by_category = await db.supply_requests.aggregate([
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]).to_list(length=20)

        by_province = await db.supply_requests.aggregate([
            {"$group": {"_id": "$farmer_province", "count": {"$sum": 1}}},
            {"$sort":  {"count": -1}},
            {"$limit": 15},
        ]).to_list(length=15)

        monthly = await db.supply_requests.aggregate([
            {"$group": {
                "_id": {
                    "year":  {"$year":  "$created_at"},
                    "month": {"$month": "$created_at"},
                },
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id.year": -1, "_id.month": -1}},
            {"$limit": 12},
        ]).to_list(length=12)

        total = await db.supply_requests.count_documents({})

        return {
            "total":       total,
            "by_status":   {r["_id"]: r["count"] for r in by_status},
            "by_urgency":  {r["_id"]: r["count"] for r in by_urgency},
            "by_category": {r["_id"]: r["count"] for r in by_category},
            "by_province": {r["_id"] or "Unknown": r["count"] for r in by_province},
            "monthly":     [
                {
                    "label": f"{m['_id']['year']}-{str(m['_id']['month']).zfill(2)}",
                    "count": m["count"],
                }
                for m in reversed(monthly)
            ],
        }
    except Exception as exc:
        _log.error("admin_stats failed: %s", exc, exc_info=True)
        raise HTTPException(500, "Failed to compute statistics")


@router.get("/detail/{request_id}", summary="Get single request detail (Admin)")
async def get_request_detail_admin(
    request: Request,
    request_id: str,
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
    db=Depends(get_db),
):
    from bson import ObjectId
    await _log(request, "INFO", "admin_get_detail", {"request_id": request_id}, current_user)

    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(400, "Invalid request ID format")

    doc = await db.supply_requests.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Supply request not found")

    await _log(request, "INFO", "admin_get_detail.success", {"request_id": request_id}, current_user)
    return _format_request(doc)


@router.patch("/{request_id}", summary="Update supply request status (Admin)")
async def update_supply_request(
    request: Request,
    request_id: str,
    body: SupplyRequestUpdate,
    current_user: dict = Depends(require_role(["ADMIN"])),
    db=Depends(get_db),
):
    from bson import ObjectId
    await _log(request, "INFO", "admin_update.attempt",
               {
                   "request_id": request_id,
                   "new_status": body.status,
                   "changed_by": current_user.get("email"),
                   "timestamp": datetime.now(timezone.utc).isoformat(),
               }, current_user)

    valid_statuses = {"pending", "approved", "processing", "dispatched", "fulfilled", "rejected", "cancelled"}
    if body.status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Choose from: {', '.join(sorted(valid_statuses))}")

    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(400, "Invalid request ID format")

    doc = await db.supply_requests.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Supply request not found")

    old_status = doc.get("status")

    now = datetime.now(timezone.utc)
    history_entry = {
        "status":     body.status,
        "changed_by": current_user.get("email"),
        "role":       "ADMIN",
        "note":       body.admin_notes or f"Status changed to {body.status}",
        "timestamp":  now.isoformat(),
    }

    update_set: dict = {
        "status":     body.status,
        "updated_at": now,
    }
    if body.admin_notes is not None:
        update_set["admin_notes"] = body.admin_notes
    if body.estimated_delivery_date:
        update_set["estimated_delivery_date"] = body.estimated_delivery_date
    if body.fulfilled_items:
        update_set["fulfilled_items"] = body.fulfilled_items

    result = await db.supply_requests.update_one(
        {"_id": oid},
        {"$set": update_set, "$push": {"status_history": history_entry}},
    )

    if result.modified_count == 0:
        raise HTTPException(400, "No changes applied — request may already be in this state")

    await _log(request, "INFO", "admin_update.success",
               {
                   "request_id": request_id,
                   "old_status": old_status,
                   "new_status": body.status,
                   "changed_by": current_user.get("email"),
                   "timestamp": now.isoformat(),
               }, current_user)

    # TC-115/TC-139 — notify farmer of supply request status change
    farmer_id = doc.get("farmer_id")
    if farmer_id:
        await db.notifications.insert_one({
            "user_id": farmer_id,
            "user_type": "farmer",
            "type": "supply_status_update",
            "title": "Supply request updated",
            "body": f"Your supply request status has been updated to '{body.status}'."
                    + (f" Note: {body.admin_notes}" if body.admin_notes else ""),
            "read": False,
            "created_at": datetime.now(timezone.utc),
            "expires_at": None,
        })

    return {"message": f"Request updated to '{body.status}'", "request_id": request_id}


@router.delete("/{request_id}", summary="Hard-delete supply request (Admin only)")
async def delete_supply_request(
    request: Request,
    request_id: str,
    current_user: dict = Depends(require_role(["ADMIN"])),
    db=Depends(get_db),
):
    from bson import ObjectId
    await _log(request, "INFO", "admin_delete.attempt", {"request_id": request_id}, current_user)

    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(400, "Invalid request ID format")

    doc = await db.supply_requests.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Supply request not found")

    await db.supply_requests.delete_one({"_id": oid})

    await _log(request, "INFO", "admin_delete.success",
               {"request_id": request_id, "ref": doc.get("request_ref", "")}, current_user)
    return {"message": "Supply request permanently deleted", "request_id": request_id}
