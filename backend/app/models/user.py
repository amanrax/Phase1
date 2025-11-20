# backend/app/models/user.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import List, Optional, Annotated, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
from pydantic_core import core_schema


# ============================================
# Custom ObjectId Type (same as farmer.py)
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


PyObjectId = Annotated[ObjectId, ObjectIdPydanticAnnotation]


# ============================================
# User Roles Enum
# ============================================
class UserRole(str, Enum):
    """Available user roles in the system"""
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    FARMER = "FARMER"
    VIEWER = "VIEWER"


# ============================================
# User Base Models
# ============================================
class UserBase(BaseModel):
    """Base user model with common fields"""
    email: EmailStr = Field(..., description="User email address")
    
    model_config = ConfigDict(
        use_enum_values=True,
        validate_assignment=True
    )


class UserCreate(UserBase):
    """Model for creating a new user"""
    password: str = Field(
        ..., 
        min_length=8,
        max_length=100,
        description="User password (min 8 characters)"
    )
    roles: List[UserRole] = Field(
        default=[UserRole.VIEWER],
        description="User roles (ADMIN, OPERATOR, FARMER, VIEWER)"
    )
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "operator@agrimanage.com",
                "password": "SecurePass123",
                "roles": ["OPERATOR"]
            }
        }
    )


class UserUpdate(BaseModel):
    """Model for updating user information"""
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    roles: Optional[List[UserRole]] = None
    is_active: Optional[bool] = None
    
    model_config = ConfigDict(extra="ignore")


class UserInDB(UserBase):
    """Complete user model as stored in MongoDB"""
    id: Optional[PyObjectId] = Field(None, alias="_id")
    password_hash: str = Field(..., description="Hashed password (bcrypt)")
    roles: List[UserRole] = Field(
        default_factory=lambda: [UserRole.VIEWER],
        description="User roles"
    )
    is_active: bool = Field(default=True, description="Account active status")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    # Optional metadata
    full_name: Optional[str] = None
    phone: Optional[str] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    )


class UserOut(BaseModel):
    """Model for user output (API responses, excludes password_hash)"""
    id: str = Field(..., alias="_id")
    email: EmailStr
    roles: List[UserRole]
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda v: v.isoformat() if v else None}
    )
    
    @classmethod
    def from_mongo(cls, data: dict) -> "UserOut":
        """Convert MongoDB document to UserOut"""
        if not data:
            return None
        
        # Convert ObjectId to string
        if "_id" in data:
            data["_id"] = str(data["_id"])
        
        # Normalize roles to uppercase (handle legacy lowercase values)
        if "roles" in data and data["roles"]:
            data["roles"] = [role.upper() if isinstance(role, str) else role for role in data["roles"]]
        
        # Ensure created_at exists (add current time if missing)
        if "created_at" not in data or data["created_at"] is None:
            from datetime import datetime, timezone
            data["created_at"] = datetime.now(timezone.utc)
        
        # Remove password_hash for security
        data.pop("password_hash", None)
        
        return cls(**data)


# ============================================
# Authentication Models (JWT)
# ============================================
class Token(BaseModel):
    """JWT token response"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800
            }
        }
    )


class TokenData(BaseModel):
    """Data extracted from JWT token"""
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=list)
    exp: Optional[int] = None
    
    model_config = ConfigDict(extra="ignore")


class LoginRequest(BaseModel):
    """Login request model"""
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="User password")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "admin@agrimanage.com",
                "password": "admin123"
            }
        }
    )


class LoginResponse(BaseModel):
    """Login response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800,
                "user": {
                    "_id": "507f1f77bcf86cd799439011",
                    "email": "admin@agrimanage.com",
                    "roles": ["ADMIN"],
                    "is_active": True,
                    "created_at": "2025-01-01T00:00:00"
                }
            }
        }
    )


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str = Field(..., description="Refresh token")


class PasswordChangeRequest(BaseModel):
    """Password change request"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., 
        min_length=8,
        description="New password (min 8 characters)"
    )
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class PasswordResetRequest(BaseModel):
    """Password reset request (forgot password)"""
    email: EmailStr = Field(..., description="User email")


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    reset_token: str = Field(..., description="Password reset token")
    new_password: str = Field(
        ..., 
        min_length=8,
        description="New password"
    )


# ============================================
# Operator Model (Extension of User)
# ============================================
class OperatorBase(BaseModel):
    """Base operator model"""
    name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., pattern=r"^(\+260|0)[0-9]{9}$")
    assigned_district: str = Field(..., max_length=100)


class OperatorCreate(OperatorBase):
    """Model for creating an operator"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Jane Doe",
                "phone": "+260977000000",
                "assigned_district": "Kawambwa",
                "email": "operator@agrimanage.com",
                "password": "SecurePass123"
            }
        }
    )


class OperatorInDB(OperatorBase):
    """Operator model as stored in MongoDB"""
    id: Optional[PyObjectId] = Field(None, alias="_id")
    operator_id: str = Field(..., description="Unique operator ID")
    user_id: Optional[str] = Field(None, description="Reference to users collection")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()}
    )


class OperatorOut(BaseModel):
    """Operator output model"""
    id: str = Field(..., alias="_id")
    operator_id: str
    name: str
    phone: str
    assigned_district: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)
    
    @classmethod
    def from_mongo(cls, data: dict) -> "OperatorOut":
        """Convert MongoDB document to OperatorOut"""
        if not data:
            return None
        
        if "_id" in data:
            data["_id"] = str(data["_id"])
        
        return cls(**data)
