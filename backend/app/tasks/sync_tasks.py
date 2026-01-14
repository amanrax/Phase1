from celery import shared_task
from pymongo import MongoClient
from datetime import datetime
from uuid import uuid4
from app.config import settings
from app.services.farmer_service import FarmerService


MONGODB_URL = settings.MONGODB_URL or "mongodb+srv://cemdb_admin:Cem@2025@farmer.5oixrfr.mongodb.net/?retryWrites=truemongodb://mongo:27017w=majoritymongodb://mongo:27017appName=farmer"
MONGODB_DB_NAME = settings.MONGODB_DB_NAME or "zambian_farmer_db"


def get_db_sync():
    """Create synchronous MongoDB client for Celery tasks."""
    client = MongoClient(MONGODB_URL)
    return client[MONGODB_DB_NAME]


@shared_task(bind=True, name="app.tasks.sync_tasks.process_sync_batch")
def process_sync_batch(self, user_email, records):
    """
    Process batch sync of farmer records.

    Args:
        user_email (str): Email of the user performing the sync
        records (List[dict]): List of farmer records (each with optional temp_id and farmer data)

    Returns:
        dict: Job ID and list of results per record with status
    """
    db = get_db_sync()
    farmers_coll = db.farmers
    out_results = []
    now = datetime.utcnow()

    for rec in records:
        temp_id = rec.get("temp_id")
        try:
            # 1. Validate data fields - raises HTTPException on errors
            FarmerService.validate_farmer_data(rec)

            # 2. Encrypt sensitive fields (e.g., NRC)
            rec = FarmerService.encrypt_sensitive_fields(rec)
        except Exception as e:
            out_results.append({
                "temp_id": temp_id,
                "farmer_id": None,
                "status": "error",
                "errors": [str(e)]
            })
            continue

        # 3. Deduplication query logic
        query = {}
        if temp_id:
            query = {"temp_id": temp_id}
        elif rec.get("nrc_hash"):
            query = {"nrc_hash": rec["nrc_hash"]}
        elif rec.get("personal_info", {}).get("phone_primary"):
            query = {"personal_info.phone_primary": rec["personal_info"]["phone_primary"]}

        existing = farmers_coll.find_one(query) if query else None

        if existing:
            # 4. Update existing record
            rec["updated_at"] = now
            rec["last_modified_by"] = user_email
            farmers_coll.update_one({"_id": existing["_id"]}, {"$set": rec})
            out_results.append({
                "temp_id": temp_id,
                "farmer_id": existing.get("farmer_id"),
                "status": "updated",
                "errors": []
            })
        else:
            # 5. Create new farmer record with generated farmer_id if none provided
            rec["farmer_id"] = rec.get("farmer_id") or ("ZM" + uuid4().hex[:8].upper())
            rec["created_at"] = now
            rec["created_by"] = user_email
            farmers_coll.insert_one(rec)
            out_results.append({
                "temp_id": temp_id,
                "farmer_id": rec["farmer_id"],
                "status": "created",
                "errors": []
            })

    return {"job_id": self.request.id, "results": out_results}
