from celery import shared_task
from pymongo import MongoClient
from datetime import datetime, timezone
from uuid import uuid4
from app.config import settings
from app.utils.crypto_utils import hmac_hash


MONGODB_URL = settings.MONGODB_URL or "mongodb://mongo:27017"
MONGODB_DB_NAME = settings.MONGODB_DB_NAME or "zambian_farmer_db"


def _validate_sync_record(rec: dict) -> None:
    """Lightweight validation for sync payload records."""
    if not isinstance(rec.get("personal_info"), dict):
        raise ValueError("personal_info is required and must be an object")
    if not isinstance(rec.get("address"), dict):
        raise ValueError("address is required and must be an object")


def _prepare_sensitive_fields(rec: dict) -> dict:
    """Attach derived hash fields used for deduplication/lookups."""
    out = dict(rec)
    personal = out.get("personal_info") or {}
    nrc = personal.get("nrc") or out.get("nrc_number")
    if nrc:
        out["nrc_hash"] = hmac_hash(str(nrc), salt="nrc")
    return out


def _to_naive_utc(dt: datetime) -> datetime:
    """Normalize datetime to naive UTC for consistent comparisons."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _parse_client_updated_at(rec: dict) -> datetime | None:
    """Parse optional client_updated_at ISO string into naive UTC datetime."""
    raw = rec.get("client_updated_at")
    if not raw:
        return None
    if not isinstance(raw, str):
        raise ValueError("client_updated_at must be an ISO datetime string")
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("client_updated_at is not a valid ISO datetime") from exc
    return _to_naive_utc(parsed)


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
            # 1. Validate required fields
            _validate_sync_record(rec)

            # 2. Prepare derived sensitive fields (e.g., nrc_hash)
            rec = _prepare_sensitive_fields(rec)
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
            client_updated_at = _parse_client_updated_at(rec)
            server_updated_at = existing.get("updated_at") or existing.get("created_at")
            if isinstance(server_updated_at, datetime):
                server_updated_at = _to_naive_utc(server_updated_at)

            # If server has newer data than client payload, reject as conflict.
            if (
                isinstance(server_updated_at, datetime)
                and isinstance(client_updated_at, datetime)
                and server_updated_at > client_updated_at
            ):
                db.system_logs.insert_one({
                    "timestamp": datetime.utcnow(),
                    "level": "WARNING",
                    "module": "sync_tasks.process_sync_batch",
                    "action": "sync_conflict",
                    "user_id": user_email,
                    "farmer_id": existing.get("farmer_id"),
                    "temp_id": temp_id,
                    "message": "Sync conflict: server record newer than client payload",
                    "server_updated_at": server_updated_at,
                    "client_updated_at": client_updated_at,
                })
                out_results.append({
                    "temp_id": temp_id,
                    "farmer_id": existing.get("farmer_id"),
                    "status": "conflict",
                    "errors": ["Server has newer data. Please refresh before syncing."],
                })
                continue

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
