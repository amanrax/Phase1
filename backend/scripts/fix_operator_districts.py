#!/usr/bin/env python3
"""
Quick script to assign districts to an operator
Usage: python scripts/fix_operator_districts.py
"""
import asyncio
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


async def fix_operator_districts():
    """Assign districts to operator OP82C9B370"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    operator_id = "OP82C9B370"
    
    # Check current operator data
    operator = await db.operators.find_one({"operator_id": operator_id})
    if not operator:
        print(f"❌ Operator {operator_id} not found!")
        return
    
    print(f"✅ Found operator: {operator.get('full_name')} ({operator.get('email')})")
    print(f"Current assigned_regions: {operator.get('assigned_regions', [])}")
    print(f"Current assigned_districts: {operator.get('assigned_districts', [])}")
    
    # Update with districts
    # You can modify these arrays to assign the districts you want
    assigned_regions = ["Central Province"]  # Example
    assigned_districts = ["Chibombo District"]  # Example - must match the district where farmers are registered
    
    result = await db.operators.update_one(
        {"operator_id": operator_id},
        {"$set": {
            "assigned_regions": assigned_regions,
            "assigned_districts": assigned_districts
        }}
    )
    
    if result.modified_count > 0:
        print(f"\n✅ Updated operator {operator_id}")
        print(f"   - assigned_regions: {assigned_regions}")
        print(f"   - assigned_districts: {assigned_districts}")
    else:
        print(f"\n⚠️  No changes made (data already up to date)")
    
    client.close()


if __name__ == "__main__":
    print("🔧 Fixing operator districts assignment...\n")
    asyncio.run(fix_operator_districts())
    print("\n✅ Done!")
