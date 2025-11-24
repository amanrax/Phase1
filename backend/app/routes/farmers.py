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
)
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
)
from app.services.farmer_service import FarmerService
from app.utils.security import verify_qr_signature, generate_qr_data
from app.config import settings
from pathlib import Path
import time
from datetime import datetime
from fastapi import UploadFile, File, HTTPException, Depends


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
    # Initialize service
    farmer_service = FarmerService(db)
    
    # Create farmer
    created_by = current_user.get("email")
    farmer = await farmer_service.create_farmer(farmer_data, created_by=created_by)
    
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
    status: Optional[str] = Query(None, regex="^(registered|under_review|verified|rejected|pending_documents)$", description="Filter by registration status"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    search: Optional[str] = Query(None, description="Search in name, phone, farmer_id"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))
):
    """
    List all farmers with pagination and filtering.
    
    **Permissions:** ADMIN, OPERATOR, or FARMER
    
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
    farmer_service = FarmerService(db)
    
    # Filter by operator if current user is an operator
    created_by_filter = None
    if current_user.get("roles") and "OPERATOR" in current_user.get("roles", []):
        created_by_filter = current_user.get("email")
    
    farmers = await farmer_service.list_farmers(
        skip=skip,
        limit=limit,
        status=status,
        district=district,
        search=search,
        created_by=created_by_filter
    )
    
    return farmers


@router.get(
    "/count",
    summary="Count farmers",
    description="Get total count of farmers with optional filters"
)
async def count_farmers(
    status: Optional[str] = Query(None, regex="^(registered|under_review|verified|rejected|pending_documents)$"),
    district: Optional[str] = Query(None),
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
    
    # Filter by operator if current user is an operator
    created_by_filter = None
    if current_user.get("roles") and "OPERATOR" in current_user.get("roles", []):
        created_by_filter = current_user.get("email")
    
    total = await farmer_service.count_farmers(status=status, district=district, created_by=created_by_filter)
    
    return {
        "total": total,
        "filters": {
            "status": status,
            "district": district
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
    farmer_service = FarmerService(db)
    
    farmer = await farmer_service.get_farmer_by_id(farmer_id)
    
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    # Access control: FARMER role can only view their own data
    if current_user.get("roles") and "FARMER" in current_user.get("roles", []):
        user_email = current_user.get("email")
        # A farmer can only view their own profile.
        # The profile is considered "theirs" if the email in their user token
        # matches the email in the farmer's personal information.
        if user_email and farmer.personal_info and farmer.personal_info.email != user_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own farmer profile"
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
    farmer_service = FarmerService(db)

    # Authorization: Farmers can only update their own profile
    if "FARMER" in current_user.get("roles", []):
        farmer_to_update = await farmer_service.get_farmer_by_id(farmer_id)
        if not farmer_to_update or farmer_to_update.personal_info.email != current_user.get("email"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this farmer profile."
            )

    updated_farmer = await farmer_service.update_farmer(farmer_id, update_data)
    
    if not updated_farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    return updated_farmer


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
    current_user: dict = Depends(require_operator)
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
            }
        }
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
    new_status: str = Query(..., regex="^(registered|under_review|verified|rejected|pending_documents)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_operator)
):
    """
    Update farmer registration status (legacy endpoint).
    
    **Deprecated:** Use `/farmers/{farmer_id}/review` instead for better tracking.
    
    **Permissions:** ADMIN or OPERATOR
    
    **Example:**
    ```
    PATCH /api/farmers/ZM1A2B3C4D/status?new_status=verified
    ```
    """
    farmer_service = FarmerService(db)
    
    updated_farmer = await farmer_service.update_registration_status(
        farmer_id, 
        new_status
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
    farmer_service = FarmerService(db)
    
    deleted = await farmer_service.delete_farmer(farmer_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
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
    current_user: dict = Depends(require_operator)
):
    """
    Upload farmer photo.
    
    **Permissions:** ADMIN or OPERATOR
    
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
    
    # Verify farmer exists
    farmer_service = FarmerService(db)
    farmer = await farmer_service.get_farmer_by_id(farmer_id)
    
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    # Create upload directory
    upload_dir = Path(settings.UPLOAD_DIR) / farmer_id / "photos"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = upload_dir / f"photo.{file_ext}"
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Update farmer document
    relative_path = f"/uploads/{farmer_id}/photos/photo.{file_ext}"
    
    await farmer_service.update_documents(
        farmer_id,
        {"photo": relative_path}
    )
    
    return {
        "message": "Photo uploaded successfully",
        "farmer_id": farmer_id,
        "photo_path": relative_path
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
    
    # Verify QR signature
    if not verify_qr_signature(payload):
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer {farmer_id} not found"
        )
    
    # Return verification result
    now = datetime.now(timezone.utc)
    
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
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Upload an identification document for a farmer."""
    from pathlib import Path
    from datetime import datetime
    import time
    
    # Validate doc_type
    valid_doc_types = ["nrc", "land_title", "license", "certificate"]
    if doc_type not in valid_doc_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid doc_type. Must be one of: {', '.join(valid_doc_types)}"
        )
    
    try:
        # Save file
        upload_dir = Path("uploads/farmers/documents")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = int(time.time())
        file_ext = Path(file.filename or "").suffix or ".jpg"
        file_path = upload_dir / f"{farmer_id}_{doc_type}_{timestamp}{file_ext}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Update farmer record
        doc_data = {
            "doc_type": doc_type,
            "file_path": str(file_path),
            "uploaded_at": datetime.utcnow().isoformat()
        }
        
        # Initialize identification_documents if needed
        await db.farmers.update_one(
            {"farmer_id": farmer_id},
            {"$setOnInsert": {"identification_documents": []}},
            upsert=False
        )
        
        # Add document
        result = await db.farmers.update_one(
            {"farmer_id": farmer_id},
            {"$push": {"identification_documents": doc_data}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Farmer not found")
        
        return {
            "message": f"{doc_type} uploaded successfully",
            "file_path": str(file_path),
            "doc_type": doc_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
