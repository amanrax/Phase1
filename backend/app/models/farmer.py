# backend/app/models/farmer.py
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Annotated, Any
from datetime import datetime
from bson import ObjectId
from pydantic_core import core_schema


# ============================================
# Custom ObjectId Type for Pydantic v2
# ============================================
class ObjectIdPydanticAnnotation:
    """Custom ObjectId handler for Pydantic v2"""
    
    @classmethod
    def validate_object_id(cls, v: Any, handler) -> ObjectId:
        if isinstance(v, ObjectId):
            return v
        
        s = handler(v)
        if ObjectId.is_valid(s):
            return ObjectId(s)
        else:
            raise ValueError("Invalid ObjectId")
    
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, _handler) -> core_schema.CoreSchema:
        assert source_type is ObjectId
        return core_schema.no_info_wrap_validator_function(
            cls.validate_object_id,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )


# Type alias for ObjectId fields
PyObjectId = Annotated[ObjectId, ObjectIdPydanticAnnotation]


# ============================================
# Nested Models (Sub-documents)
# ============================================
class PersonalInfo(BaseModel):
    """Personal information sub-document"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone_primary: str = Field(..., pattern=r"^(\+260|0)[0-9]{9}$")
    phone_secondary: Optional[str] = Field(None, pattern=r"^(\+260|0)[0-9]{9}$")
    email: Optional[str] = Field(None, pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    nrc: str = Field(..., description="National Registration Card number")
    date_of_birth: str = Field(..., description="Date of birth (YYYY-MM-DD)")
    gender: str = Field(..., pattern=r"^(Male|Female|Other)$")
    ethnic_group: Optional[str] = Field(None, max_length=100, description="Ethnic group")


class Address(BaseModel):
    """Address information sub-document"""
    province_code: str = Field(..., max_length=10)
    province_name: str = Field(..., max_length=100)
    district_code: str = Field(..., max_length=10)
    district_name: str = Field(..., max_length=100)
    chiefdom_code: Optional[str] = Field("", max_length=20)
    chiefdom_name: Optional[str] = Field("", max_length=100)
    village: str = Field(..., max_length=100)
    street: Optional[str] = Field(None, max_length=200)
    gps_latitude: Optional[float] = Field(None, ge=-90, le=90)
    gps_longitude: Optional[float] = Field(None, ge=-180, le=180)


class FarmInfo(BaseModel):
    """Farm information sub-document"""
    farm_size_hectares: float = Field(..., gt=0, description="Farm size in hectares")
    crops_grown: List[str] = Field(default_factory=list, max_length=20)
    livestock_types: List[str] = Field(default_factory=list, max_length=20)
    has_irrigation: bool = Field(default=False)
    years_farming: int = Field(..., ge=0, le=100)


class HouseholdInfo(BaseModel):
    """Household information sub-document"""
    household_size: int = Field(..., ge=1, description="Number of people in household")
    number_of_dependents: int = Field(..., ge=0)
    primary_income_source: str = Field(..., max_length=100)


class Documents(BaseModel):
    """Document file paths sub-document"""
    photo: Optional[str] = Field(None, description="Path to farmer photo")
    nrc_card: Optional[str] = Field(None, description="Path to NRC card PDF")
    land_title: Optional[str] = Field(None, description="Path to land title document")
    license: Optional[str] = Field(None, description="Path to farming license")
    certificate: Optional[str] = Field(None, description="Path to certificates")
    qr_code: Optional[str] = Field(None, description="Path to generated QR code")


# ============================================
# Main Farmer Models
# ============================================
class FarmerBase(BaseModel):
    """Base farmer model with common fields"""
    personal_info: PersonalInfo
    address: Address
    farm_info: Optional[FarmInfo] = None
    household_info: Optional[HouseholdInfo] = None


class FarmerCreate(FarmerBase):
    """Model for creating a new farmer (input from API)"""
    temp_id: Optional[str] = Field(None, description="Temporary ID for offline sync")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "personal_info": {
                    "first_name": "John",
                    "last_name": "Zimba",
                    "phone_primary": "0977000000",
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
                },
                "farm_info": {
                    "farm_size_hectares": 25.0,
                    "crops_grown": ["maize", "groundnuts"],
                    "livestock_types": ["goats", "chickens"],
                    "has_irrigation": True,
                    "years_farming": 10
                }
            }
        }
    )


class FarmerUpdate(BaseModel):
    """Model for updating farmer information (partial updates allowed)"""
    personal_info: Optional[PersonalInfo] = None
    address: Optional[Address] = None
    farm_info: Optional[FarmInfo] = None
    household_info: Optional[HouseholdInfo] = None
    registration_status: Optional[str] = Field(
        None, 
        pattern=r"^(pending|approved|rejected)$"
    )
    is_active: Optional[bool] = None  # <-- Added for activate/deactivate support
    
    model_config = ConfigDict(extra="ignore")


class FarmerInDB(FarmerBase):
    """Complete farmer model as stored in MongoDB"""
    id: Optional[PyObjectId] = Field(None, alias="_id")
    farmer_id: str = Field(..., description="Unique farmer ID (e.g., ZM12345)")
    registration_status: str = Field(
        default="pending",
        pattern=r"^(pending|approved|rejected)$"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    documents: Optional[Documents] = None
    is_active: bool = Field(default=True)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()}
    )


class FarmerOut(BaseModel):
    """Model for farmer output (API responses)"""
    id: str = Field(..., alias="_id")
    farmer_id: str
    registration_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    personal_info: PersonalInfo
    address: Address
    farm_info: Optional[FarmInfo] = None
    household_info: Optional[HouseholdInfo] = None
    documents: Optional[Documents] = None
    is_active: bool = Field(default=True) # Changed to default=True
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )
    
    @classmethod
    def from_mongo(cls, data: dict) -> "FarmerOut":
        """Convert MongoDB document to FarmerOut (handles legacy data format)"""
        if not data:
            return None
        
        try:
            # Convert ObjectId to string
            if "_id" in data:
                data["_id"] = str(data["_id"])
            
            # Normalize personal_info (handle legacy format)
            if "personal_info" in data:
                pi = data["personal_info"]
                # Clean empty strings for optional pattern fields
                if "email" in pi and pi["email"] == "":
                    pi["email"] = None
                if "phone_secondary" in pi and pi["phone_secondary"] == "":
                    pi["phone_secondary"] = None
                if "ethnic_group" in pi and pi["ethnic_group"] == "":
                    pi["ethnic_group"] = None
                # Ensure NRC exists (for legacy data without NRC)
                if "nrc" not in pi or not pi["nrc"]:
                    pi["nrc"] = "000000/00/0"
                # Ensure gender exists and capitalize to match pattern
                if "gender" not in pi or not pi["gender"]:
                    pi["gender"] = "Male"  # Default for legacy data
                else:
                    pi["gender"] = pi["gender"].capitalize()
                # Ensure date_of_birth exists
                if "date_of_birth" not in pi or not pi["date_of_birth"]:
                    pi["date_of_birth"] = "1980-01-01"  # Default for legacy data
            
            # Normalize address (handle legacy format with 'province'/'district' fields)
            if "address" in data:
                addr = data["address"]
                # Map legacy province/district to new _code/_name format
                if "province" in addr and "province_code" not in addr:
                    addr["province_name"] = addr.get("province", "")
                    addr["province_code"] = "LEGACY"
                if "district" in addr and "district_code" not in addr:
                    addr["district_name"] = addr.get("district", "")
                    addr["district_code"] = "LEGACY"
                # Ensure required fields exist
                if "village" not in addr or not addr["village"]:
                    addr["village"] = "Unknown"
                if "chiefdom_code" not in addr:
                    addr["chiefdom_code"] = ""
                if "chiefdom_name" not in addr:
                    addr["chiefdom_name"] = ""
            
            return cls(**data)
        except Exception as e:
            print(f"Error validating farmer data: {e}")
            print(f"Problematic data: {data}")
            raise e


class FarmerListItem(BaseModel):
    """Simplified farmer model for list views"""
    id: str = Field(..., alias="_id")
    farmer_id: str
    registration_status: str
    created_at: datetime
    first_name: str
    last_name: str
    phone_primary: str
    village: str
    district_name: str
    is_active: bool # Added is_active to FarmerListItem
    
    model_config = ConfigDict(populate_by_name=True)

