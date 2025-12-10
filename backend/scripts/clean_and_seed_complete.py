#!/usr/bin/env python3
"""
Complete Database Cleanup and Seeding Script
============================================
1. Audit all collections against current schema
2. Clean up mismatched/invalid data
3. Create fresh hierarchy:
   - 1 Admin
   - 5 Operators (different districts)
   - 5 Farmers per operator (25 total)
4. Save credentials to file
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId
import bcrypt  # still used for direct checks if needed
import secrets
import hashlib
import hmac

# ============================================
# Use application settings & crypto utilities
# ============================================
try:
    from app.config import settings
    from app.utils.crypto_utils import generate_farmer_id, hmac_hash
except Exception as e:
    print(f"Warning: failed to import app settings/crypto utils: {e}")
    settings = None
    # Fallback implementations (only if running outside container)
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_agrimanage_2025")
    def generate_farmer_id(nrc: str) -> str:
        hash_digest = hashlib.sha256(f"{SECRET_KEY}{nrc}".encode()).hexdigest()
        return f"ZM{hash_digest[:8].upper()}"
    def hmac_hash(data: str, salt: str = "") -> str:
        key = f"{SECRET_KEY}{salt}".encode()
        return hmac.new(key, data.encode(), hashlib.sha256).hexdigest()

# ============================================
# Configuration (prefer app settings / .env)
# ============================================
MONGO_URL = (settings.MONGODB_URL if settings else os.getenv("MONGODB_URL", "mongodb://admin:Admin123@farmer-mongo:27017/zambian_farmer_db?authSource=admin"))
DB_NAME = (settings.MONGODB_DB_NAME if settings else os.getenv("MONGODB_DB_NAME", "zambian_farmer_db"))

# District assignments for operators
OPERATOR_DISTRICTS = [
    {"name": "Kawambwa District", "province": "Luapula", "code": "0701"},
    {"name": "Mansa District", "province": "Luapula", "code": "0702"},
    {"name": "Nchelenge District", "province": "Luapula", "code": "0703"},
    {"name": "Mwense District", "province": "Luapula", "code": "0704"},
    {"name": "Samfya District", "province": "Luapula", "code": "0705"}
]

# Sample villages per district
VILLAGES_BY_DISTRICT = {
    "Kawambwa District": ["Chisenga", "Mbereshi", "Kawambwa Central", "Chipili", "Lunga"],
    "Mansa District": ["Mansa Central", "Chembe", "Mansa Boma", "Kaluba", "Nsumbu"],
    "Nchelenge District": ["Kashikishi", "Nchelenge Boma", "Mofwe", "Kaputa", "Lunchinda"],
    "Mwense District": ["Mwense Boma", "Mambilima", "Chiundaponde", "Kabungo", "Chisomo"],
    "Samfya District": ["Samfya Boma", "Mulilansolo", "Kashiba", "Chimbafwi", "Mansa Peri"]
}

# Sample crops
ZAMBIAN_CROPS = ["Maize", "Cassava", "Sweet Potato", "Groundnuts", "Sorghum", "Millet", "Beans", "Sunflower"]
LIVESTOCK = ["Cattle", "Goats", "Chickens", "Pigs", "Ducks"]

# ============================================
# Helper Functions
# ============================================
# Use application hashing (passlib CryptContext) for compatibility with verify_password
try:
    from app.utils.security import hash_password  # inside container this is available
except Exception:
    # Fallback (should not normally be used when running inside backend container)
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def generate_operator_id() -> str:
    """Generate unique operator ID"""
    return f"OP{secrets.token_hex(4).upper()}"


def generate_phone(base: str = "977") -> str:
    """Generate valid Zambian phone number"""
    suffix = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    return f"+260{base}{suffix}"


def generate_nrc() -> str:
    """Generate fake but valid-format NRC"""
    num = secrets.randbelow(999999)
    district = secrets.randbelow(88) + 1
    check = secrets.randbelow(9)
    return f"{num:06d}/{district:02d}/{check}"


# ============================================
# Main Script
# ============================================
async def main():
    print("="*60)
    print("DATABASE CLEANUP AND SEEDING")
    print("="*60)
    
    # Connect to MongoDB
    print("\n[1/6] Connecting to MongoDB...")
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Test connection
        db.command('ping')
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return
    
    # ============================================
    # STEP 1: Audit current data
    # ============================================
    print("\n[2/6] Auditing current data...")
    
    users_count = db.users.count_documents({})
    operators_count = db.operators.count_documents({})
    farmers_count = db.farmers.count_documents({})
    
    print(f"   📊 Current counts:")
    print(f"      - Users: {users_count}")
    print(f"      - Operators: {operators_count}")
    print(f"      - Farmers: {farmers_count}")
    
    # Check for schema mismatches
    print("\n   🔍 Checking for schema issues...")
    
    # Check users
    users_no_roles = db.users.count_documents({"roles": {"$exists": False}})
    users_bad_roles = db.users.count_documents({"roles": {"$not": {"$type": "array"}}})
    print(f"      - Users without roles: {users_no_roles}")
    print(f"      - Users with bad role format: {users_bad_roles}")
    
    # Check operators
    operators_no_id = db.operators.count_documents({"operator_id": {"$exists": False}})
    operators_no_districts = db.operators.count_documents({"assigned_districts": {"$exists": False}})
    print(f"      - Operators without operator_id: {operators_no_id}")
    print(f"      - Operators without assigned_districts: {operators_no_districts}")
    
    # Check farmers
    farmers_no_id = db.farmers.count_documents({"farmer_id": {"$exists": False}})
    farmers_no_personal = db.farmers.count_documents({"personal_info": {"$exists": False}})
    farmers_no_address = db.farmers.count_documents({"address": {"$exists": False}})
    print(f"      - Farmers without farmer_id: {farmers_no_id}")
    print(f"      - Farmers without personal_info: {farmers_no_personal}")
    print(f"      - Farmers without address: {farmers_no_address}")
    
    # ============================================
    # STEP 2: Cleanup
    # ============================================
    print("\n[3/6] Cleaning up mismatched data...")
    
    cleanup_confirm = input("\n⚠️  This will DELETE all existing data. Continue? (yes/no): ")
    if cleanup_confirm.lower() != 'yes':
        print("❌ Cleanup cancelled by user")
        return
    
    # Drop all collections
    print("   🗑️  Dropping collections...")
    db.users.delete_many({})
    db.operators.delete_many({})
    db.farmers.delete_many({})
    
    print("✅ All collections cleaned")
    
    # ============================================
    # STEP 3: Create Admin
    # ============================================
    print("\n[4/6] Creating Admin user...")
    
    admin_email = "admin@ziamis.mwasree.zm"
    admin_password = "Admin@2024"
    
    admin_doc = {
        "email": admin_email,
        "password_hash": hash_password(admin_password),
        "roles": ["ADMIN"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "full_name": "System Administrator",
        "phone": "+260977000001"
    }
    
    result = db.users.insert_one(admin_doc)
    print(f"✅ Admin created: {admin_email}")
    
    # ============================================
    # STEP 4: Create Operators
    # ============================================
    print("\n[5/6] Creating 5 Operators...")
    
    operators_data = []
    
    for idx, district_info in enumerate(OPERATOR_DISTRICTS, 1):
        operator_id = generate_operator_id()
        email = f"operator{idx}@ziamis.mwasree.zm"
        password = f"Operator{idx}@2024"
        full_name = f"Operator {district_info['name'].split()[0]}"
        
        # Create user account
        user_doc = {
            "email": email,
            "password_hash": hash_password(password),
            "roles": ["OPERATOR"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "full_name": full_name,
            "phone": generate_phone(f"97{idx}")
        }
        db.users.insert_one(user_doc)
        
        # Create operator profile
        operator_doc = {
            "operator_id": operator_id,
            "email": email,
            "full_name": full_name,
            "phone": user_doc["phone"],
            "assigned_regions": [district_info["province"]],
            "assigned_districts": [district_info["name"]],
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        db.operators.insert_one(operator_doc)
        
        operators_data.append({
            "operator_id": operator_id,
            "email": email,
            "password": password,
            "district": district_info["name"],
            "province": district_info["province"]
        })
        
        print(f"   ✅ Operator {idx}: {email} → {district_info['name']}")
    
    # ============================================
    # STEP 5: Create Farmers (5 per operator)
    # ============================================
    print("\n[6/6] Creating 25 Farmers (5 per operator)...")
    
    farmers_data = []
    farmer_counter = 1
    
    first_names = ["John", "Mary", "David", "Grace", "Peter", "Sarah", "Moses", "Ruth", "James", "Alice"]
    last_names = ["Banda", "Mwale", "Phiri", "Chanda", "Tembo", "Zulu", "Mulenga", "Lungu", "Sakala", "Mumba"]
    
    for operator in operators_data:
        district_name = operator["district"]
        operator_id = operator["operator_id"]
        operator_email = operator["email"]
        villages = VILLAGES_BY_DISTRICT.get(district_name, ["Village A", "Village B", "Village C", "Village D", "Village E"])
        
        for farmer_idx in range(5):
            # Generate farmer data
            first_name = first_names[farmer_counter % len(first_names)]
            last_name = last_names[farmer_counter % len(last_names)]
            nrc = generate_nrc()
            email = f"farmer{farmer_counter:02d}@ziamis.mwasree.zm"
            password = f"Farmer{farmer_counter:02d}@2024"
            farmer_id = generate_farmer_id(nrc)
            phone = generate_phone("96" + str(farmer_counter % 10))
            
            # Create user account for farmer
            user_doc = {
                "email": email,
                "password_hash": hash_password(password),
                "roles": ["FARMER"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "full_name": f"{first_name} {last_name}",
                "phone": phone,
                "farmer_id": farmer_id  # Link to farmer profile
            }
            db.users.insert_one(user_doc)
            
            # Create farmer profile
            district_code = OPERATOR_DISTRICTS[(farmer_counter - 1) // 5]["code"]
            village = villages[farmer_idx % len(villages)]
            
            farmer_doc = {
                "farmer_id": farmer_id,
                "nrc_hash": hmac_hash(nrc, salt="nrc"),
                "registration_status": "verified",
                "created_by": operator_email,
                "created_at": datetime.now(timezone.utc),
                "is_active": True,
                "personal_info": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone_primary": phone,
                    "phone_secondary": None,
                    "email": email,
                    "nrc": nrc,
                    "date_of_birth": f"19{60 + (farmer_counter % 30)}-{1 + (farmer_counter % 12):02d}-{1 + (farmer_counter % 28):02d}",
                    "gender": "Male" if farmer_counter % 2 == 0 else "Female",
                    "ethnic_group": "Bemba"
                },
                "address": {
                    "province_code": district_code[:2],
                    "province_name": operator["province"],
                    "district_code": district_code,
                    "district_name": district_name,
                    "chiefdom_code": "",
                    "chiefdom_name": "",
                    "village": village,
                    "street": None,
                    "gps_latitude": -11.0 - (farmer_counter * 0.01),
                    "gps_longitude": 29.0 + (farmer_counter * 0.01)
                },
                "farm_info": {
                    "farm_size_hectares": round(2.0 + (farmer_counter % 10) * 0.5, 1),
                    "crops_grown": ZAMBIAN_CROPS[:(3 + farmer_counter % 4)],
                    "livestock_types": LIVESTOCK[:(2 + farmer_counter % 3)],
                    "has_irrigation": farmer_counter % 3 == 0,
                    "years_farming": 5 + (farmer_counter % 20)
                },
                "household_info": {
                    "household_size": 4 + (farmer_counter % 5),
                    "number_of_dependents": 2 + (farmer_counter % 4),
                    "primary_income_source": "Farming"
                },
                "documents": {
                    "photo": None,
                    "nrc_card": None,
                    "land_title": None,
                    "license": None,
                    "certificate": None,
                    "qr_code": None
                }
            }
            
            db.farmers.insert_one(farmer_doc)
            
            farmers_data.append({
                "farmer_id": farmer_id,
                "email": email,
                "password": password,
                "name": f"{first_name} {last_name}",
                "nrc": nrc,
                "district": district_name,
                "operator": operator_email
            })
            
            print(f"   ✅ Farmer {farmer_counter:02d}: {email} → {district_name} ({village})")
            farmer_counter += 1
    
    # ============================================
    # STEP 6: Save Credentials
    # ============================================
    print("\n[7/7] Saving credentials to file...")
    
    credentials_file = Path(__file__).parent.parent.parent / "SEEDED_CREDENTIALS.txt"
    
    with open(credentials_file, 'w') as f:
        f.write("="*70 + "\n")
        f.write("ZIAMIS DATABASE CREDENTIALS\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("="*70 + "\n\n")
        
        # Admin
        f.write("ADMIN ACCOUNT\n")
        f.write("-" * 70 + "\n")
        f.write(f"Email:    {admin_email}\n")
        f.write(f"Password: {admin_password}\n")
        f.write(f"Roles:    ADMIN\n\n")
        
        # Operators
        f.write("\nOPERATORS (5)\n")
        f.write("-" * 70 + "\n")
        for idx, op in enumerate(operators_data, 1):
            f.write(f"\nOperator {idx}:\n")
            f.write(f"  Operator ID: {op['operator_id']}\n")
            f.write(f"  Email:       {op['email']}\n")
            f.write(f"  Password:    {op['password']}\n")
            f.write(f"  District:    {op['district']}\n")
            f.write(f"  Province:    {op['province']}\n")
        
        # Farmers
        f.write("\n\nFARMERS (25 total - 5 per operator)\n")
        f.write("-" * 70 + "\n")
        
        for idx, farmer in enumerate(farmers_data, 1):
            f.write(f"\nFarmer {idx:02d}:\n")
            f.write(f"  Farmer ID:   {farmer['farmer_id']}\n")
            f.write(f"  Name:        {farmer['name']}\n")
            f.write(f"  Email:       {farmer['email']}\n")
            f.write(f"  Password:    {farmer['password']}\n")
            f.write(f"  NRC:         {farmer['nrc']}\n")
            f.write(f"  District:    {farmer['district']}\n")
            f.write(f"  Operator:    {farmer['operator']}\n")
    
    print(f"✅ Credentials saved to: {credentials_file}")
    
    # ============================================
    # Summary
    # ============================================
    print("\n" + "="*70)
    print("✅ DATABASE SEEDING COMPLETE!")
    print("="*70)
    print(f"\n📊 Final counts:")
    print(f"   - Admin:     1")
    print(f"   - Operators: 5")
    print(f"   - Farmers:   25")
    print(f"\n📄 Credentials file: {credentials_file}")
    print("\n🔐 Quick test logins:")
    print(f"   Admin:     {admin_email} / {admin_password}")
    print(f"   Operator:  {operators_data[0]['email']} / {operators_data[0]['password']}")
    print(f"   Farmer:    {farmers_data[0]['email']} / {farmers_data[0]['password']}")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
