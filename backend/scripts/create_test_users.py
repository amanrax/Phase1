# create_atlas_users.py
from pymongo import MongoClient
from passlib.context import CryptContext
import os

# Connect to Atlas
ATLAS_URI = os.getenv("MONGODB_URL", "your-mongodb-uri-here")
client = MongoClient(ATLAS_URI)
db = client.zambian_farmer_db

# Hash passwords
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

users = [
    {
        "email": "admin@agrimanage.com",
        "password_hash": pwd_ctx.hash("admin123"),
        "roles": ["ADMIN"],  # Uppercase for consistency with backend role checks
        "is_active": True,
        "full_name": "System Admin"
    },
    {
        "email": "operator@agrimanage.com",
        "password_hash": pwd_ctx.hash("operator123"),
        "roles": ["OPERATOR"],  # Uppercase for consistency with backend role checks
        "is_active": True,
        "full_name": "Operator User"
    },
    {
        "email": "viewer@agrimanage.com",
        "password_hash": pwd_ctx.hash("viewer123"),
        "roles": ["VIEWER"],  # Uppercase for consistency with backend role checks
        "is_active": True,
        "full_name": "Viewer User"
    }
]

# Insert users
print("🔌 Connecting to MongoDB Atlas...")
for user in users:
    existing = db.users.find_one({"email": user["email"]})
    if existing:
        print(f"⚠️  User {user['email']} already exists, updating...")
        db.users.update_one(
            {"email": user["email"]},
            {"$set": user}
        )
    else:
        print(f"✅ Creating user: {user['email']}")
        db.users.insert_one(user)

print("\n🎉 All users created successfully in Atlas!")
print("\n📋 Test Credentials:")
print("  - admin@agrimanage.com / admin123")
print("  - operator@agrimanage.com / operator123")
print("  - viewer@agrimanage.com / viewer123")

client.close()
