#!/usr/bin/env python3
"""
Check admin user in database
"""
import os
import sys
from pymongo import MongoClient

MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "zambian_farmer_db")

if not MONGODB_URL:
    print("❌ Error: MONGODB_URL environment variable not set")
    sys.exit(1)

def check_admin():
    print("🔄 Connecting to MongoDB Atlas...")
    client = MongoClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    
    email = "cemadmin@gmail.com"
    user = db.users.find_one({"email": email})
    
    if user:
        print("\n📋 Admin User Details:")
        print("=" * 70)
        print(f"  _id:          {user.get('_id')}")
        print(f"  email:        {user.get('email')}")
        print(f"  role:         {user.get('role')}")
        print(f"  is_active:    {user.get('is_active')}")
        print(f"  password_hash exists: {bool(user.get('password_hash'))}")
        if user.get('password_hash'):
            print(f"  password_hash: {user.get('password_hash')[:50]}...")
        print(f"  password field exists: {bool(user.get('password'))}")
        print(f"  name:         {user.get('name')}")
        print(f"  created_at:   {user.get('created_at')}")
        print(f"  updated_at:   {user.get('updated_at')}")
        print("=" * 70)
        
        # List all fields
        print("\n📝 All fields in user document:")
        for key, value in user.items():
            if key not in ['password_hash', 'password']:
                print(f"  - {key}: {value}")
        
        # Check if password_hash starts with $2b$ (bcrypt)
        if user.get('password_hash'):
            hash_val = user.get('password_hash')
            if hash_val.startswith('$2b$'):
                print("\n✅ Password hash format looks correct (bcrypt $2b$)")
            else:
                print(f"\n⚠️  Unexpected hash format: {hash_val[:20]}...")
    else:
        print(f"\n❌ No user found with email: {email}")
        
        # Check if there are ANY admin users
        print("\n🔍 Searching for any admin users...")
        admins = list(db.users.find({"role": "admin"}))
        print(f"\nFound {len(admins)} admin user(s):")
        for admin in admins:
            print(f"  - {admin.get('email')} (active: {admin.get('is_active')})")
    
    client.close()

if __name__ == "__main__":
    check_admin()
