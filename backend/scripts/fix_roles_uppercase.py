#!/usr/bin/env python3
"""
Migration script to normalize user roles to UPPERCASE in MongoDB.

Background:
- JWT tokens include roles in uppercase: "ADMIN", "OPERATOR", "VIEWER"
- Backend role checks compare against uppercase values
- Some users in DB have lowercase roles from old seeds: "admin", "operator", "viewer"
- This causes 403 Forbidden errors even with valid tokens

This script updates all existing user records to use UPPERCASE roles.
"""

import sys
from pymongo import MongoClient, errors

# Connection details
# From docker-compose.yml: admin/Admin123, authSource=admin
MONGODB_URL = "mongodb://admin:Admin123@farmer-mongo:27017/zambian_farmer_db?authSource=admin"
DB_NAME = "zambian_farmer_db"

def normalize_roles(roles):
    """Convert role list to UPPERCASE."""
    if not isinstance(roles, list):
        return roles
    return [str(r).upper() for r in roles]

def migrate_roles():
    """Migrate all user roles to UPPERCASE."""
    try:
        # Connect to MongoDB
        client = MongoClient(MONGODB_URL)
        db = client[DB_NAME]
        users_collection = db.users
        
        print(f"📊 Connecting to MongoDB: {MONGODB_URL}/{DB_NAME}")
        
        # Find all users
        all_users = list(users_collection.find({}))
        print(f"📋 Found {len(all_users)} users in database")
        
        if len(all_users) == 0:
            print("⚠️  No users found. Run create_test_users.py first.")
            return
        
        # Check which users need updates
        users_to_update = []
        for user in all_users:
            roles = user.get("roles", [])
            normalized = normalize_roles(roles)
            
            # Check if any role is lowercase
            if roles != normalized:
                users_to_update.append((user["email"], roles, normalized))
        
        if not users_to_update:
            print("✅ All users already have UPPERCASE roles. No migration needed.")
            return
        
        print(f"\n🔄 Updating {len(users_to_update)} users:")
        for email, old_roles, new_roles in users_to_update:
            print(f"   {email}: {old_roles} → {new_roles}")
        
        # Perform bulk update
        for email, old_roles, new_roles in users_to_update:
            result = users_collection.update_one(
                {"email": email},
                {"$set": {"roles": new_roles}}
            )
            if result.modified_count > 0:
                print(f"   ✓ Updated {email}")
        
        print(f"\n✅ Migration complete! All {len(users_to_update)} users now have UPPERCASE roles.")
        
        # Verify
        updated_users = list(users_collection.find({}))
        all_uppercase = all(
            all(isinstance(r, str) and r.isupper() for r in u.get("roles", []))
            for u in updated_users
        )
        
        if all_uppercase:
            print("✓ Verification passed: All roles are UPPERCASE")
        else:
            print("⚠️  Warning: Some roles may still be lowercase")
        
        client.close()
        
    except errors.ServerSelectionTimeoutError:
        print(f"❌ Failed to connect to MongoDB at {MONGODB_URL}")
        print("   Make sure MongoDB container is running: docker-compose up -d farmer-mongo")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_roles()
