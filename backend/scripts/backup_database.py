#!/usr/bin/env python3
"""
Backup MongoDB Database
Creates a JSON backup of all collections before cleanup
"""
import asyncio
import json
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for MongoDB types"""
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


async def backup_database():
    """Create backup of all MongoDB collections"""
    print("🔄 Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Create backup directory
    backup_dir = "backups"
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{backup_dir}/backup_{timestamp}.json"
    
    print(f"📦 Creating backup: {backup_file}")
    
    backup_data = {
        "timestamp": datetime.now().isoformat(),
        "database": settings.MONGODB_DB_NAME,
        "collections": {}
    }
    
    # Get all collection names
    collection_names = await db.list_collection_names()
    
    for collection_name in collection_names:
        print(f"  📋 Backing up collection: {collection_name}")
        collection = db[collection_name]
        
        # Get all documents
        documents = []
        cursor = collection.find({})
        async for doc in cursor:
            documents.append(doc)
        
        backup_data["collections"][collection_name] = {
            "count": len(documents),
            "documents": documents
        }
        print(f"    ✅ Backed up {len(documents)} documents")
    
    # Write backup to file
    with open(backup_file, 'w') as f:
        json.dump(backup_data, f, cls=JSONEncoder, indent=2)
    
    print(f"\n✅ Backup completed successfully!")
    print(f"📄 Backup file: {backup_file}")
    print(f"📊 Total collections: {len(collection_names)}")
    
    # Summary
    print("\n📈 Backup Summary:")
    for coll_name, coll_data in backup_data["collections"].items():
        print(f"  - {coll_name}: {coll_data['count']} documents")
    
    client.close()
    return backup_file


if __name__ == "__main__":
    asyncio.run(backup_database())
