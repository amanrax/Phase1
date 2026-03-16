# backend/app/routes/farmers.py
"""
Farmer management endpoints.

Endpoints:
- POST /api/farmers - Create new farmer
- GET /api/farmers - List farmers with pagination/filters
- GET /api/farmers/{farmer_id} - Get farmer details
- PUT /api/farmers/{farmer_id} - Update farmer
- PATCH /api/farmers/{farmer_id}/status - Update registration status
- DELETE /api/farmers/{farmer_id} - Delete farmer
- POST /api/farmers/{farmer_id}/upload-photo - Upload farmer photo
- GET /api/farmers/{farmer_id}/documents - Get farmer documents
- POST /api/farmers/verify-qr - Verify QR code
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    BackgroundTasks,
    Query,
    Response,
)
from fastapi.responses import JSONResponse
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.dependencies.roles import (
    require_role,
    require_operator,
    require_admin,
    can_access_farmer_data,
    get_current_user
)
from app.models.farmer import (
    FarmerCreate,
    FarmerUpdate,
    FarmerOut,
    FarmerListItem,
    FarmerReassignmentRequest,
    FarmerReassignmentResponse,
)
from app.services.farmer_service import FarmerService
from app.utils.security import verify_qr_signature, generate_qr_data
from app.config import settings
from pathlib import Path
import time
from datetime import datetime, timezone
from fastapi import UploadFile, File, HTTPException, Depends
from app.services.logging_service import log_event, sanitize_body
from app.services.gridfs_service import gridfs_service


router = APIRouter(prefix="/farmers", tags=["Farmers"])


# =======================================================
# CREATE Farmer (handles both /farmers and /farmers/)
# =======================================================
@router.post(
    "/",
    response_model=FarmerOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create new farmer",
    description="Register a new farmer (ADMIN or OPERATOR only)"
)
@router.post(
    "",
    response_model=FarmerOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create new farmer",
    description="Register a new farmer (ADMIN or OPERATOR only)",
    include_in_schema=False  # Hide duplicate from docs
)
async def create_farmer(
    farmer_data: FarmerCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_operator)
):
    """
    Create a new farmer record.
    
    **Permissions:** ADMIN or OPERATOR
    
    **Validations:**
    - NRC format (######/##/#)
    - Age >= 18 years
    - Phone format (+260XXXXXXXXX)
    - GPS coordinates within Zambia bounds
    - No duplicate NRC
    
    **Process:**
    1. Validate farmer data
    2. Generate unique farmer ID (ZM + 8 hex chars)
    3. Create farmer record with "registered" status (initial state)
    4. Return created farmer
    
    **Example Request:**
    ```
    {
        "personal_info": {
            "first_name": "John",
            "last_name": "Zimba",
            "phone_primary": "+260977000000",
            "nrc": "123456/12/1",
            "date_of_birth": "1990-01-15",
            "gender": "Male"
        },
        "address": {
            "province_code": "LP",
            "province_name": "Luapula Province",
            "district_code": "LP05",
            "district_name": "Kawambwa District",
            "chiefdom_code": "LP05-002",
            "chiefdom_name": "Chief Chama",
            "village": "Chisenga"
        }
    }
    ```
    """
    # Log attempt
    await log_event(
        level="INFO",
        module="farmers",
        action="create_attempt",
        details=sanitize_body({"created_by": current_user.get("email")}),
        endpoint="/api/farmers",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    
    # For operators, validate that farmer is in their assigned district
    if current_user.get("roles") and "OPERATOR" in current_user.get("roles", []) and "ADMIN" not in current_user.get("roles", []):
        user_email = current_user.get("email")
        operator_doc = await db.operators.find_one({"email": user_email})
        if operator_doc:
            assigned_districts = operator_doc.get("assigned_districts", [])
            farmer_district = farmer_data.address.district_name if farmer_data.address else None
            
            # If operator has assigned districts, farmer must be in one of them
            if assigned_districts and farmer_district not in assigned_districts:
                await log_event(
                    level="WARNING",
                    module="farmers",
                    action="create_rejected",
                    details={"reason": "farmer_outside_operator_district", "farmer_district": farmer_district, "operator_districts": assigned_districts},
                    endpoint="/api/farmers",
                    user_id=current_user.get("email"),
                    role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Farmer must be registered in your assigned district(s): {', '.join(assigned_districts)}"
                )
    
    # Initialize service
    farmer_service = FarmerService(db)
    
    # Determine who created the farmer. For operators we store the operator_id
    # so operator-scoped queries (created_by == operator_id) work correctly.
    created_by = current_user.get("email")
    # If the caller is an operator, prefer operator_id from the operators collection
    if current_user.get("roles") and "OPERATOR" in current_user.get("roles", []):
        op_doc = await db.operators.find_one({"email": current_user.get("email")})
        if op_doc and op_doc.get("operator_id"):
            created_by = op_doc.get("operator_id")

    farmer = await farmer_service.create_farmer(farmer_data, created_by=created_by)
    
    await log_event(
        level="INFO",
        module="farmers",
        action="create_success",
        details={"farmer_id": farmer.farmer_id},
        endpoint="/api/farmers",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )

    # TC-109 — notify farmer that registration was received
    _now = datetime.now(timezone.utc)
    await db.notifications.insert_one({
        "user_id": farmer.farmer_id,
        "user_type": "farmer",
        "type": "registration_received",
        "title": "Registration submitted",
        "body": "Your registration has been received and is under review.",
        "read": False,
        "created_at": _now,
        "expires_at": None,
    })

    # TC-114 — notify the operator who registered the farmer
    if created_by and created_by != current_user.get("email"):
        # created_by is an operator_id; find the operator's user record
        _op = await db.operators.find_one({"operator_id": created_by}, {"email": 1})
        if _op and _op.get("email"):
            await db.notifications.insert_one({
                "user_id": _op["email"],
                "user_type": "operator",
                "type": "new_farmer_registered",
                "title": "New farmer registered",
                "body": f"Farmer {farmer.farmer_id} has been successfully registered under your account.",
                "read": False,
                "created_at": _now,
                "expires_at": None,
            })

    return farmer


# =======================================================
# LIST Farmers (handles both /farmers and /farmers/)
# =======================================================
@router.get(
    "/",
    response_model=List[FarmerListItem],
    summary="List farmers",
    description="Get paginated list of farmers with optional filtering"
)
@router.get(
    "",
    response_model=List[FarmerListItem],
    summary="List farmers",
    description="Get paginated list of farmers with optional filtering",
    include_in_schema=False  # Hide duplicate from docs
)
async def list_farmers(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    status: Optional[str] = Query(None, regex="^(registered|under_review|verified|rejected|pending_documents|pending|documents_uploaded|incomplete)$", description="Filter by registration status"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    search: Optional[str] = Query(None, description="Search in name, phone, farmer_id"),
    farmer_id_exact: Optional[str] = Query(None, description="Exact farmer_id match (overrides search)"),
    nrc: Optional[str] = Query(None, description="Exact NRC number match (overrides search)"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"]))
):
    """
    List all farmers with pagination and filtering.
    
    **Permissions:** ADMIN, OPERATOR only (FARMER role is blocked — use own profile endpoint)
    
    **Query Parameters:**
    - `skip`: Pagination offset (default: 0)
    - `limit`: Max records per page (default: 20, max: 100)
    - `status`: Filter by status (registered/under_review/verified/rejected/pending_documents)
    - `district`: Filter by district name
    - `search`: Search in farmer_id, name, phone
    
    **Example:**
    ```
    GET /api/farmers?skip=0&limit=20&status=pending&district=Kawambwa
    ```
    
    **Response:**
    ```
    [
        {
            "_id": "507f1f77bcf86cd799439011",
            "farmer_id": "ZM1A2B3C4D",
            "registration_status": "pending",
            "created_at": "2025-11-17T12:00:00Z",
            "first_name": "John",
            "last_name": "Zimba",
            "phone_primary": "+260977000000",
            "village": "Chisenga",
            "district_name": "Kawambwa District"
        }
    ]
    ```
    """
    await log_event(
        level="DEBUG",
        module="farmers",
        action="list_query",
        details={"skip": skip, "limit": limit, "status": status, "district": district, "search": search},
        endpoint="/api/farmers",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    farmer_service = FarmerService(db)
    
    # Apply filtering for operators
    allowed_districts = None
    created_by_filter = None
    if current_user.get("roles") and "OPERATOR" in current_user.get("roles", []) and "ADMIN" not in current_user.get("roles", []):
        # Operator: show farmers in their assigned districts OR created by them
        user_email = current_user.get("email")
        operator_doc = await db.operators.find_one({"email": user_email})
        if operator_doc:
            allowed_districts = operator_doc.get("assigned_districts", [])
            created_by_filter = operator_doc.get("operator_id")  # Also show farmers created by this operator
            # If no districts assigned, still show farmers they created (fallback)
    # Admin sees all farmers (both None)
    
    farmers = await farmer_service.list_farmers(
        skip=skip,
        limit=limit,
        status=status,
        district=district,
        search=search,
        created_by=created_by_filter,
        farmer_id_exact=farmer_id_exact,
        nrc=nrc,
        allowed_districts=allowed_districts
    )
    
    await log_event(
        level="INFO",
        module="farmers",
        action="list_result",
        details={"count": len(farmers)},
        endpoint="/api/farmers",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    return farmers


@router.get(
    "/count",
    summary="Count farmers",
    description="Get total count of farmers with optional filters"
)
async def count_farmers(
    status: Optional[str] = Query(None, regex="^(registered|under_review|verified|rejected|pending_documents|pending|documents_uploaded|incomplete)$"),
    district: Optional[str] = Query(None),
    farmer_id_exact: Optional[str] = Query(None, description="Exact farmer_id match"),
    nrc: Optional[str] = Query(None, description="Exact NRC match"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))
):
    """
    Get total farmer count with optional filters.
    
    **Example Response:**
    ```
    {
        "total": 150,
        "filters": {
            "status": "pending",
            "district": "Kawambwa"
        }
    }
    ```
    """
    farmer_service = FarmerService(db)
    
    # Apply same operator filtering logic as list endpoint
    allowed_districts = None
    created_by_filter = None
    if current_user.get("roles") and "OPERATOR" in current_user.get("roles", []) and "ADMIN" not in current_user.get("roles", []):
        user_email = current_user.get("email")
        operator_doc = await db.operators.find_one({"email": user_email})
        if operator_doc:
            allowed_districts = operator_doc.get("assigned_districts", [])
            created_by_filter = operator_doc.get("operator_id")
            # If no districts assigned, operator sees nothing (secure default)
    # Admin sees all farmers (both None)
    
    total = await farmer_service.count_farmers(
        status=status,
        district=district,
        created_by=created_by_filter,
        farmer_id_exact=farmer_id_exact,
        nrc=nrc,
        allowed_districts=allowed_districts
    )
    
    return {
        "total": total,
        "filters": {
            "status": status,
            "district": district,
            "farmer_id_exact": farmer_id_exact,
            "nrc": nrc
        }
    }


# =======================================================
# GET Single Farmer
# =======================================================
@router.get(
    "/{farmer_id}",
    response_model=FarmerOut,
    summary="Get farmer details",
    description="Get detailed information about a specific farmer"
)
async def get_farmer(
    farmer_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))
):
    """
    Get detailed farmer information.
    
    **Permissions:**
    - ADMIN/OPERATOR/FARMER: Can view all farmers
    - FARMER: Can only view their own data
    
    **Example Response:**
    ```
    {
        "_id": "507f1f77bcf86cd799439011",
        "farmer_id": "ZM1A2B3C4D",
        "registration_status": "approved",
        "created_at": "2025-11-17T12:00:00Z",
        "personal_info": {
            "first_name": "John",
            "last_name": "Zimba",
            "phone_primary": "+260977000000",
            "nrc": "123456/12/1",
            "date_of_birth": "1990-01-15",
            "gender": "Male"
        },
        "address": {...},
        "farm_info": {...},
        "household_info": {...},
        "documents": {...}
    }
    ```
    """
    await log_event(
        level="DEBUG",
        module="farmers",
        action="get_attempt",
        details={"farmer_id": farmer_id},
        endpoint=f"/api/farmers/{farmer_id}",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    farmer_service = FarmerService(db)
    
    farmer = await farmer_service.get_farmer_by_id(farmer_id)
    
    if not farmer:
        await log_event(
            level="WARNING",
            module="farmers",
            action="get_not_found",
            details={"farmer_id": farmer_id},
            endpoint=f"/api/farmers/{farmer_id}",
            user_id=current_user.get("email"),
            role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )

    # Soft-deleted farmers are only visible to ADMIN (for audit trail)
    is_admin = "ADMIN" in current_user.get("roles", [])
    if not farmer.is_active and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )

    # Access control: FARMER role can only view their own data
    if current_user.get("roles") and "FARMER" in current_user.get("roles", []):
        # A farmer can only view their own profile.
        # Check if the farmer_id in the token matches the requested farmer_id
        user_farmer_id = current_user.get("farmer_id")
        if user_farmer_id and user_farmer_id != farmer_id:
            await log_event(
                level="WARNING",
                module="farmers",
                action="get_forbidden",
                details={"farmer_id": farmer_id},
                endpoint=f"/api/farmers/{farmer_id}",
                user_id=current_user.get("email"),
                role="FARMER",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own farmer profile"
            )

    # Access control: OPERATOR can only view farmers assigned to them
    if (current_user.get("roles") and
        "OPERATOR" in current_user.get("roles", []) and
        "ADMIN" not in current_user.get("roles", [])):
        user_email = current_user.get("email")
        op_doc = await db.operators.find_one({"email": user_email})
        
        is_authorized = False
        if op_doc:
            operator_id = op_doc.get("operator_id")
            farmer_owner_operator_id = getattr(farmer, "operator_id", None) or getattr(farmer, "created_by", None)

            # If a farmer is explicitly assigned to an operator, enforce owner-only access.
            if farmer_owner_operator_id:
                is_authorized = bool(operator_id and farmer_owner_operator_id == operator_id)
            else:
                # Legacy fallback for unassigned records: district-scoped access.
                assigned_districts = op_doc.get("assigned_districts", [])
                farmer_district = farmer.address.district_name if farmer.address else None
                is_authorized = bool(farmer_district and assigned_districts and farmer_district in assigned_districts)

        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: this farmer is assigned to another operator."
            )
    
    await log_event(
        level="INFO",
        module="farmers",
        action="get_success",
        details={"farmer_id": farmer_id},
        endpoint=f"/api/farmers/{farmer_id}",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    return farmer


# =======================================================
# UPDATE Farmer
# =======================================================
@router.put(
    "/{farmer_id}",
    response_model=FarmerOut,
    summary="Update farmer",
    description="Update farmer information. FARMER can only update their own profile."
)
async def update_farmer(
    farmer_id: str,
    update_data: FarmerUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))
):
    """
    Update farmer information.
    
    **Permissions:** ADMIN or OPERATOR or FARMER (own profile)
    
    **Notes:**
    - Partial updates allowed (only send fields to update)
    - Cannot change farmer_id
    - Updates timestamp automatically
    
    **Example Request:**
    ```
    {
        "personal_info": {
            "phone_secondary": "+260966000000"
        },
        "registration_status": "approved"
    }
    ```
    """
    await log_event(
        level="INFO",
        module="farmers",
        action="update_attempt",
        details={"farmer_id": farmer_id},
        endpoint=f"/api/farmers/{farmer_id}",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )

    farmer_service = FarmerService(db)
    
    # If NRC is being updated, check for duplicates before proceeding
    if update_data.personal_info and update_data.personal_info.nrc:
        new_nrc = update_data.personal_info.nrc
        existing_farmer_with_nrc = await db.farmers.find_one(
            {"personal_info.nrc": new_nrc, "farmer_id": {"$ne": farmer_id}}
        )
        if existing_farmer_with_nrc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another farmer with NRC {new_nrc} already exists."
            )

    # Authorization: Operators can only update farmers assigned to them
    if ("OPERATOR" in current_user.get("roles", []) and
            "ADMIN" not in current_user.get("roles", [])):
        user_email = current_user.get("email")
        op_doc = await db.operators.find_one({"email": user_email})
        
        # We need the farmer's district to check against operator's assigned districts
        farmer_to_update = await farmer_service.get_farmer_by_id(farmer_id)
        if not farmer_to_update:
            raise HTTPException(status_code=404, detail=f"Farmer {farmer_id} not found")

        assigned_districts = op_doc.get("assigned_districts", []) if op_doc else []
        farmer_district = farmer_to_update.address.district_name if farmer_to_update.address else None
        operator_id = (op_doc or {}).get("operator_id")

        farmer_owner_operator_id = getattr(farmer_to_update, "operator_id", None) or getattr(farmer_to_update, "created_by", None)
        if farmer_owner_operator_id:
            is_authorized = bool(operator_id and farmer_owner_operator_id == operator_id)
        else:
            # Legacy fallback for unassigned records: district-scoped access.
            is_authorized = bool(farmer_district and assigned_districts and farmer_district in assigned_districts)

        if not is_authorized:
            raise HTTPException(status_code=403, detail="Access denied: this farmer is assigned to another operator.")

    # Authorization: Farmers can only update their own profile
    if "FARMER" in current_user.get("roles", []):
        user_farmer_id = current_user.get("farmer_id")
        if not user_farmer_id or user_farmer_id != farmer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this farmer profile."
            )
        # Farmers cannot change their own NRC (identity-protecting field)
        if update_data.personal_info and update_data.personal_info.nrc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Farmers cannot change their NRC. Submit a change request instead."
            )

    updated_farmer = await farmer_service.update_farmer(farmer_id, update_data)
    
    if not updated_farmer:
        await log_event(
            level="WARNING",
            module="farmers",
            action="update_not_found",
            details={"farmer_id": farmer_id},
            endpoint=f"/api/farmers/{farmer_id}",
            user_id=current_user.get("email"),
            role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    await log_event(
        level="INFO",
        module="farmers",
        action="update_success",
        details={"farmer_id": farmer_id},
        endpoint=f"/api/farmers/{farmer_id}",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    return updated_farmer


@router.post(
    "/{farmer_id}/reassign-operator",
    response_model=FarmerReassignmentResponse,
    summary="Reassign farmer to operator",
    description="ADMIN only. Move a farmer to a different operator and notify the new assignee."
)
async def reassign_farmer_operator(
    farmer_id: str,
    payload: FarmerReassignmentRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    await log_event(
        level="INFO",
        module="farmers",
        action="reassign_attempt",
        details={"farmer_id": farmer_id, "target_operator_id": payload.operator_id},
        endpoint=f"/api/farmers/{farmer_id}/reassign-operator",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )

    farmer = await db.farmers.find_one(
        {"farmer_id": farmer_id},
        {"farmer_id": 1, "created_by": 1, "personal_info": 1, "operator_id": 1},
    )
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    operator = await db.operators.find_one(
        {"operator_id": payload.operator_id},
        {"operator_id": 1, "email": 1, "full_name": 1},
    )
    if not operator:
        raise HTTPException(status_code=404, detail="Target operator not found")

    previous_operator_id = farmer.get("created_by") or farmer.get("operator_id")
    if previous_operator_id == payload.operator_id:
        return FarmerReassignmentResponse(
            message="Farmer is already assigned to this operator",
            farmer_id=farmer_id,
            previous_operator_id=previous_operator_id,
            operator_id=payload.operator_id,
        )

    update_fields = {
        "created_by": payload.operator_id,
        "operator_id": payload.operator_id,
        "updated_at": datetime.utcnow(),
    }
    if payload.note:
        update_fields["review_notes"] = payload.note

    result = await db.farmers.update_one(
        {"farmer_id": farmer_id},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Farmer not found")

    if operator.get("email"):
        personal_info = farmer.get("personal_info") or {}
        farmer_name = f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip() or farmer_id
        await db.notifications.insert_one({
            "user_id": operator["email"],
            "user_type": "operator",
            "type": "farmer_assigned",
            "title": "Farmer assigned to you",
            "body": f"Farmer {farmer_name} ({farmer_id}) has been assigned to your account.",
            "read": False,
            "created_at": datetime.now(timezone.utc),
            "expires_at": None,
            "metadata": {
                "farmer_id": farmer_id,
                "operator_id": payload.operator_id,
                "previous_operator_id": previous_operator_id,
            },
        })

    await log_event(
        level="INFO",
        module="farmers",
        action="reassign_success",
        details={
            "farmer_id": farmer_id,
            "previous_operator_id": previous_operator_id,
            "operator_id": payload.operator_id,
        },
        endpoint=f"/api/farmers/{farmer_id}/reassign-operator",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )

    return FarmerReassignmentResponse(
        message="Farmer reassigned successfully",
        farmer_id=farmer_id,
        previous_operator_id=previous_operator_id,
        operator_id=payload.operator_id,
    )


# =======================================================
# REVIEW Farmer (Update Registration Status)
# =======================================================
@router.patch(
    "/{farmer_id}/review",
    response_model=FarmerOut,
    summary="Review farmer registration",
    description="Update registration status with review notes (ADMIN or OPERATOR)"
)
async def review_farmer(
    farmer_id: str,
    new_status: str = Query(..., regex="^(registered|under_review|verified|rejected|pending_documents)$"),
    review_notes: Optional[str] = Query(None, description="Optional review notes"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Review and update farmer registration status.
    
    **Permissions:** ADMIN or OPERATOR
    
    **Valid Statuses:**
    - `registered` - Initial state after registration
    - `under_review` - Being reviewed by admin/operator
    - `verified` - Farmer verified and approved
    - `rejected` - Farmer rejected
    - `pending_documents` - Waiting for additional documents
    
    **Example:**
    ```
    PATCH /api/farmers/ZM1A2B3C4D/review?new_status=verified&review_notes=All documents verified
    ```
    """
    from datetime import datetime, timezone
    
    farmer_service = FarmerService(db)
    
    # Get existing farmer
    farmer = await farmer_service.get_farmer_by_id(farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    old_status = farmer.registration_status

    # Update farmer with new status and review info
    now = datetime.now(timezone.utc)
    update_data = FarmerUpdate(
        registration_status=new_status,
        review_notes=review_notes
    )
    
    # Also update reviewed_by and reviewed_at metadata
    await db.farmers.update_one(
        {"farmer_id": farmer_id},
        {
            "$set": {
                "registration_status": new_status,
                "review_notes": review_notes,
                "reviewed_by": current_user.get("email"),
                "reviewed_at": now,
                "updated_at": now
            },
            "$push": {
                "status_history": {
                    "status": new_status,
                    "old_status": old_status,
                    "new_status": new_status,
                    "changed_by": current_user.get("email"),
                    "role": "ADMIN",
                    "timestamp": now.isoformat(),
                    "notes": review_notes,
                }
            },
        }
    )

    await log_event(
        level="INFO",
        module="farmers",
        action="review_status_changed",
        details={
            "farmer_id": farmer_id,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by": current_user.get("email"),
            "timestamp": now.isoformat(),
        },
        endpoint=f"/api/farmers/{farmer_id}/review",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    
    # Fetch and return updated farmer
    updated_farmer = await farmer_service.get_farmer_by_id(farmer_id)
    return updated_farmer


# =======================================================
# UPDATE Registration Status (Legacy endpoint - kept for compatibility)
# =======================================================
@router.patch(
    "/{farmer_id}/status",
    response_model=FarmerOut,
    summary="Update registration status (Legacy)",
    description="Approve or reject farmer registration (ADMIN or OPERATOR)",
    deprecated=True
)
async def update_farmer_status(
    farmer_id: str,
    new_status: str = Query(..., regex="^(pending|approved|rejected)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_operator)
):
    """
    Update farmer registration status (legacy endpoint).
    
    **Deprecated:** Use `/farmers/{farmer_id}/review` instead for better tracking.
    
    **Permissions:** ADMIN or OPERATOR
    
    **Status values:** pending, approved, rejected
    
    **Example:**
    ```
    PATCH /api/farmers/ZM1A2B3C4D/status?new_status=approved
    ```
    """
    farmer_service = FarmerService(db)
    
    updated_farmer = await farmer_service.update_registration_status(
        farmer_id, 
        new_status,
        changed_by=current_user.get("email"),
        changed_role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )

    await log_event(
        level="INFO",
        module="farmers",
        action="legacy_status_changed",
        details={
            "farmer_id": farmer_id,
            "new_status": new_status,
            "changed_by": current_user.get("email"),
        },
        endpoint=f"/api/farmers/{farmer_id}/status",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    
    return updated_farmer


# =======================================================
# DELETE Farmer
# =======================================================
@router.delete(
    "/{farmer_id}",
    summary="Delete farmer",
    description="Delete a farmer record (ADMIN only)"
)
async def delete_farmer(
    farmer_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Delete a farmer record.
    
    **Permissions:** ADMIN only
    
    **Warning:** This is a hard delete. Consider soft delete in production.
    
    **Example Response:**
    ```
    {
        "message": "Farmer ZM1A2B3C4D deleted successfully",
        "farmer_id": "ZM1A2B3C4D"
    }
    ```
    """
    await log_event(
        level="INFO",
        module="farmers",
        action="delete_attempt",
        details={"farmer_id": farmer_id},
        endpoint=f"/api/farmers/{farmer_id}",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    farmer_service = FarmerService(db)
    
    deleted = await farmer_service.delete_farmer(farmer_id)
    
    if not deleted:
        await log_event(
            level="WARNING",
            module="farmers",
            action="delete_not_found",
            details={"farmer_id": farmer_id},
            endpoint=f"/api/farmers/{farmer_id}",
            user_id=current_user.get("email"),
            role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    await log_event(
        level="INFO",
        module="farmers",
        action="delete_success",
        details={"farmer_id": farmer_id},
        endpoint=f"/api/farmers/{farmer_id}",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    return {
        "message": f"Farmer {farmer_id} deleted successfully",
        "farmer_id": farmer_id
    }


# =======================================================
# UPLOAD Photo
# =======================================================
@router.post(
    "/{farmer_id}/upload-photo",
    summary="Upload farmer photo",
    description="Upload photo for farmer profile"
)
async def upload_farmer_photo(
    farmer_id: str,
    file: UploadFile = File(..., description="Photo file (JPG/PNG, max 10MB)"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))
):
    """
    Upload farmer photo.
    
    **Permissions:** ADMIN, OPERATOR, or FARMER (own profile)
    
    **File Requirements:**
    - Formats: JPG, PNG
    - Max size: 10MB (configurable in settings)
    
    **Process:**
    1. Validate file type and size
    2. Save to /uploads/{farmer_id}/photos/
    3. Update farmer document with photo path
    4. Return photo URL
    
    **Example Response:**
    ```
    {
        "message": "Photo uploaded successfully",
        "farmer_id": "ZM1A2B3C4D",
        "photo_path": "/uploads/ZM1A2B3C4D/photos/photo.png"
    }
    ```
    """
    await log_event(
        level="INFO",
        module="farmers",
        action="photo_upload_attempt",
        details={"farmer_id": farmer_id, "filename": file.filename},
        endpoint=f"/api/farmers/{farmer_id}/upload-photo",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    # Validate file type
    allowed_extensions = settings.ALLOWED_IMAGE_EXTENSIONS
    file_ext = file.filename.split('.')[-1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {allowed_extensions}"
        )
    
    # Check file size
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # Convert to bytes
    file_content = await file.read()
    
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    # Validate actual file content via magic bytes (prevent MIME spoofing)
    MAGIC_BYTES = {
        b'\xff\xd8\xff': "jpeg",
        b'\x89PNG\r\n\x1a\n': "png",
    }
    content_type = None
    for magic, ctype in MAGIC_BYTES.items():
        if file_content[:len(magic)] == magic:
            content_type = ctype
            break
    if content_type is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File content does not match an allowed image type (JPEG or PNG)"
        )
    
    # Verify farmer exists
    farmer_service = FarmerService(db)
    farmer = await farmer_service.get_farmer_by_id(farmer_id)
    
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    # Authorization: Farmers can only upload their own photo
    if "FARMER" in current_user.get("roles", []):
        user_farmer_id = current_user.get("farmer_id")
        if not user_farmer_id or user_farmer_id != farmer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload your own photo"
            )
    
    # Upload to GridFS
    file_id = await gridfs_service.upload_file(
        file_data=file_content,
        filename=f"photo_{farmer_id}.{file_ext}",
        farmer_id=farmer_id,
        file_type="photo",
        metadata={"doc_type": "photo"}
    )
    
    # Update farmer document with GridFS file ID
    await farmer_service.update_documents(
        farmer_id,
        {
            "documents.photo": f"/api/files/{file_id}",
            "photo_file_id": file_id
        }
    )
    
    await log_event(
        level="INFO",
        module="farmers",
        action="photo_upload_success",
        details={"farmer_id": farmer_id, "file_id": file_id},
        endpoint=f"/api/farmers/{farmer_id}/upload-photo",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])) if current_user.get("roles") else None,
    )
    return {
        "message": "Photo uploaded successfully",
        "farmer_id": farmer_id,
        "photo_path": f"/api/files/{file_id}",
        "file_id": file_id
    }


# =======================================================
# VERIFY QR Code
# =======================================================
@router.post(
    "/verify-qr",
    summary="Verify QR code",
    description="Verify farmer QR code signature and return farmer info"
)
async def verify_qr_code(
    payload: dict,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Verify QR code authenticity and return farmer information.
    
    **Public Endpoint** - No authentication required for verification
    
    **Process:**
    1. Verify HMAC signature
    2. Check timestamp freshness (optional)
    3. Fetch farmer data
    4. Return verification result
    
    **Example Request:**
    ```
    {
        "farmer_id": "ZM1A2B3C4D",
        "timestamp": "2025-11-17T12:00:00Z",
        "signature": "xyz..."
    }
    ```
    
    **Example Response:**
    ```
    {
        "verified": true,
        "farmer_id": "ZM1A2B3C4D",
        "name": "John Zimba",
        "registration_status": "approved",
        "district": "Kawambwa District",
        "verified_at": "2025-11-17T12:30:00Z"
    }
    ```
    """
    from datetime import datetime, timezone
    
    await log_event(
        level="DEBUG",
        module="farmers",
        action="qr_verify_attempt",
        details={"payload_keys": list(payload.keys())},
        endpoint="/api/farmers/verify-qr",
    )
    # Verify QR signature
    if not verify_qr_signature(payload):
        await log_event(
            level="WARNING",
            module="farmers",
            action="qr_verify_failed",
            details={"reason": "invalid_signature"},
            endpoint="/api/farmers/verify-qr",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or tampered QR code signature"
        )
    
    # Extract farmer ID
    farmer_id = payload.get("farmer_id")
    if not farmer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing farmer_id in QR payload"
        )
    
    # Fetch farmer
    farmer_service = FarmerService(db)
    farmer = await farmer_service.get_farmer_by_id(farmer_id)
    
    if not farmer:
        await log_event(
            level="WARNING",
            module="farmers",
            action="qr_verify_not_found",
            details={"farmer_id": farmer_id},
            endpoint="/api/farmers/verify-qr",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    # Return verification result
    now = datetime.now(timezone.utc)
    
    await log_event(
        level="INFO",
        module="farmers",
        action="qr_verify_success",
        details={"farmer_id": farmer.farmer_id},
        endpoint="/api/farmers/verify-qr",
    )
    return {
        "verified": True,
        "farmer_id": farmer.farmer_id,
        "name": f"{farmer.personal_info.first_name} {farmer.personal_info.last_name}",
        "registration_status": farmer.registration_status,
        "province": farmer.address.province_name if farmer.address else "",
        "district": farmer.address.district_name if farmer.address else "",
        "village": farmer.address.village if farmer.address else "",
        "verified_at": now.isoformat()
    }


# =======================================================
# STATISTICS
# =======================================================
@router.get(
    "/stats/overview",
    summary="Get farmer statistics",
    description="Get farmer counts and analytics for dashboard"
)
async def get_farmer_statistics(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"]))
):
    """
    Get farmer statistics for dashboard.
    
    **Permissions:** ADMIN or OPERATOR
    
    **Example Response:**
    ```
    {
        "total_farmers": 150,
        "pending": 30,
        "approved": 100,
        "rejected": 20,
        "by_district": [
            {"district": "Kawambwa", "count": 45},
            {"district": "Mansa", "count": 35}
        ]
    }
    ```
    """
    farmer_service = FarmerService(db)
    
    stats = await farmer_service.get_statistics()
    
    return stats


# =======================================================
# UPLOAD Document
# =======================================================
@router.post("/{farmer_id}/documents/{doc_type}")
async def upload_farmer_document(
    farmer_id: str,
    doc_type: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))
):
    """Upload an identification document for a farmer. ADMIN/OPERATOR can upload for any farmer, FARMER can upload their own."""
    from pathlib import Path
    from datetime import datetime

    uploaded_file_id: str | None = None
    
    # Validate file size (max 20MB)
    MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.0f}MB"
        )
    await file.seek(0)  # Reset file pointer for later reading
    
    # Validate doc_type
    valid_doc_types = ["nrc", "land_title", "license", "certificate"]
    if doc_type not in valid_doc_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid doc_type. Must be one of: {', '.join(valid_doc_types)}"
        )

    # Validate file MIME type — only allow images and PDFs
    allowed_mime_types = {
        "image/jpeg", "image/jpg", "image/png", "image/gif",
        "image/webp", "application/pdf"
    }
    content_type = (file.content_type or "").lower()
    if content_type not in allowed_mime_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{content_type}'. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed."
        )
    
    # Check if farmer exists and authorize
    farmer_check = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer_check:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    # Authorization: Farmers can only upload their own documents
    if "FARMER" in current_user.get("roles", []):
        user_farmer_id = current_user.get("farmer_id")
        if not user_farmer_id or user_farmer_id != farmer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload your own documents"
            )
    
    try:
        # Upload to GridFS
        file_ext = Path(file.filename or "").suffix or ".pdf"
        file_id = await gridfs_service.upload_file(
            file_data=file_content,
            filename=f"{farmer_id}_{doc_type}{file_ext}",
            farmer_id=farmer_id,
            file_type="document",
            metadata={"doc_type": doc_type}
        )
        uploaded_file_id = file_id
        
        # Update farmer record
        doc_data = {
            "doc_type": doc_type,
            "file_path": f"/api/files/{file_id}",
            "file_id": file_id,
            "uploaded_at": datetime.utcnow().isoformat(),
            "status": "pending"
        }
        
        # Check if document of this type already exists
        existing_farmer = await db.farmers.find_one(
            {"farmer_id": farmer_id},
            {"identification_documents": 1}
        )
        
        existing_docs = existing_farmer.get("identification_documents", []) if existing_farmer else []
        doc_exists = any(doc.get("doc_type") == doc_type for doc in existing_docs)
        replaced_doc = next((doc for doc in existing_docs if doc.get("doc_type") == doc_type), None)
        old_file_id = replaced_doc.get("file_id") if replaced_doc else None
        
        if doc_exists:
            # Replace existing document of this type
            result = await db.farmers.update_one(
                {"farmer_id": farmer_id, "identification_documents.doc_type": doc_type},
                {
                    "$set": {
                        "identification_documents.$": doc_data,
                        "registration_status": "documents_uploaded",
                        "updated_at": datetime.utcnow(),
                    }
                }
            )
        else:
            # Add new document
            # Initialize identification_documents if needed
            await db.farmers.update_one(
                {"farmer_id": farmer_id},
                {"$setOnInsert": {"identification_documents": []}},
                upsert=False
            )
            
            result = await db.farmers.update_one(
                {"farmer_id": farmer_id},
                {
                    "$push": {"identification_documents": doc_data},
                    "$set": {
                        "registration_status": "documents_uploaded",
                        "updated_at": datetime.utcnow(),
                    },
                }
            )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Farmer not found")

        if doc_exists and old_file_id and old_file_id != file_id:
            deleted = await gridfs_service.delete_file(old_file_id)
            if not deleted:
                logger.warning(
                    "Failed to delete superseded GridFS document",
                    extra={"farmer_id": farmer_id, "doc_type": doc_type, "old_file_id": old_file_id},
                )

        # TC-075 — notify operator that a document was re-uploaded and needs review
        if doc_exists:
            _now_doc = datetime.utcnow()
            _farmer_rec = await db.farmers.find_one(
                {"farmer_id": farmer_id}, {"created_by": 1, "personal_info": 1}
            )
            _operator_id = _farmer_rec.get("created_by") if _farmer_rec else None
            _farmer_name = ""
            if _farmer_rec and _farmer_rec.get("personal_info"):
                _pi = _farmer_rec["personal_info"]
                _farmer_name = f"{_pi.get('first_name', '')} {_pi.get('last_name', '')}".strip()
            # Notify the operator who owns this farmer
            if _operator_id:
                _op_rec = await db.operators.find_one({"operator_id": _operator_id}, {"email": 1})
                if _op_rec and _op_rec.get("email"):
                    await db.notifications.insert_one({
                        "user_id": _op_rec["email"],
                        "user_type": "operator",
                        "type": "document_reuploaded",
                        "title": "Document re-uploaded",
                        "body": f"Farmer {_farmer_name or farmer_id} re-uploaded their {doc_type} document. Please review.",
                        "read": False,
                        "created_at": _now_doc,
                        "expires_at": None,
                        "metadata": {"farmer_id": farmer_id, "doc_type": doc_type},
                    })
            # Also notify any ADMIN users
            async for _admin in db.users.find({"roles": {"$in": ["ADMIN"]}}, {"email": 1}):
                if _admin.get("email") and _admin["email"] != (_op_rec.get("email") if _operator_id and _op_rec else None):
                    await db.notifications.insert_one({
                        "user_id": _admin["email"],
                        "user_type": "admin",
                        "type": "document_reuploaded",
                        "title": "Document re-uploaded",
                        "body": f"Farmer {_farmer_name or farmer_id} re-uploaded their {doc_type} document.",
                        "read": False,
                        "created_at": _now_doc,
                        "expires_at": None,
                        "metadata": {"farmer_id": farmer_id, "doc_type": doc_type},
                    })

        return JSONResponse(
            status_code=200,
            content={
                "message": f"{doc_type} uploaded successfully",
                "file_path": f"/api/files/{file_id}",
                "file_id": file_id,
                "doc_type": doc_type
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
            }
        )
    except HTTPException:
        if uploaded_file_id:
            await gridfs_service.delete_file(uploaded_file_id)
        raise
    except Exception as e:
        if uploaded_file_id:
            await gridfs_service.delete_file(uploaded_file_id)
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
