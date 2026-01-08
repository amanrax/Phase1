#!/usr/bin/env python3
"""
Check current database state
"""
from pymongo import MongoClient

MONGODB_URL = "mongodb+srv://Aman:Zambia1234@farmer.hvygb26.mongodb.net/?retryWrites=true&w=majority&appName=Farmer"
MONGODB_DB_NAME = "zambian_farmer_db"

print("🔄 Connecting to MongoDB Atlas...")
client = MongoClient(MONGODB_URL)
db = client[MONGODB_DB_NAME]

print("\n📊 CURRENT DATABASE STATE:")
print("=" * 70)

# Count users by role
print("\n👥 USERS COLLECTION:")
all_users = list(db.users.find({}, {"email": 1, "role": 1, "roles": 1, "is_active": 1}))
print(f"  Total users: {len(all_users)}")

admin_count = len([u for u in all_users if 'ADMIN' in u.get('roles', []) or u.get('role') == 'admin'])
operator_count = len([u for u in all_users if 'OPERATOR' in u.get('roles', []) or u.get('role') == 'operator'])
farmer_count = len([u for u in all_users if 'FARMER' in u.get('roles', []) or u.get('role') == 'farmer'])

print(f"  - Admins: {admin_count}")
print(f"  - Operators: {operator_count}")
print(f"  - Farmers: {farmer_count}")

print("\n  📋 All users:")
for user in all_users:
    roles = user.get('roles', []) or [user.get('role', 'unknown')]
    print(f"    - {user.get('email'):40} | roles={roles} | active={user.get('is_active', True)}")

# Check operators collection
print("\n👷 OPERATORS COLLECTION:")
operators = list(db.operators.find({}, {"email": 1, "name": 1, "status": 1}))
print(f"  Total: {len(operators)}")
if operators:
    for op in operators[:10]:  # Show first 10
        print(f"    - {op.get('email', 'N/A'):40} | name={op.get('name', 'N/A')}")
    if len(operators) > 10:
        print(f"    ... and {len(operators) - 10} more")

# Check farmers collection
print("\n🌾 FARMERS COLLECTION:")
farmers = list(db.farmers.find({}, {"farmer_id": 1, "personal_info.email": 1, "status": 1}))
print(f"  Total: {len(farmers)}")
if farmers:
    for farmer in farmers[:10]:  # Show first 10
        email = farmer.get('personal_info', {}).get('email', 'N/A')
        print(f"    - {farmer.get('farmer_id', 'N/A'):20} | email={email}")
    if len(farmers) > 10:
        print(f"    ... and {len(farmers) - 10} more")

# Check specific user
print("\n🔍 CHECKING cemfarmer@gmail.com:")
cem_farmer = db.users.find_one({"email": "cemfarmer@gmail.com"})
if cem_farmer:
    print(f"  ✅ EXISTS in users collection")
    print(f"     Role: {cem_farmer.get('role')} / Roles: {cem_farmer.get('roles')}")
    print(f"     Active: {cem_farmer.get('is_active')}")
else:
    print(f"  ❌ NOT FOUND in users collection")

client.close()
