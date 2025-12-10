# backend/app/models/ethnic_group.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Annotated
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
# EthnicGroup Model
# ============================================
class EthnicGroupBase(BaseModel):
    """Base model for ethnic group"""
    name: str = Field(..., min_length=1, max_length=100, description="Ethnic group name")
    is_active: bool = Field(default=True, description="Whether this ethnic group is active")


class EthnicGroupCreate(EthnicGroupBase):
    """Model for creating ethnic groups"""
    pass


class EthnicGroupUpdate(BaseModel):
    """Model for updating ethnic groups"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class EthnicGroup(EthnicGroupBase):
    """Full ethnic group model with metadata"""
    id: Optional[PyObjectId] = Field(None, alias="_id")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )


class EthnicGroupResponse(EthnicGroupBase):
    """Response model for ethnic groups"""
    id: str = Field(alias="_id")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
