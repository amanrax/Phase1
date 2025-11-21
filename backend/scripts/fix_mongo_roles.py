#!/usr/bin/env python3
"""
Direct MongoDB update to fix user roles to UPPERCASE.
Uses pymongo to connect directly to MongoDB.
"""
import pymongo
from typing import Optional

# Try multiple connection strategies
def get_mongo_connection():
    """Try to connect to MongoDB with various strategies."""
    strategies = [
        # Try 1: Local Docker network with auth
        lambda: pymongo.MongoClient(
            "mongodb://admin:Admin123@farmer-mongo:27017/zambian_farmer_db?authSource=admin",
            serverSelectionTimeoutMS=5000
        ),
        # Try 2: Host localhost
        lambda: pymongo.MongoClient(
            "mongodb://admin:Admin123@localhost:27017/zambian_farmer_db?authSource=admin",
            serverSelectionTimeoutMS=5000
        ),
    ]
    
    for i, strategy in enumerate(strategies, 1):
        try:
            print(f"🔌 Attempt {i}: Trying MongoDB connection...")
            client = strategy()
            # Verify connection
            client.admin.command('ping')
            print(f"   ✅ Connected!")
            return client
        except Exception as e:
            print(f"   ❌ Failed: {str(e)[:80]}")
    
    return None

def fix_roles():
    """Update all user roles to UPPERCASE."""
    client = get_mongo_connection()
    if not client:
        print("\n❌ Could not connect to MongoDB")
        return False
    
    try:
        db = client["zambian_farmer_db"]
        users_col = db["users"]
        
        # Find all users
        users = list(users_col.find({}))
        print(f"\n📋 Found {len(users)} users in database")
        
        if len(users) == 0:
            print("⚠️  No users found.")
            return False
        
        # Show current state
        print("\n📊 Current user roles:")
        for user in users:
            email = user.get("email")
            roles = user.get("roles", [])
            print(f"   {email}: {roles}")
        
        # Update roles to uppercase
        print("\n🔄 Updating roles to UPPERCASE...")
        updated_count = 0
        
        for user in users:
            email = user.get("email")
            roles = user.get("roles", [])
            new_roles = [str(r).upper() for r in roles]
            
            if roles != new_roles:
                result = users_col.update_one(
                    {"email": email},
                    {"$set": {"roles": new_roles}}
                )
                if result.modified_count > 0:
                    print(f"   ✓ {email}: {roles} → {new_roles}")
                    updated_count += 1
        
        if updated_count == 0:
            print("   All roles are already UPPERCASE")
        else:
            print(f"\n✅ Updated {updated_count} users")
        
        # Verify
        print("\n✅ Final user roles:")
        for user in users_col.find({}):
            email = user.get("email")
            roles = user.get("roles", [])
            print(f"   {email}: {roles}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        if client:
            client.close()
        return False

if __name__ == "__main__":
    success = fix_roles()
    exit(0 if success else 1)
