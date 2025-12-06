# backend/app/services/farmer_service.py
"""
Business logic layer for farmer management.

Responsibilities:
- Farmer CRUD operations
- Data validation
- Farmer ID generation
- Document management
- Search and filtering
"""

import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status

from app.models.farmer import (
    FarmerCreate,
    FarmerUpdate,
    FarmerInDB,
    FarmerOut,
    FarmerListItem
)
from app.utils.crypto_utils import generate_farmer_id, hmac_hash
from app.database import get_farmers_collection


# =======================================================
# Zambia-specific validation constants
# =======================================================
ZAMBIA_LAT_RANGE = (-18.0, -8.0)
ZAMBIA_LON_RANGE = (21.0, 34.0)
NRC_PATTERN = re.compile(r"^\d{6}/\d{2}/\d$")
ZAMBIA_PHONE_PATTERN = re.compile(r"^(\+260|0)[0-9]{9}$")


class FarmerService:
    """
    Service layer for farmer management operations.
    Handles validation, CRUD, and business logic.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize farmer service.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db.farmers
    
    # =======================================================
    # 1️⃣ CREATE Operations
    # =======================================================
    async def create_farmer(
        self, 
        farmer_data: FarmerCreate,
        created_by: Optional[str] = None
    ) -> FarmerOut:
        """
        Create a new farmer record.
        
        Args:
            farmer_data: Farmer creation data (validated Pydantic model)
            created_by: Email of user creating the farmer
        
        Returns:
            FarmerOut: Created farmer document
        
        Raises:
            HTTPException: If validation fails or farmer already exists
        """
        # Validate the farmer data
        self._validate_farmer_data(farmer_data.model_dump())
        
        # Check for duplicate NRC
        if farmer_data.personal_info.nrc:
            await self._check_duplicate_nrc(farmer_data.personal_info.nrc)
        
        # Generate unique farmer ID
        farmer_id = await self._generate_unique_farmer_id()
        
        # Build farmer document
        now = datetime.now(datetime.timezone.utc) if hasattr(datetime, 'timezone') else datetime.utcnow()
        
        farmer_doc = {
            "farmer_id": farmer_id,
            "registration_status": "pending",
            "created_at": now,
            "updated_at": now,
            "personal_info": farmer_data.personal_info.model_dump(),
            "address": farmer_data.address.model_dump(),
            "farm_info": farmer_data.farm_info.model_dump() if farmer_data.farm_info else None,
            "household_info": farmer_data.household_info.model_dump() if farmer_data.household_info else None,
            "documents": None,  # Will be populated during document upload
            "is_active": True,  # Default to active on creation
        }
        
        # Add metadata
        if created_by:
            farmer_doc["created_by"] = created_by
        
        # Add searchable hashes for NRC (for privacy)
        if farmer_data.personal_info.nrc:
            farmer_doc["nrc_hash"] = hmac_hash(
                farmer_data.personal_info.nrc, 
                salt="nrc"
            )
        
        # Insert into database
        result = await self.collection.insert_one(farmer_doc)
        
        # Fetch and return the created farmer
        created_farmer = await self.collection.find_one({"_id": result.inserted_id})
        
        return FarmerOut.from_mongo(created_farmer)
    
    # =======================================================
    # 2️⃣ READ Operations
    # =======================================================
    async def get_farmer_by_id(self, farmer_id: str) -> Optional[FarmerOut]:
        """
        Get farmer by farmer_id.
        
        Args:
            farmer_id: Unique farmer identifier (e.g., ZM12345)
        
        Returns:
            Optional[FarmerOut]: Farmer document or None
        """
        farmer = await self.collection.find_one({"farmer_id": farmer_id})
        
        if not farmer:
            return None
        
        return FarmerOut.from_mongo(farmer)
    
    async def get_farmer_by_object_id(self, object_id: str) -> Optional[FarmerOut]:
        """
        Get farmer by MongoDB _id.
        
        Args:
            object_id: MongoDB ObjectId as string
        
        Returns:
            Optional[FarmerOut]: Farmer document or None
        """
        try:
            farmer = await self.collection.find_one({"_id": ObjectId(object_id)})
            
            if not farmer:
                return None
            
            return FarmerOut.from_mongo(farmer)
        except Exception:
            return None
    
    async def get_farmer_by_nrc(self, nrc: str) -> Optional[FarmerOut]:
        """
        Get farmer by NRC number (using hash lookup).
        
        Args:
            nrc: National Registration Card number
        
        Returns:
            Optional[FarmerOut]: Farmer document or None
        """
        nrc_hash = hmac_hash(nrc, salt="nrc")
        farmer = await self.collection.find_one({"nrc_hash": nrc_hash})
        
        if not farmer:
            return None
        
        return FarmerOut.from_mongo(farmer)
    
    async def list_farmers(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        district: Optional[str] = None,
        search: Optional[str] = None,
        created_by: Optional[str] = None,
        farmer_id_exact: Optional[str] = None,
        nrc: Optional[str] = None,
        allowed_districts: Optional[List[str]] = None
    ) -> List[FarmerListItem]:
        """
        List farmers with pagination and filtering.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Filter by registration status
            district: Filter by district name
            search: Search in name, phone, farmer_id (ignored if farmer_id_exact or nrc provided)
            created_by: Filter by operator email (for operators viewing their own farmers)
            farmer_id_exact: Exact farmer_id match (short-circuits other text search)
            nrc: Exact NRC number (hash lookup; short-circuits other search)
            allowed_districts: List of districts operator is allowed to see (None = all)
        
        Returns:
            List[FarmerListItem]: List of farmer summaries
        """
        # Build query filter
        query = {}
        
        if status:
            query["registration_status"] = status
        
        # Handle allowed_districts and created_by as OR conditions
        # Operator can see: farmers in their assigned districts OR farmers they created
        or_conditions = []
        
        if allowed_districts:
            or_conditions.append({"address.district_name": {"$in": allowed_districts}})
        
        if created_by:
            or_conditions.append({"created_by": created_by})
        
        # If we have OR conditions, add them to query
        if or_conditions:
            if len(or_conditions) == 1:
                # Only one condition, don't use $or
                query.update(or_conditions[0])
            else:
                # Both district and created_by, use $or
                query["$or"] = or_conditions
        elif district:
            # No allowed_districts or created_by, apply single district filter
            query["address.district_name"] = district
        
        # Exact farmer_id match takes precedence over search
        if farmer_id_exact:
            query["farmer_id"] = farmer_id_exact
        # NRC exact (hashed) match takes precedence if farmer_id_exact not provided
        elif nrc:
            query["nrc_hash"] = hmac_hash(nrc, salt="nrc")
        elif search:
            # Text search across multiple fields
            query["$or"] = [
                {"farmer_id": {"$regex": search, "$options": "i"}},
                {"personal_info.first_name": {"$regex": search, "$options": "i"}},
                {"personal_info.last_name": {"$regex": search, "$options": "i"}},
                {"personal_info.phone_primary": {"$regex": search, "$options": "i"}},
            ]
        
        # Execute query with pagination
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        farmers = await cursor.to_list(length=limit)
        
        # Transform to list items
        result = []
        for farmer in farmers:
            # Handle legacy created_at (might be empty string or missing)
            created_at = farmer.get("created_at")
            if not created_at or created_at == "":
                created_at = datetime.now(datetime.timezone.utc) if hasattr(datetime, 'timezone') else datetime.utcnow()
            
            # Handle legacy address format (district vs district_name)
            address = farmer.get("address", {})
            district_name = address.get("district_name") or address.get("district", "Unknown")
            
            # Handle both nested (personal_info) and flat structure
            personal_info = farmer.get("personal_info", {})
            first_name = personal_info.get("first_name") or farmer.get("first_name", "")
            last_name = personal_info.get("last_name") or farmer.get("last_name", "")
            phone_primary = personal_info.get("phone_primary") or farmer.get("phone_primary", "")
            
            # Legacy farmer_id placeholder if missing
            farmer_id_value = farmer.get("farmer_id") or f"LEGACY_{str(farmer['_id'])[-8:].upper()}"
            
            result.append(FarmerListItem(
                _id=str(farmer["_id"]),
                farmer_id=farmer_id_value,
                registration_status=farmer.get("registration_status", "registered"),
                created_at=created_at,
                first_name=first_name,
                last_name=last_name,
                phone_primary=phone_primary,
                village=address.get("village", ""),
                district_name=district_name,
                is_active=farmer.get("is_active", True),
                review_notes=farmer.get("review_notes"),
            ))
        
        return result
    
    async def count_farmers(
        self,
        status: Optional[str] = None,
        district: Optional[str] = None,
        created_by: Optional[str] = None,
        farmer_id_exact: Optional[str] = None,
        nrc: Optional[str] = None,
        allowed_districts: Optional[List[str]] = None
    ) -> int:
        """
        Count total farmers with optional filters.
        
        Args:
            status: Filter by registration status
            district: Filter by district name
            created_by: Filter by operator email
            farmer_id_exact: Exact farmer_id match
            nrc: Exact NRC number (hashed)
            allowed_districts: List of districts operator is allowed to see (None = all)
        
        Returns:
            int: Total count
        """
        query = {}
        
        if status:
            query["registration_status"] = status
        
        # If allowed_districts is provided, filter by those districts
        if allowed_districts:
            query["address.district_name"] = {"$in": allowed_districts}
        elif district:
            # Only apply single district filter if allowed_districts not specified
            query["address.district_name"] = district
        
        if created_by:
            query["created_by"] = created_by
        
        if farmer_id_exact:
            query["farmer_id"] = farmer_id_exact
        elif nrc:
            query["nrc_hash"] = hmac_hash(nrc, salt="nrc")
        
        return await self.collection.count_documents(query)
    
    # =======================================================
    # 3️⃣ UPDATE Operations
    # =======================================================
    async def update_farmer(
        self,
        farmer_id: str,
        update_data: FarmerUpdate
    ) -> Optional[FarmerOut]:
        """
        Update farmer information.
        
        Args:
            farmer_id: Farmer ID to update
            update_data: Partial update data
        
        Returns:
            Optional[FarmerOut]: Updated farmer or None if not found
        """
        # Check if farmer exists
        existing = await self.collection.find_one({"farmer_id": farmer_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farmer {farmer_id} not found"
            )
        
        # Build update document (only include non-None fields)
        update_dict = update_data.model_dump(exclude_none=True)
        
        if not update_dict:
            return FarmerOut.from_mongo(existing)
        
        # Merge nested updates with existing data to preserve fields not being updated
        for nested_key in ['personal_info', 'address', 'farm_info', 'household_info']:
            if nested_key in update_dict and isinstance(update_dict[nested_key], dict):
                # Merge with existing nested object
                existing_nested = existing.get(nested_key, {})
                if isinstance(existing_nested, dict):
                    # Update only the fields provided, keep the rest
                    update_dict[nested_key] = {**existing_nested, **update_dict[nested_key]}
        
        # Add updated timestamp
        now = datetime.now(datetime.timezone.utc) if hasattr(datetime, 'timezone') else datetime.utcnow()
        update_dict["updated_at"] = now
        
        # Perform update
        await self.collection.update_one(
            {"farmer_id": farmer_id},
            {"$set": update_dict}
        )
        
        # If 'is_active' is in the update, also update the user record
        if "is_active" in update_dict:
            farmer = await self.collection.find_one({"farmer_id": farmer_id})
            if farmer and farmer.get("personal_info", {}).get("email"):
                user_email = farmer["personal_info"]["email"]
                await self.db.users.update_one(
                    {"email": user_email},
                    {"$set": {"is_active": update_dict["is_active"]}}
                )

        # Fetch and return updated farmer
        updated = await self.collection.find_one({"farmer_id": farmer_id})
        return FarmerOut.from_mongo(updated)
    
    async def update_registration_status(
        self,
        farmer_id: str,
        new_status: str
    ) -> Optional[FarmerOut]:
        """
        Update farmer registration status.
        
        Args:
            farmer_id: Farmer ID
            new_status: New status (pending, approved, rejected)
        
        Returns:
            Optional[FarmerOut]: Updated farmer
        
        Raises:
            HTTPException: If status is invalid
        """
        if new_status not in ["pending", "approved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be: pending, approved, or rejected"
            )
        
        now = datetime.now(datetime.timezone.utc) if hasattr(datetime, 'timezone') else datetime.utcnow()
        
        result = await self.collection.update_one(
            {"farmer_id": farmer_id},
            {
                "$set": {
                    "registration_status": new_status,
                    "updated_at": now
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farmer {farmer_id} not found"
            )
        
        updated = await self.collection.find_one({"farmer_id": farmer_id})
        return FarmerOut.from_mongo(updated)
    
    async def update_documents(
        self,
        farmer_id: str,
        update_data: dict,
    ) -> dict:
        """
        Update farmer's documents (photo or identification documents).
        Handles the case where 'documents' field is null.
        """
        # First, ensure the documents field exists and is not null
        await self.collection.update_one(
            {"farmer_id": farmer_id, "$or": [{"documents": None}, {"documents": {"$exists": False}}]},
            {"$set": {"documents": {}}},
            upsert=False
        )
        
        # Now perform the actual update using dot notation
        result = await self.collection.update_one(
            {"farmer_id": farmer_id},
            {"$set": update_data},
            upsert=False
        )
        
        if result.matched_count == 0:
            raise ValueError(f"Farmer {farmer_id} not found")
        
        return {"success": True, "modified": result.modified_count}
    
    # =======================================================
    # 4️⃣ DELETE Operations
    # =======================================================
    async def delete_farmer(self, farmer_id: str) -> bool:
        """
        Delete a farmer record (soft delete recommended in production).
        
        Args:
            farmer_id: Farmer ID to delete
        
        Returns:
            bool: True if deleted, False if not found
        """
        result = await self.collection.delete_one({"farmer_id": farmer_id})
        return result.deleted_count > 0
    
    # =======================================================
    # 5️⃣ Validation Helpers
    # =======================================================
    def _validate_farmer_data(self, data: dict) -> None:
        """
        Validate farmer data before database operations.
        
        Args:
            data: Farmer data dictionary
        
        Raises:
            HTTPException: If validation fails
        """
        errors = []
        
        personal = data.get("personal_info", {})
        address = data.get("address", {})
        
        # --- NRC format ---
        nrc = personal.get("nrc")
        if nrc and not NRC_PATTERN.match(nrc):
            errors.append("Invalid NRC format (expected ######/##/#)")
        
        # --- Date of birth / age ---
        dob = personal.get("date_of_birth")
        if dob:
            try:
                # Parse date
                if isinstance(dob, str):
                    dob_date = datetime.strptime(dob, "%Y-%m-%d")
                else:
                    dob_date = dob
                
                # Calculate age
                now = datetime.now(datetime.timezone.utc) if hasattr(datetime, 'timezone') else datetime.utcnow()
                age = (now - dob_date).days // 365
                
                if age < 18:
                    errors.append("Farmer must be at least 18 years old")
                if age > 120:
                    errors.append("Invalid date of birth (age > 120)")
            except ValueError:
                errors.append("Invalid date_of_birth format (expected YYYY-MM-DD)")
        
        # --- GPS coordinates ---
        lat = address.get("gps_latitude")
        lon = address.get("gps_longitude")
        
        if lat is not None and lon is not None:
            try:
                lat = float(lat)
                lon = float(lon)
                
                if not (ZAMBIA_LAT_RANGE[0] <= lat <= ZAMBIA_LAT_RANGE[1]):
                    errors.append(f"Latitude out of Zambia bounds ({ZAMBIA_LAT_RANGE[0]} to {ZAMBIA_LAT_RANGE[1]})")
                
                if not (ZAMBIA_LON_RANGE[0] <= lon <= ZAMBIA_LON_RANGE[1]):
                    errors.append(f"Longitude out of Zambia bounds ({ZAMBIA_LON_RANGE[0]} to {ZAMBIA_LON_RANGE[1]})")
            except (TypeError, ValueError):
                errors.append("Invalid GPS coordinates (must be numbers)")
        
        # --- Phone number ---
        phone = personal.get("phone_primary")
        if phone and not ZAMBIA_PHONE_PATTERN.match(phone):
            errors.append("Phone must match Zambian format (+260XXXXXXXXX or 0XXXXXXXXX)")
        
        # --- Raise errors if any ---
        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Validation failed",
                    "errors": errors,
                },
            )
    
    async def _check_duplicate_nrc(self, nrc: str) -> None:
        """
        Check if NRC already exists in database.
        
        Args:
            nrc: NRC number to check
        
        Raises:
            HTTPException: If NRC already exists
        """
        nrc_hash = hmac_hash(nrc, salt="nrc")
        existing = await self.collection.find_one({"nrc_hash": nrc_hash})
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Farmer with NRC {nrc} already exists (Farmer ID: {existing['farmer_id']})"
            )
    
    async def _generate_unique_farmer_id(self) -> str:
        """
        Generate a unique farmer ID with collision detection.
        
        Returns:
            str: Unique farmer ID (e.g., ZM1A2B3C4D)
        """
        max_attempts = 10
        
        for _ in range(max_attempts):
            farmer_id = generate_farmer_id()
            
            # Check if ID already exists
            existing = await self.collection.find_one({"farmer_id": farmer_id})
            
            if not existing:
                return farmer_id
        
        # If we reach here, something is very wrong
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate unique farmer ID after multiple attempts"
        )
    
    # =======================================================
    # 6️⃣ Statistics & Analytics
    # =======================================================
    async def get_statistics(self) -> Dict[str, Any]:
        """
        Get farmer statistics for dashboard.
        
        Returns:
            Dict with farmer counts by status, district, etc.
        """
        total = await self.collection.count_documents({})
        pending = await self.collection.count_documents({"registration_status": "pending"})
        approved = await self.collection.count_documents({"registration_status": "approved"})
        rejected = await self.collection.count_documents({"registration_status": "rejected"})
        
        # Aggregate by district
        pipeline = [
            {
                "$group": {
                    "_id": "$address.district_name",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            },
            {
                "$limit": 10
            }
        ]
        
        districts = await self.collection.aggregate(pipeline).to_list(length=10)
        
        return {
            "total_farmers": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "by_district": [
                {"district": d["_id"], "count": d["count"]} 
                for d in districts
            ]
        }
