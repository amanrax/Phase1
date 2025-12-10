# backend/app/routes/geo.py
"""
Geographic data endpoints for Zambian administrative divisions.

Collections:
- provinces: Top-level administrative divisions
- districts: Districts within provinces
- chiefdoms: Traditional authority areas within districts

Hierarchy: Province → District → Chiefdom
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from functools import lru_cache
import logging

from app.database import get_db


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/geo", tags=["Geographic Data"])


# =======================================================
# Pydantic Models
# =======================================================
class Province(BaseModel):
    """Province model"""
    province_code: str = Field(..., description="Province code (e.g., LP)")
    province_name: str = Field(..., description="Province name")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "province_code": "LP",
                "province_name": "Luapula Province"
            }
        }
    )


class District(BaseModel):
    """District model"""
    district_code: str = Field(..., description="District code (e.g., LP05)")
    district_name: str = Field(..., description="District name")
    province_code: str = Field(..., description="Parent province code")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "district_code": "LP05",
                "district_name": "Kawambwa District",
                "province_code": "LP"
            }
        }
    )


class Chiefdom(BaseModel):
    """Chiefdom/Traditional Authority model"""
    chiefdom_code: str = Field(..., description="Chiefdom code (e.g., LP05-002)")
    chiefdom_name: str = Field(..., description="Chiefdom/Chief name")
    district_code: str = Field(..., description="Parent district code")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "chiefdom_code": "LP05-002",
                "chiefdom_name": "Chief Chama",
                "district_code": "LP05"
            }
        }
    )


# =======================================================
# Helper Functions
# =======================================================
def serialize_geo_doc(doc: dict, exclude_id: bool = True) -> dict:
    """
    Serialize MongoDB geographic document to JSON-safe dict.
    
    Args:
        doc: MongoDB document
        exclude_id: Whether to exclude _id field
    
    Returns:
        dict: Serialized document
    """
    import math
    
    if not doc:
        return None
    
    result = {}
    for key, value in doc.items():
        if exclude_id and key == "_id":
            continue
        
        # Handle ObjectId
        if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
            result[key] = str(value)
        # Handle NaN and Inf values (convert to None for JSON compliance)
        elif isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            result[key] = None
        else:
            result[key] = value
    
    # Map database field names to API field names
    if "province_id" in result and "province_code" not in result:
        result["province_code"] = result.pop("province_id")
    if "district_id" in result and "district_code" not in result:
        result["district_code"] = result.pop("district_id")
    if "chiefdom_id" in result and "chiefdom_code" not in result:
        result["chiefdom_code"] = result.pop("chiefdom_id")
    
    return result


# =======================================================
# PROVINCES Endpoints
# =======================================================
@router.get(
    "/provinces",
    response_model=List[Province],
    summary="List all provinces",
    description="Get all Zambian provinces"
)
async def list_provinces(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get list of all Zambian provinces.
    
    **Returns:** List of provinces sorted by name
    
    **Example Response:**
    ```
    [
        {
            "province_code": "LP",
            "province_name": "Luapula Province"
        },
        {
            "province_code": "CP",
            "province_name": "Central Province"
        }
    ]
    ```
    """
    try:
        # Query provinces, sorted by name
        cursor = db.provinces.find({}).sort("province_name", 1)
        provinces = await cursor.to_list(length=100)
        
        if not provinces:
            logger.warning("No provinces found in database")
            return []
        
        # DEBUG: Log first province structure
        if provinces:
            logger.info(f"First province keys: {list(provinces[0].keys())}")
        
        # Serialize and return
        result = [serialize_geo_doc(p) for p in provinces]
        logger.info(f"Retrieved {len(result)} provinces")
        
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving provinces: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve provinces: {str(e)}"
        )


