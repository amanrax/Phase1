# backend/app/tasks/celery_app.py
import os
from celery import Celery

# Retrieve Redis URL from environment variable or default
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Initialize Celery app
celery_app = Celery("farmer_sync", broker=REDIS_URL, backend=REDIS_URL)

# Configure task autodiscovery
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    imports=[
        'app.tasks.sync_tasks',
        'app.tasks.id_card_task',
    ]
)

# Optional: route tasks to specific queues for better load management
celery_app.conf.task_routes = {
    "app.tasks.id_card_task.generate_id_card": {"queue": "celery"},
    # Add more routes as needed
}
