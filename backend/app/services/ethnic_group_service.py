# backend/app/services/ethnic_group_service.py
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from app.models.ethnic_group import (
    EthnicGroupCreate,
    EthnicGroupUpdate,
    EthnicGroup,
)


class EthnicGroupService:
    """Service for managing ethnic groups"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection: AsyncIOMotorCollection = db["ethnic_groups"]
    
    async def get_all(self, active_only: bool = True) -> List[dict]:
        """
        Get all ethnic groups
        
        Args:
            active_only: If True, only return active ethnic groups
        
        Returns:
            List of ethnic group documents
        """
        query = {"is_active": True} if active_only else {}
        cursor = self.collection.find(query).sort("name", 1)
        return await cursor.to_list(length=None)
    
    async def get_by_id(self, ethnic_group_id: str) -> Optional[dict]:
        """Get ethnic group by ID"""
        try:
            obj_id = ObjectId(ethnic_group_id)
            return await self.collection.find_one({"_id": obj_id})
        except Exception:
            return None
    
    async def get_by_name(self, name: str) -> Optional[dict]:
        """Get ethnic group by name (case-insensitive)"""
        return await self.collection.find_one(
            {"name": {"$regex": f"^{name}$", "$options": "i"}}
        )
    
    async def create(self, ethnic_group_data: EthnicGroupCreate) -> dict:
        """
        Create a new ethnic group
        
        Args:
            ethnic_group_data: EthnicGroupCreate model
        
        Returns:
            Created ethnic group document
        
        Raises:
            ValueError: If ethnic group name already exists
        """
        # Check if ethnic group already exists
        existing = await self.get_by_name(ethnic_group_data.name)
        if existing:
            raise ValueError(f"Ethnic group '{ethnic_group_data.name}' already exists")
        
        # Create document
        doc = {
            "name": ethnic_group_data.name,
            "is_active": ethnic_group_data.is_active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc
    
    async def update(self, ethnic_group_id: str, update_data: EthnicGroupUpdate) -> Optional[dict]:
        """Update an ethnic group"""
        try:
            obj_id = ObjectId(ethnic_group_id)
            update_fields = update_data.model_dump(exclude_unset=True)
            update_fields["updated_at"] = datetime.utcnow()
            
            result = await self.collection.find_one_and_update(
                {"_id": obj_id},
                {"$set": update_fields},
                return_document=True,
            )
            return result
        except Exception:
            return None
    
    async def delete(self, ethnic_group_id: str) -> bool:
        """Soft delete: set is_active to False"""
        try:
            obj_id = ObjectId(ethnic_group_id)
            result = await self.collection.update_one(
                {"_id": obj_id},
                {
                    "$set": {
                        "is_active": False,
                        "updated_at": datetime.utcnow(),
                    }
                },
            )
            return result.modified_count > 0
        except Exception:
            return False
    
    async def seed_default_ethnic_groups(self) -> None:
        """Seed default ethnic groups if collection is empty"""
        count = await self.collection.count_documents({})
        if count > 0:
            return  # Already seeded
        
        default_groups = [
            "Bemba",
            "Tonga",
            "Chewa",
            "Lozi",
            "Nsenga",
            "Tumbuka",
            "Ngoni",
            "Lala",
            "Kaonde",
            "Lunda",
            "Luvale",
            "Mambwe",
            "Namwanga",
        ]
        
        now = datetime.utcnow()
        docs = [
            {
                "name": group,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            for group in default_groups
        ]
        
        if docs:
            await self.collection.insert_many(docs)
            print(f"✓ Seeded {len(docs)} ethnic groups")