@router.get(
    "/provinces/{province_code}",
    response_model=Province,
    summary="Get province by code",
    description="Get specific province details"
)
async def get_province(
    province_code: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get province by province code.
    
    **Path Parameters:**
    - `province_code`: Province code (e.g., "LP")
    
    **Example Response:**
    ```
    {
        "province_code": "LP",
        "province_name": "Luapula Province"
    }
    ```
    """
    try:
        province = await db.provinces.find_one({
            "province_id": province_code.upper()
        })
        
        if not province:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Province {province_code} not found"
            )
        
        return serialize_geo_doc(province)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving province {province_code}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve province: {str(e)}"
        )


# =======================================================
# DISTRICTS Endpoints
# =======================================================
@router.get(
    "/districts",
    response_model=List[District],
    summary="List districts",
    description="Get districts, optionally filtered by province"
)
async def list_districts(
    province_code: Optional[str] = Query(
        None,
        description="Filter by province code (e.g., LP)"
    ),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get list of districts with optional province filter.
    
    **Query Parameters:**
    - `province_code`: Optional filter by province (e.g., "LP")
    
    **Example:**
    ```
    GET /api/geo/districts?province_code=LP
    ```
    
    **Example Response:**
    ```
    [
        {
            "district_code": "LP05",
            "district_name": "Kawambwa District",
            "province_code": "LP"
        },
        {
            "district_code": "LP06",
            "district_name": "Mansa District",
            "province_code": "LP"
        }
    ]
    ```
    """
    try:
        # Build query
        query = {}
        if province_code:
            query["province_id"] = province_code.upper()
        
        # Execute query, sorted by name
        cursor = db.districts.find(query).sort("district_name", 1)
        districts = await cursor.to_list(length=500)
        
        if not districts:
            logger.warning(f"No districts found for query: {query}")
            return []
        
        # Serialize and return
        result = [serialize_geo_doc(d) for d in districts]
        logger.info(f"Retrieved {len(result)} districts")
        
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving districts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve districts: {str(e)}"
        )


@router.get(
    "/districts/{district_code}",
    response_model=District,
    summary="Get district by code",
    description="Get specific district details"
)
async def get_district(
    district_code: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get district by district code.
    
    **Path Parameters:**
    - `district_code`: District code (e.g., "LP05")
    
    **Example Response:**
    ```
    {
        "district_code": "LP05",
        "district_name": "Kawambwa District",
        "province_code": "LP"
    }
    ```
    """
    try:
        district = await db.districts.find_one({
            "district_id": district_code.upper()
        })
        
        if not district:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District {district_code} not found"
            )
        
        return serialize_geo_doc(district)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving district {district_code}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve district: {str(e)}"
        )


# =======================================================
# CHIEFDOMS Endpoints
# =======================================================
@router.get(
    "/chiefdoms",
    response_model=List[Chiefdom],
    summary="List chiefdoms",
    description="Get chiefdoms, optionally filtered by district"
)
async def list_chiefdoms(
    district_code: Optional[str] = Query(
        None,
        description="Filter by district code (e.g., LP05)"
    ),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get list of chiefdoms with optional district filter.
    
    **Query Parameters:**
    - `district_code`: Optional filter by district (e.g., "LP05")
    
    **Example:**
    ```
    GET /api/geo/chiefdoms?district_code=LP05
    ```
    
    **Example Response:**
    ```
    [
        {
            "chiefdom_code": "LP05-002",
            "chiefdom_name": "Chief Chama",
            "district_code": "LP05"
        },
        {
            "chiefdom_code": "LP05-003",
            "chiefdom_name": "Chief Nkuba",
            "district_code": "LP05"
        }
    ]
    ```
    """
    try:
        # Build query (case-insensitive)
        query = {}
        if district_code:
            # Case-insensitive match
            query["district_id"] = {
                "$regex": f"^{district_code}$",
                "$options": "i"
            }
        
        # Execute query, sorted by name
        cursor = db.chiefdoms.find(query).sort("chiefdom_name", 1)
        chiefdoms = await cursor.to_list(length=2000)
        
        if not chiefdoms:
            logger.warning(f"No chiefdoms found for query: {query}")
            return []
        
        # Serialize and normalize field names
        result = []
        for c in chiefdoms:
            try:
                doc = serialize_geo_doc(c)
                
                # Normalize chiefdom_name (handle legacy "chief_name" field)
                if "chiefdom_name" not in doc and "chief_name" in doc:
                    doc["chiefdom_name"] = doc.pop("chief_name")
                
                result.append(doc)
                
            except Exception as e:
                logger.warning(f"Error processing chiefdom {c.get('chiefdom_code', 'unknown')}: {e}")
                continue
        
        logger.info(f"Retrieved {len(result)} chiefdoms")
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving chiefdoms: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chiefdoms: {str(e)}"
        )


