#!/usr/bin/env python3
"""
Clean and Seed Complete Database
=================================
This script:
1. Audits current data structure
2. Removes old/mismatched data
3. Creates fresh seed data:
   - 1 Admin user
   - 5 Operators (different districts)
   - 5 Farmers per operator (25 total)
4. Saves credentials to a file

Usage:
    python backend/scripts/clean_and_seed_all.py
"""

import sys
import os
import pymongo
import bcrypt
import json
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.utils.crypto_utils import generate_farmer_id, hmac_hash

# MongoDB connection
MONGO_URI = "mongodb://admin:Admin123@localhost:27017/zambian_farmer_db?authSource=admin"

# Zambian districts for operators
DISTRICTS = [
    {"code": "KB", "name": "Kawambwa", "province": "Luapula"},
    {"code": "MF", "name": "Mufumbwe", "province": "North-Western"},
    {"code": "PT", "name": "Petauke", "province": "Eastern"},
    {"code": "KL", "name": "Kalomo", "province": "Southern"},
    {"code": "MP", "name": "Mpika", "province": "Muchinga"}
]

# Sample crops and livestock
CROPS = ["Maize", "Cassava", "Sweet Potatoes", "Groundnuts", "Beans", "Sorghum", "Millet"]
LIVESTOCK = ["Cattle", "Goats", "Chickens", "Pigs", "Sheep"]

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def audit_database(db):
    """Audit current database structure"""
    print("\n" + "="*60)
    print("DATABASE AUDIT")
    print("="*60)
    
    users_count = db.users.count_documents({})
    operators_count = db.operators.count_documents({})
    farmers_count = db.farmers.count_documents({})
    
    print(f"\n📊 Current Counts:")
    print(f"   Users: {users_count}")
    print(f"   Operators: {operators_count}")
    print(f"   Farmers: {farmers_count}")
    
    # Check for issues
    issues = []
    
    # Users with FARMER role but no farmer_id
    users_no_farmer_id = db.users.count_documents({
        "roles": "FARMER",
        "farmer_id": {"$exists": False}
    })
    if users_no_farmer_id > 0:
        issues.append(f"{users_no_farmer_id} users with FARMER role missing farmer_id")
    
    # Operators without assigned_districts
    ops_no_districts = db.operators.count_documents({
        "assigned_districts": {"$exists": False}
    })
    if ops_no_districts > 0:
        issues.append(f"{ops_no_districts} operators without assigned_districts field")
    
    ops_empty_districts = db.operators.count_documents({
        "assigned_districts": []
    })
    if ops_empty_districts > 0:
        issues.append(f"{ops_empty_districts} operators with empty assigned_districts")
    
    # Farmers without farmer_id
    farmers_no_id = db.farmers.count_documents({
        "farmer_id": {"$exists": False}
    })
    if farmers_no_id > 0:
        issues.append(f"{farmers_no_id} farmers without farmer_id")
    
    # Farmers without created_by
    farmers_no_created_by = db.farmers.count_documents({
        "created_by": {"$exists": False}
    })
    if farmers_no_created_by > 0:
        issues.append(f"{farmers_no_created_by} farmers without created_by")
    
    if issues:
        print(f"\n⚠️  Issues Found:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print(f"\n✅ No structural issues found")
    
    return issues

def clean_database(db):
    """Remove all existing data"""
    print("\n" + "="*60)
    print("CLEANING DATABASE")
    print("="*60)
    
    # Drop collections
    result_users = db.users.delete_many({})
    result_operators = db.operators.delete_many({})
    result_farmers = db.farmers.delete_many({})
    
    print(f"\n🗑️  Removed:")
    print(f"   Users: {result_users.deleted_count}")
    print(f"   Operators: {result_operators.deleted_count}")
    print(f"   Farmers: {result_farmers.deleted_count}")
    
    print(f"\n✅ Database cleaned successfully")

def create_admin(db):
    """Create admin user"""
    admin_data = {
        "email": "admin@agrimanage.com",
        "password_hash": hash_password("Admin@123"),
        "roles": ["ADMIN"],
        "is_active": True,
        "full_name": "System Administrator",
        "phone": "+260971000000",
        "created_at": datetime.now(timezone.utc),
        "last_login": None
    }
    
    result = db.users.insert_one(admin_data)
    print(f"\n✅ Admin created: {admin_data['email']}")
    
    return {
        "email": admin_data["email"],
        "password": "Admin@123",
        "role": "ADMIN"
    }

def create_operators(db):
    """Create 5 operators with different districts"""
    operators = []
    credentials = []
    
    print(f"\n" + "="*60)
    print("CREATING OPERATORS")
    print("="*60)
    
    for i, district in enumerate(DISTRICTS, 1):
        email = f"operator{i}@agrimanage.com"
        password = f"Operator{i}@123"
        operator_id = f"OP{district['code']}{i:03d}"
        
        # Create user record
        user_data = {
            "email": email,
            "password_hash": hash_password(password),
            "roles": ["OPERATOR"],
            "is_active": True,
            "full_name": f"Operator {i} - {district['name']}",
            "phone": f"+26097{i:07d}",
            "created_at": datetime.now(timezone.utc),
            "last_login": None
        }
        db.users.insert_one(user_data)
        
        # Create operator record
        operator_data = {
            "operator_id": operator_id,
            "email": email,
            "full_name": f"Operator {i} - {district['name']}",
            "phone": f"+26097{i:07d}",
            "assigned_regions": [district['province']],
            "assigned_districts": [district['name']],
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        db.operators.insert_one(operator_data)
        
        operators.append(operator_data)
        credentials.append({
            "email": email,
            "password": password,
            "role": "OPERATOR",
            "operator_id": operator_id,
            "district": district['name'],
            "province": district['province']
        })
        
        print(f"   ✅ {email} → {district['name']} ({operator_id})")
    
    return operators, credentials

def create_farmers_for_operator(db, operator, operator_num):
    """Create 5 farmers for a specific operator"""
    farmers = []
    credentials = []
    district = operator['assigned_districts'][0]
    district_code = DISTRICTS[operator_num - 1]['code']
    
    for i in range(1, 6):
        # Generate unique farmer data
        first_name = f"Farmer{operator_num}{i}"
        last_name = f"Zimba{operator_num}"
        nrc = f"{100000 + (operator_num * 10) + i}/11/{i}"
        phone = f"+260966{operator_num:01d}{i:05d}"
        email = f"farmer{operator_num}{i}@farm.zm"
        password = f"Farmer{operator_num}{i}@123"
        
        # Generate farmer_id
        farmer_id = generate_farmer_id(nrc)
        
        # Hash NRC for privacy
        nrc_hash = hmac_hash(nrc, salt="nrc")
        
        # Create user record
        user_data = {
            "email": email,
            "password_hash": hash_password(password),
            "roles": ["FARMER"],
            "is_active": True,
            "full_name": f"{first_name} {last_name}",
            "phone": phone,
            "farmer_id": farmer_id,
            "created_at": datetime.now(timezone.utc),
            "last_login": None
        }
        db.users.insert_one(user_data)
        
        # Create farmer record
        farmer_data = {
            "farmer_id": farmer_id,
            "nrc_hash": nrc_hash,
            "registration_status": "verified",
            "created_by": operator['operator_id'],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "is_active": True,
            
            "personal_info": {
                "first_name": first_name,
                "last_name": last_name,
                "phone_primary": phone,
                "phone_secondary": None,
                "email": email,
                "nrc": nrc,  # Stored for admin/operator viewing
                "date_of_birth": f"198{i}-0{operator_num}-15",
                "gender": "Male" if i % 2 == 1 else "Female",
                "ethnic_group": "Bemba"
            },
            
            "address": {
                "province_code": f"P{operator_num:02d}",
                "province_name": operator['assigned_regions'][0],
                "district_code": district_code,
                "district_name": district,
                "chiefdom_code": f"CH{i:03d}",
                "chiefdom_name": f"Chief {i}",
                "village": f"Village {operator_num}{i}",
                "street": f"Farm Road {i}",
                "gps_latitude": -13.0 - (operator_num * 0.1) - (i * 0.01),
                "gps_longitude": 28.0 + (operator_num * 0.1) + (i * 0.01)
            },
            
            "farm_info": {
                "farm_size_hectares": 2.5 + (i * 0.5),
                "crops_grown": CROPS[:(2 + i % 3)],
                "livestock_types": LIVESTOCK[:(1 + i % 2)],
                "has_irrigation": i % 2 == 0,
                "years_farming": 5 + i
            },
            
            "household_info": {
                "household_size": 4 + i,
                "number_of_dependents": 2 + (i % 3),
                "primary_income_source": "Farming"
            },
            
            "documents": {
                "photo": None,
                "nrc_card": None,
                "land_title": None,
                "license": None,
                "certificate": None,
                "qr_code": None
            },
            
            "identification_documents": []
        }
        
        db.farmers.insert_one(farmer_data)
        
        farmers.append(farmer_data)
        credentials.append({
            "email": email,
            "password": password,
            "role": "FARMER",
            "farmer_id": farmer_id,
            "nrc": nrc,
            "name": f"{first_name} {last_name}",
            "operator": operator['email'],
            "district": district
        })
    
    return farmers, credentials

def save_credentials(all_credentials, filename="TEST_CREDENTIALS.json"):
    """Save all credentials to a JSON file"""
    output_path = Path(__file__).parent.parent.parent / filename
    
    output_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_users": len(all_credentials),
        "credentials": all_credentials,
        "summary": {
            "admin": 1,
            "operators": 5,
            "farmers": 25
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n💾 Credentials saved to: {output_path}")
    
    # Also create a simple text version
    text_path = Path(__file__).parent.parent.parent / "TEST_CREDENTIALS.txt"
    with open(text_path, 'w') as f:
        f.write("="*60 + "\n")
        f.write("TEST CREDENTIALS\n")
        f.write("="*60 + "\n\n")
        
        f.write("ADMIN:\n")
        admin = [c for c in all_credentials if c['role'] == 'ADMIN'][0]
        f.write(f"  Email: {admin['email']}\n")
        f.write(f"  Password: {admin['password']}\n\n")
        
        f.write("OPERATORS:\n")
        for cred in [c for c in all_credentials if c['role'] == 'OPERATOR']:
            f.write(f"  {cred['email']} | {cred['password']} | {cred['district']}\n")
        
        f.write("\nFARMERS (grouped by operator):\n")
        current_op = None
        for cred in [c for c in all_credentials if c['role'] == 'FARMER']:
            if cred['operator'] != current_op:
                current_op = cred['operator']
                f.write(f"\n  Under {current_op}:\n")
            f.write(f"    {cred['email']} | {cred['password']} | {cred['farmer_id']}\n")
    
    print(f"💾 Simple text version saved to: {text_path}")

def main():
    print("\n" + "="*60)
    print("ZAMBIAN FARMER SYSTEM - DATABASE CLEAN & SEED")
    print("="*60)
    
    # Connect to MongoDB
    try:
        client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.server_info()  # Test connection
        db = client["zambian_farmer_db"]
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return
    
    # 1. Audit existing data
    issues = audit_database(db)
    
    # 2. Confirm clean
    if issues or db.users.count_documents({}) > 0:
        print(f"\n⚠️  Database contains data. This will DELETE ALL:")
        print(f"   - Users: {db.users.count_documents({})}")
        print(f"   - Operators: {db.operators.count_documents({})}")
        print(f"   - Farmers: {db.farmers.count_documents({})}")
        
        confirm = input("\n❓ Type 'YES' to proceed with cleaning: ")
        if confirm != "YES":
            print("❌ Aborted by user")
            return
    
    # 3. Clean database
    clean_database(db)
    
    # 4. Create seed data
    all_credentials = []
    
    print(f"\n" + "="*60)
    print("CREATING SEED DATA")
    print("="*60)
    
    # Create admin
    admin_cred = create_admin(db)
    all_credentials.append(admin_cred)
    
    # Create operators
    operators, operator_creds = create_operators(db)
    all_credentials.extend(operator_creds)
    
    # Create farmers
    print(f"\n" + "="*60)
    print("CREATING FARMERS")
    print("="*60)
    
    for i, operator in enumerate(operators, 1):
        print(f"\n📍 {operator['assigned_districts'][0]}:")
        farmers, farmer_creds = create_farmers_for_operator(db, operator, i)
        all_credentials.extend(farmer_creds)
        print(f"   ✅ Created 5 farmers under {operator['email']}")
    
    # 5. Save credentials
    save_credentials(all_credentials)
    
    # 6. Final summary
    print(f"\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"   ✅ 1 Admin user")
    print(f"   ✅ 5 Operators (5 districts)")
    print(f"   ✅ 25 Farmers (5 per operator)")
    print(f"   ✅ Total: {db.users.count_documents({})} users")
    print(f"\n   Districts covered:")
    for district in DISTRICTS:
        print(f"      - {district['name']} ({district['province']})")
    
    print(f"\n" + "="*60)
    print("✅ DATABASE SEEDING COMPLETE!")
    print("="*60)
    print(f"\n📄 Check TEST_CREDENTIALS.json and TEST_CREDENTIALS.txt for login details")

if __name__ == "__main__":
    main()
