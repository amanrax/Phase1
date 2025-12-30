import sys
import os

# ✅ Ensure '/app' (parent of scripts) is in Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from passlib.context import CryptContext
from pymongo import MongoClient


pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = MongoClient(settings.MONGODB_URL)
db = client[settings.MONGODB_DB_NAME]


EMAIL = settings.SEED_ADMIN_EMAIL
PASSWORD = settings.SEED_ADMIN_PASSWORD
HASHED = pwd_ctx.hash(PASSWORD[:72])

admin = {
    "email": EMAIL,
    "password_hash": HASHED,
    "roles": ["ADMIN"],  # ✅ always ensure this field exists
    "is_active": True,
    "created_at": __import__('datetime').datetime.utcnow(),
    "updated_at": __import__('datetime').datetime.utcnow(),
}

existing = db.users.find_one({"email": EMAIL})
if not existing:
    db.users.insert_one(admin)
    print(f"✅ Seeded admin: {EMAIL}")
else:
    db.users.update_one({"email": EMAIL}, {"$set": admin})
    print(f"✅ Updated existing admin: {EMAIL}")