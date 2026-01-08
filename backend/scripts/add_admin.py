#!/usr/bin/env python3
"""
Add a new admin user to the database
"""
import os
import sys
from datetime import datetime
from pymongo import MongoClient
import bcrypt

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    # Truncate password if longer than 72 bytes
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "zambian_farmer_db")

if not MONGODB_URL:
    print("❌ Error: MONGODB_URL environment variable not set")
    sys.exit(1)

def add_admin():
    """Add new admin user"""
    print("🔄 Connecting to MongoDB Atlas...")
    client = MongoClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    
    # Admin details
    email = "cemadmin@gmail.com"
    password = "Admin@2025"
    
    # Check if admin already exists
    existing = db.users.find_one({"email": email})
    if existing:
        print(f"⚠️  Admin {email} already exists. Updating password...")
        result = db.users.update_one(
            {"email": email},
            {"$set": {
                "password_hash": hash_password(password),
                "updated_at": datetime.utcnow()
            }}
        )
        print(f"✅ Updated admin user")
    else:
        print(f"➕ Creating new admin user...")
        admin_doc = {
            "email": email,
            "password_hash": hash_password(password),
            "role": "admin",
            "name": "CEM Admin",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = db.users.insert_one(admin_doc)
        print(f"✅ Created new admin user")
    
    # Verify the user exists
    user = db.users.find_one({"email": email})
    if user:
        print("\n✅ Admin user verified in database!")
        print("=" * 60)
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print(f"  Role:     {user.get('role', 'N/A')}")
        print(f"  Active:   {user.get('is_active', False)}")
        print("=" * 60)
        
        # Test password verification
        if verify_password(password, user['password_hash']):
            print("✅ Password verification: PASSED")
        else:
            print("❌ Password verification: FAILED")
    else:
        print("❌ Failed to verify admin user")
    
    client.close()

if __name__ == "__main__":
    add_admin()
