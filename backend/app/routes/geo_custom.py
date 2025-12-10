# backend/app/routes/geo_custom.py
"""
Custom geographic data endpoints for adding user-defined locations (Others option).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from app.database import get_db
from app.dependencies.roles import require_role
from app.services.logging_service import log_event


router = APIRouter(prefix="/geo/custom", tags=["Geographic Data - Custom"])


class CustomProvinceCreate(BaseModel):
    province_name: str = Field(..., min_length=2, max_length=100)


class CustomDistrictCreate(BaseModel):
    district_name: str = Field(..., min_length=2, max_length=100)
    province_code: str = Field(..., min_length=2)


class CustomChiefdomCreate(BaseModel):
    chiefdom_name: str = Field(..., min_length=2, max_length=100)
    district_code: str = Field(..., min_length=2)


@router.post(
    "/provinces",
    status_code=status.HTTP_201_CREATED,
    summary="Add custom province",
    description="Add a user-defined province when 'Others' is selected"
)
async def create_custom_province(
    payload: CustomProvinceCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Add custom province to database."""
    await log_event(
        level="INFO",
        module="geo_custom",
        action="add_province",
        details={"province_name": payload.province_name},
        endpoint="/api/geo/custom/provinces",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])),
    )
    
    # Check if already exists
    existing = await db.provinces.find_one({"province_name": {"$regex": f"^{payload.province_name}$", "$options": "i"}})
    if existing:
        return {
            "message": "Province already exists",
            "province_code": existing.get("province_code") or existing.get("province_id"),
            "province_name": existing.get("province_name"),
        }
    
    # Generate code from name
    code = "".join([c[0].upper() for c in payload.province_name.split()[:2]])
    code = code if len(code) >= 2 else (code + "X").ljust(2, "X")
    
    # Ensure unique code
    counter = 1
    base_code = code
    while await db.provinces.find_one({"province_code": code}):
        code = f"{base_code}{counter}"
        counter += 1
    
    doc = {
        "province_code": code,
        "province_id": code,
        "province_name": payload.province_name,
        "custom_added": True,
        "added_by": current_user.get("email"),
        "created_at": datetime.utcnow(),
    }
    
    await db.provinces.insert_one(doc)
    
    return {
        "message": "Province added successfully",
        "province_code": code,
        "province_name": payload.province_name,
    }


@router.post(
    "/districts",
    status_code=status.HTTP_201_CREATED,
    summary="Add custom district",
    description="Add a user-defined district when 'Others' is selected"
)
async def create_custom_district(
    payload: CustomDistrictCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Add custom district to database."""
    await log_event(
        level="INFO",
        module="geo_custom",
        action="add_district",
        details={"district_name": payload.district_name, "province_code": payload.province_code},
        endpoint="/api/geo/custom/districts",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])),
    )
    
    # Check if already exists
    existing = await db.districts.find_one({
        "district_name": {"$regex": f"^{payload.district_name}$", "$options": "i"},
        "province_code": payload.province_code
    })
    if existing:
        return {
            "message": "District already exists",
            "district_code": existing.get("district_code") or existing.get("district_id"),
            "district_name": existing.get("district_name"),
        }
    
    # Generate code
    code = f"{payload.province_code}{str(await db.districts.count_documents({'province_code': payload.province_code}) + 1).zfill(2)}"
    
    # Ensure unique
    counter = 1
    base_code = code
    while await db.districts.find_one({"district_code": code}):
        code = f"{base_code}{counter}"
        counter += 1
    
    doc = {
        "district_code": code,
        "district_id": code,
        "district_name": payload.district_name,
        "province_code": payload.province_code,
        "province_id": payload.province_code,
        "custom_added": True,
        "added_by": current_user.get("email"),
        "created_at": datetime.utcnow(),
    }
    
    await db.districts.insert_one(doc)
    
    return {
        "message": "District added successfully",
        "district_code": code,
        "district_name": payload.district_name,
    }


@router.post(
    "/chiefdoms",
    status_code=status.HTTP_201_CREATED,
    summary="Add custom chiefdom",
    description="Add a user-defined chiefdom when 'Others' is selected"
)
async def create_custom_chiefdom(
    payload: CustomChiefdomCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Add custom chiefdom to database."""
    await log_event(
        level="INFO",
        module="geo_custom",
        action="add_chiefdom",
        details={"chiefdom_name": payload.chiefdom_name, "district_code": payload.district_code},
        endpoint="/api/geo/custom/chiefdoms",
        user_id=current_user.get("email"),
        role=",".join(current_user.get("roles", [])),
    )
    
    # Check if already exists
    existing = await db.chiefdoms.find_one({
        "chiefdom_name": {"$regex": f"^{payload.chiefdom_name}$", "$options": "i"},
        "district_code": payload.district_code
    })
    if existing:
        return {
            "message": "Chiefdom already exists",
            "chiefdom_code": existing.get("chiefdom_code") or existing.get("chiefdom_id"),
            "chiefdom_name": existing.get("chiefdom_name"),
        }
    
    # Generate code
    count = await db.chiefdoms.count_documents({"district_code": payload.district_code})
    code = f"{payload.district_code}-{str(count + 1).zfill(3)}"
    
    # Ensure unique
    counter = 1
    base_code = code
    while await db.chiefdoms.find_one({"chiefdom_code": code}):
        code = f"{base_code}{counter}"
        counter += 1
    
    doc = {
        "chiefdom_code": code,
        "chiefdom_id": code,
        "chiefdom_name": payload.chiefdom_name,
        "chief_name": payload.chiefdom_name,
        "district_code": payload.district_code,
        "district_id": payload.district_code,
        "custom_added": True,
        "added_by": current_user.get("email"),
        "created_at": datetime.utcnow(),
    }
    
    await db.chiefdoms.insert_one(doc)
    
    return {
        "message": "Chiefdom added successfully",
        "chiefdom_code": code,
        "chiefdom_name": payload.chiefdom_name,
    }
