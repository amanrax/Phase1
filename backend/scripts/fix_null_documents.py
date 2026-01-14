"""Fix farmers with null documents field."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def fix_null_documents():
    mongo_uri = os.getenv("MONGO_URI", "mongodb+srv://cemdb_admin:Cem@2025@farmer.5oixrfr.mongodb.net/?retryWrites=truemongodb://localhow=majoritymongodb://localhoappName=farmerst:27017")
    client = AsyncIOMotorClient(mongo_uri)
    db = client.zfdcam_db
    
    result = await db.farmers.update_many(
        {"documents": None},
        {"$set": {"documents": {}}}
    )
    
    print(f"Fixed {result.modified_count} farmers with null documents field")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_null_documents())
