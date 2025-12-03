from datetime import datetime, timedelta

from pymongo import MongoClient

from app.config import settings

# Celery app import pattern consistent with existing tasks
from app.tasks.celery_app import celery

LOG_COLLECTION = "system_logs"


@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Run daily at midnight
    sender.add_periodic_task(
        24 * 60 * 60,
        cleanup_logs.s(),
        name="Cleanup system logs daily",
    )


@celery.task
def cleanup_logs():
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    coll = db[LOG_COLLECTION]

    now = datetime.utcnow()
    cutoff_24h = now - timedelta(days=1)
    cutoff_7d = now - timedelta(days=7)

    # Delete non-error logs older than 24 hours
    result_info = coll.delete_many({
        "timestamp": {"$lt": cutoff_24h},
        "level": {"$nin": ["ERROR", "CRITICAL"]},
    })

    # Delete ERROR/CRITICAL older than 7 days
    result_errors = coll.delete_many({
        "timestamp": {"$lt": cutoff_7d},
        "level": {"$in": ["ERROR", "CRITICAL"]},
    })

    # Log the cleanup action itself
    coll.insert_one({
        "timestamp": now,
        "level": "INFO",
        "module": "log_cleanup_task",
        "endpoint": None,
        "user_id": None,
        "role": "system",
        "action": "cleanup",
        "details": {
            "deleted_info": result_info.deleted_count,
            "deleted_errors": result_errors.deleted_count,
        },
        "ip_address": None,
        "request_id": "log-cleanup",
        "duration_ms": None,
    })

    client.close()
