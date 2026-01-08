#!/usr/bin/env python3
"""
Update admin password directly in database using pre-hashed password
"""
import os
import sys
from datetime import datetime
from pymongo import MongoClient

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "zambian_farmer_db")

if not MONGODB_URL:
    print("❌ Error: MONGODB_URL environment variable not set")
    sys.exit(1)

def update_admin():
    """Update admin user with pre-hashed password"""
    print("🔄 Connecting to MongoDB Atlas...")
    client = MongoClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    
    # Admin details
    email = "cemadmin@gmail.com"
    # Pre-generated hash from backend container for password: Admin@2025
    password_hash = "$2b$12$avRRn/OPevVbYgbBWHOxq.hMuWBHX4IcGfqR.NnWEI8wUCwlcVD7W"
    
    # Check if admin exists
    existing = db.users.find_one({"email": email})
    if existing:
        print(f"⚠️  Admin {email} already exists. Updating password...")
        result = db.users.update_one(
            {"email": email},
            {"$set": {
                "password_hash": password_hash,
                "updated_at": datetime.utcnow()
            }}
        )
        print(f"✅ Updated {result.modified_count} admin user(s)")
    else:
        print(f"➕ Creating new admin user...")
        admin_doc = {
            "email": email,
            "password_hash": password_hash,
            "role": "admin",
            "name": "CEM Admin",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = db.users.insert_one(admin_doc)
        print(f"✅ Created new admin user with ID: {result.inserted_id}")
    
    # Verify the user exists
    user = db.users.find_one({"email": email})
    if user:
        print("\n✅ Admin user verified in database!")
        print("=" * 60)
        print(f"  Email:    cemadmin@gmail.com")
        print(f"  Password: Admin@2025")
        print(f"  Role:     {user.get('role', 'N/A')}")
        print(f"  Active:   {user.get('is_active', False)}")
        print(f"  Hash:     {user.get('password_hash', 'N/A')[:30]}...")
        print("=" * 60)
    else:
        print("❌ Failed to verify admin user")
    
    client.close()
    print("\n✅ Update complete! You can now log in with these credentials.")

if __name__ == "__main__":
    update_admin()
