#!/usr/bin/env python3
"""
Remove old password field, keep only password_hash
"""
import os
import sys
from pymongo import MongoClient

MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "zambian_farmer_db")

if not MONGODB_URL:
    print("❌ Error: MONGODB_URL environment variable not set")
    sys.exit(1)

print("🔄 Connecting to MongoDB Atlas...")
client = MongoClient(MONGODB_URL)
db = client[MONGODB_DB_NAME]

email = "cemadmin@gmail.com"

# Remove the old 'password' field
result = db.users.update_one(
    {"email": email},
    {"$unset": {"password": ""}}
)

print(f"✅ Removed 'password' field from {result.modified_count} user(s)")

# Verify
user = db.users.find_one({"email": email})
print("\n📋 Updated user:")
print(f"  Email: {user.get('email')}")
print(f"  Has password_hash: {bool(user.get('password_hash'))}")
print(f"  Has password: {bool(user.get('password'))}")
print(f"  password_hash: {user.get('password_hash')[:60]}...")

client.close()
