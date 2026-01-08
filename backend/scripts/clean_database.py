#!/usr/bin/env python3
"""
Clean MongoDB Database - Remove Test Data
Keeps only 1 admin user, removes all test data
Standalone script - works with MongoDB Atlas directly
"""
from pymongo import MongoClient
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os

def clean_database():
    """Remove test data from database"""
    # Get MongoDB URL from environment or use default
    MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb+srv://username:password@cluster.mongodb.net/')
    MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'zambian_farmer_db')
    
    print("🔄 Connecting to MongoDB Atlas...")
    client = MongoClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    
    print("\n🧹 Starting database cleanup...")
    print("=" * 60)
    
    # 1. Delete test provinces
    print("\n1️⃣ Deleting test provinces...")
    provinces_to_delete = ["test province", "test custom province"]
    for province in provinces_to_delete:
        result = db.provinces.delete_many({
            "name": {"$regex": province, "$options": "i"}
        })
        print(f"  ✅ Deleted {result.deleted_count} '{province}' entries")
    
    # Also delete any districts/chiefdoms/villages associated with test provinces
    result = db.districts.delete_many({
        "province_name": {"$regex": "test", "$options": "i"}
    })
    print(f"  ✅ Deleted {result.deleted_count} test districts")
    
    result = db.chiefdoms.delete_many({
        "province_name": {"$regex": "test", "$options": "i"}
    })
    print(f"  ✅ Deleted {result.deleted_count} test chiefdoms")
    
    result = db.villages.delete_many({
        "province_name": {"$regex": "test", "$options": "i"}
    })
    print(f"  ✅ Deleted {result.deleted_count} test villages")
    
    # 2. Delete all farmers and their data
    print("\n2️⃣ Deleting all farmers...")
    farmer_count = db.farmers.count_documents({})
    result = db.farmers.delete_many({})
    print(f"  ✅ Deleted {result.deleted_count} farmers (total: {farmer_count})")
    
    # Delete farmer photos
    result = db["fs.files"].delete_many({"metadata.type": "farmer_photo"})
    print(f"  ✅ Deleted {result.deleted_count} farmer photos")
    
    result = db["fs.chunks"].delete_many({})
    print(f"  ✅ Cleaned up GridFS chunks")
    
    # 3. Delete supply requests
    print("\n3️⃣ Deleting supply requests...")
    request_count = db.supply_requests.count_documents({})
    result = db.supply_requests.delete_many({})
    print(f"  ✅ Deleted {result.deleted_count} supply requests (total: {request_count})")
    
    # 4. Delete all operators
    print("\n4️⃣ Deleting all operators...")
    operator_count = db.users.count_documents({"roles": "OPERATOR"})
    result = db.users.delete_many({"roles": "OPERATOR"})
    print(f"  ✅ Deleted {result.deleted_count} operators (total: {operator_count})")
    
    # 5. Keep only 1 admin
    print("\n5️⃣ Managing admin users...")
    admins = list(db.users.find({"roles": "ADMIN"}))
    
    print(f"  📊 Found {len(admins)} admin users")
    
    if len(admins) == 0:
        print("  ⚠️ No admin users found! Creating default admin...")
        # Create default admin
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        default_admin = {
            "email": "admin@agrimanage.com",
            "hashed_password": pwd_context.hash("admin1234"),
            "full_name": "System Administrator",
            "roles": ["ADMIN"],
            "is_active": True,
            "created_at": None,
            "updated_at": None
        }
        db.users.insert_one(default_admin)
        print(f"  ✅ Created default admin: admin@agrimanage.com")
        kept_admin = default_admin
    else:
        # Keep the first admin, delete the rest
        kept_admin = admins[0]
        if len(admins) > 1:
            admin_ids_to_delete = [admin["_id"] for admin in admins[1:]]
            result = db.users.delete_many({"_id": {"$in": admin_ids_to_delete}})
            print(f"  ✅ Deleted {result.deleted_count} extra admin users")
        
        print(f"  ✅ Kept 1 admin: {kept_admin['email']}")
    
    # 6. Clean up logs (optional - keep only recent)
    print("\n6️⃣ Cleaning up old logs...")
    thirty_days_ago = datetime.now() - timedelta(days=30)
    result = db.system_logs.delete_many({
        "timestamp": {"$lt": thirty_days_ago}
    })
    print(f"  ✅ Deleted {result.deleted_count} old log entries (>30 days)")
    
    # Final summary
    print("\n" + "=" * 60)
    print("✅ Database cleanup completed!")
    print("\n📊 Remaining Data:")
    print(f"  - Farmers: {db.farmers.count_documents({})}")
    print(f"  - Operators: {db.users.count_documents({'roles': 'OPERATOR'})}")
    print(f"  - Admins: {db.users.count_documents({'roles': 'ADMIN'})}")
    print(f"  - Supply Requests: {db.supply_requests.count_documents({})}")
    print(f"  - Provinces: {db.provinces.count_documents({})}")
    
    print("\n🔑 Admin Login Credentials:")
    print("=" * 60)
    print(f"  Email:    {kept_admin['email']}")
    print(f"  Password: admin1234")  # Default password
    print(f"  Name:     {kept_admin.get('full_name', 'N/A')}")
    print("=" * 60)
    
    client.close()
    
    return kept_admin

if __name__ == "__main__":
    clean_database()
