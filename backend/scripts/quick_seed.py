#!/usr/bin/env python3
"""
Quick seed script - adds minimum test data for login testing
"""
import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "zambian_farmer_db")

async def seed_data():
    print("🌱 Quick Seeding Database...")
    print(f"   DB: {MONGODB_DB_NAME}")
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    
    # Check if already seeded
    farmer_count = await db.farmers.count_documents({})
    if farmer_count > 0:
        print(f"✅ Database already has {farmer_count} farmers - skipping seed")
        return
    
    # 1. Seed Admin
    admin_exists = await db.users.find_one({"email": "admin@ziamis.gov.zm"})
    if not admin_exists:
        admin = {
            "email": "admin@ziamis.gov.zm",
            "full_name": "System Administrator",
            "hashed_password": pwd_context.hash("Admin@2024"),
            "roles": ["ADMIN"],
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(admin)
        print("✅ Created admin user")
    
    # 2. Seed Operator
    operator_exists = await db.users.find_one({"email": "operator1@ziamis.gov.zm"})
    if not operator_exists:
        operator = {
            "email": "operator1@ziamis.gov.zm",
            "full_name": "John Operator",
            "hashed_password": pwd_context.hash("Operator@123"),
            "roles": ["OPERATOR"],
            "is_active": True,
            "assigned_districts": ["Kawambwa District"],
            "created_at": datetime.utcnow(),
        }
        result = await db.users.insert_one(operator)
        operator_id = str(result.inserted_id)
        print("✅ Created operator user")
    else:
        operator_id = str(operator_exists["_id"])
    
    # 3. Seed Test Farmer
    farmer = {
        "farmer_id": "ZM880CB4DC",
        "personal_info": {
            "full_name": "Mary Mwale",
            "nrc": "315990/08/2",
            "date_of_birth": "1961-02-02",
            "gender": "Female",
            "phone": "+260977123456",
        },
        "location": {
            "province": "Luapula Province",
            "district": "Kawambwa District",
            "address": "Kawambwa Village",
        },
        "farm_details": {
            "farm_size_hectares": 5.0,
            "crops": ["Maize", "Cassava"],
            "livestock": ["Chickens"],
            "owns_land": True,
        },
        "operator_id": operator_id,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.farmers.insert_one(farmer)
    print("✅ Created test farmer (Mary Mwale)")
    
    # 4. Seed a few more farmers
    farmers = [
        {
            "farmer_id": "ZMD8B5130E",
            "personal_info": {
                "full_name": "David Phiri",
                "nrc": "071186/59/0",
                "date_of_birth": "1962-03-03",
                "gender": "Male",
                "phone": "+260977123457",
            },
            "location": {
                "province": "Luapula Province",
                "district": "Kawambwa District",
                "address": "Kawambwa Town",
            },
            "farm_details": {
                "farm_size_hectares": 3.0,
                "crops": ["Maize"],
                "livestock": [],
                "owns_land": True,
            },
            "operator_id": operator_id,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
        {
            "farmer_id": "ZMEFD08D9A",
            "personal_info": {
                "full_name": "Grace Chanda",
                "nrc": "898722/01/2",
                "date_of_birth": "1963-04-04",
                "gender": "Female",
                "phone": "+260977123458",
            },
            "location": {
                "province": "Luapula Province",
                "district": "Kawambwa District",
                "address": "Nchelenge Road",
            },
            "farm_details": {
                "farm_size_hectares": 4.5,
                "crops": ["Cassava", "Sweet Potato"],
                "livestock": ["Goats"],
                "owns_land": True,
            },
            "operator_id": operator_id,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
    ]
    await db.farmers.insert_many(farmers)
    print(f"✅ Created {len(farmers)} additional farmers")
    
    total = await db.farmers.count_documents({})
    print(f"\n🎉 Seeding complete! {total} farmers in database")
    print("\n📋 TEST CREDENTIALS:")
    print("   Admin: admin@ziamis.gov.zm / Admin@2024")
    print("   Operator: operator1@ziamis.gov.zm / Operator@123")
    print("   Farmer (Mary): NRC=315990/08/2, DOB=1961-02-02")
    print("   Farmer (David): NRC=071186/59/0, DOB=1962-03-03")
    print("   Farmer (Grace): NRC=898722/01/2, DOB=1963-04-04")

if __name__ == "__main__":
    asyncio.run(seed_data())
