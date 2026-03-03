# backend/app/tasks/log_cleanup_task.py
# Celery beat task: deletes system_logs older than 7 days — runs daily at 02:00 UTC
from datetime import datetime, timedelta

from pymongo import MongoClient

from app.config import settings
from app.tasks.celery_app import celery_app

LOG_COLLECTION = "system_logs"
RETENTION_DAYS = 7


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Run daily at 02:00 UTC via crontab schedule
    from celery.schedules import crontab
    sender.add_periodic_task(
        crontab(hour=2, minute=0),
        cleanup_logs.s(),
        name="Cleanup system logs daily at 02:00 UTC",
    )


@celery_app.task
def cleanup_logs():
    """Delete all system_logs older than RETENTION_DAYS (7 days). Uses pymongo (sync)."""
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    coll = db[LOG_COLLECTION]

    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)

    result = coll.delete_many({"timestamp": {"$lt": cutoff}})

    # Log the cleanup action itself
    coll.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "module": "log_cleanup_task",
        "endpoint": None,
        "user_id": None,
        "role": "system",
        "action": "cleanup",
        "details": {
            "deleted_count": result.deleted_count,
            "cutoff_date": cutoff.isoformat(),
            "retention_days": RETENTION_DAYS,
        },
        "ip_address": None,
        "request_id": "log-cleanup",
        "duration_ms": None,
    })

    client.close()
    return {"deleted": result.deleted_count}