@router.get(
    "/chiefdoms/{chiefdom_code}",
    response_model=Chiefdom,
    summary="Get chiefdom by code",
    description="Get specific chiefdom details"
)
async def get_chiefdom(
    chiefdom_code: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get chiefdom by chiefdom code.
    
    **Path Parameters:**
    - `chiefdom_code`: Chiefdom code (e.g., "LP05-002")
    
    **Example Response:**
    ```
    {
        "chiefdom_code": "LP05-002",
        "chiefdom_name": "Chief Chama",
        "district_code": "LP05"
    }
    ```
    """
    try:
        chiefdom = await db.chiefdoms.find_one({
            "chiefdom_id": chiefdom_code.upper()
        })
        
        if not chiefdom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chiefdom {chiefdom_code} not found"
            )
        
        doc = serialize_geo_doc(chiefdom)
        
        # Normalize field name
        if "chiefdom_name" not in doc and "chief_name" in doc:
            doc["chiefdom_name"] = doc.pop("chief_name")
        
        return doc
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving chiefdom {chiefdom_code}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chiefdom: {str(e)}"
        )


# =======================================================
# Hierarchical Lookup
# =======================================================
@router.get(
    "/hierarchy",
    summary="Get geographic hierarchy",
    description="Get complete province → district → chiefdom hierarchy"
)
async def get_geo_hierarchy(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get complete geographic hierarchy for form dropdowns.
    
    **Use Case:** Frontend forms with cascading dropdowns
    
    **Example Response:**
    ```
    {
        "provinces": [
            {
                "province_code": "LP",
                "province_name": "Luapula Province",
                "districts": [
                    {
                        "district_code": "LP05",
                        "district_name": "Kawambwa District",
                        "chiefdoms": [
                            {
                                "chiefdom_code": "LP05-002",
                                "chiefdom_name": "Chief Chama"
                            }
                        ]
                    }
                ]
            }
        ]
    }
    ```
    """
    try:
        # Fetch all data
        provinces = await db.provinces.find({}).sort("province_name", 1).to_list(100)
        districts = await db.districts.find({}).sort("district_name", 1).to_list(500)
        chiefdoms = await db.chiefdoms.find({}).sort("chiefdom_name", 1).to_list(2000)
        
        logger.info(f"Building hierarchy from {len(provinces)} provinces, {len(districts)} districts, {len(chiefdoms)} chiefdoms")
        
        # Build hierarchy
        hierarchy = []
        
        for province in provinces:
            # Use province_id field from MongoDB (will be mapped to province_code by serialize)
            province_id = province.get("province_id")
            
            if not province_id:
                logger.warning(f"Province {province.get('province_name')} has no province_id")
                continue  # Skip if no identifier
            
            # Get districts for this province
            province_districts = [
                d for d in districts 
                if d.get("province_id") == province_id
            ]
            
            # For each district, get chiefdoms
            districts_with_chiefdoms = []
            for district in province_districts:
                # Use district_id field from MongoDB
                district_id = district.get("district_id")
                
                if not district_id:
                    continue  # Skip if no identifier
                
                district_chiefdoms = [
                    serialize_geo_doc(c)
                    for c in chiefdoms
                    if c.get("district_id", "").upper() == district_id.upper()
                ]
                
                # Normalize chiefdom names
                for chief in district_chiefdoms:
                    if "chiefdom_name" not in chief and "chief_name" in chief:
                        chief["chiefdom_name"] = chief.pop("chief_name")
                
                districts_with_chiefdoms.append({
                    **serialize_geo_doc(district),
                    "chiefdoms": district_chiefdoms
                })
            
            hierarchy.append({
                **serialize_geo_doc(province),
                "districts": districts_with_chiefdoms
            })
        
        return {"provinces": hierarchy}
        
    except Exception as e:
        logger.error(f"Error building geographic hierarchy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to build hierarchy: {str(e)}"
        )
