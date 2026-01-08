#!/usr/bin/env python3
"""
Test login credentials directly
"""
import os
import sys
from pymongo import MongoClient
from passlib.context import CryptContext

MONGODB_URL = "mongodb+srv://Aman:Zambia1234@farmer.hvygb26.mongodb.net/?retryWrites=true&w=majority&appName=Farmer"
MONGODB_DB_NAME = "zambian_farmer_db"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("🔄 Connecting to MongoDB Atlas...")
client = MongoClient(MONGODB_URL)
db = client[MONGODB_DB_NAME]

email = "cemadmin@gmail.com"
password = "Admin@2025"

print(f"\n🔍 Testing login for: {email}")
print("=" * 70)

user = db.users.find_one({"email": email})

if not user:
    print(f"❌ No user found with email: {email}")
    sys.exit(1)

print(f"✅ User found!")
print(f"  Email: {user.get('email')}")
print(f"  Role: {user.get('role')}")
print(f"  Active: {user.get('is_active')}")

# Check password_hash field
if not user.get('password_hash'):
    print(f"❌ No password_hash field!")
    if user.get('password'):
        print(f"⚠️  Found 'password' field instead: {user.get('password')[:30]}...")
else:
    print(f"✅ password_hash exists: {user.get('password_hash')[:60]}...")
    
    # Test verification
    print(f"\n🔐 Testing password verification...")
    print(f"  Password to test: {password}")
    
    try:
        result = pwd_context.verify(password, user.get('password_hash'))
        if result:
            print(f"✅ Password verification: SUCCESS")
        else:
            print(f"❌ Password verification: FAILED")
    except Exception as e:
        print(f"❌ Verification error: {e}")

client.close()
