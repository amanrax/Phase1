import asyncio
import sys
sys.path.append('/app')

from app.config import settings
from motor.motor_asyncio import AsyncIOMotorClient

async def check_farmers():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Get the two farmers by farmer_id
    farmer_ids = ["ZM38228A63", "ZM0E5AC728"]
    
    for farmer_id in farmer_ids:
        farmer = await db.farmers.find_one({"farmer_id": farmer_id})
        if farmer:
            print(f"\n{'='*60}")
            print(f"Farmer ID: {farmer_id}")
            print(f"Name: {farmer.get('personal_info', {}).get('full_name', 'N/A')}")
            print(f"\nPersonal Info:")
            personal_info = farmer.get('personal_info', {})
            for key, value in personal_info.items():
                print(f"  {key}: {value}")
            
            print(f"\nFull Document Keys: {list(farmer.keys())}")
        else:
            print(f"\n❌ Farmer {farmer_id} not found")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_farmers())
