# backend/app/services/verification_service.py
# Document verification and farmer status management service (P2)
from datetime import datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase


VALID_DOC_STATUSES = {"pending", "approved", "rejected"}
VALID_FARMER_STATUSES = {
    "registered", "documents_uploaded", "under_review",
    "verified", "rejected", "incomplete",
}


async def get_farmer_documents(farmer_id: str, db: AsyncIOMotorDatabase) -> dict:
    """
    Return all documents attached to a farmer with their per-document status.
    Creates a document_statuses dict if none exists yet.
    """
    farmer = await db.farmers.find_one(
        {"farmer_id": farmer_id},
        {"farmer_id": 1, "identification_documents": 1, "documents": 1,
         "document_statuses": 1, "registration_status": 1, "verification_status": 1, "_id": 0},
    )
    if not farmer:
        return None  # type: ignore[return-value]

    # Normalise: build a list of known doc slots from the documents dict
    docs_dict = farmer.get("documents") or {}
    id_docs = farmer.get("identification_documents") or []

    doc_statuses = farmer.get("document_statuses", {})

    doc_list = []
    for slot in ["photo", "nrc", "land_title", "license", "certificate"]:
        url = docs_dict.get(slot) or docs_dict.get(f"{slot}_file_id")
        if url:
            doc_list.append({
                "doc_type": slot,
                "url": url,
                "status": doc_statuses.get(slot, "pending"),
                "rejection_reason": doc_statuses.get(f"{slot}_rejection_reason"),
            })

    for doc in id_docs:
        dtype = doc.get("doc_type", "unknown")
        doc_list.append({
            "doc_type": dtype,
            "url": doc.get("file_path"),
            "status": doc_statuses.get(dtype, "pending"),
            "rejection_reason": doc_statuses.get(f"{dtype}_rejection_reason"),
            "uploaded_at": doc.get("uploaded_at"),
        })

    return {
        "farmer_id": farmer_id,
        "registration_status": farmer.get("registration_status", "registered"),
        "verification_status": farmer.get("verification_status"),
        "documents": doc_list,
    }


async def verify_document(
    farmer_id: str,
    doc_type: str,
    reviewer_id: str,
    reviewer_role: str,
    db: AsyncIOMotorDatabase,
) -> dict:
    """Mark a single document as approved."""
    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        return {"error": "Farmer not found"}

    update_key = f"document_statuses.{doc_type}"
    await db.farmers.update_one(
        {"farmer_id": farmer_id},
        {
            "$set": {
                update_key: "approved",
                f"document_statuses.{doc_type}_reviewed_by": reviewer_id,
                f"document_statuses.{doc_type}_reviewed_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    # Log the action in system_logs
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "module": "verification_service",
        "action": "document_approved",
        "user_id": reviewer_id,
        "role": reviewer_role,
        "details": {"farmer_id": farmer_id, "doc_type": doc_type},
    })

    return {"farmer_id": farmer_id, "doc_type": doc_type, "status": "approved"}


async def reject_document(
    farmer_id: str,
    doc_type: str,
    reason: str,
    reviewer_id: str,
    reviewer_role: str,
    db: AsyncIOMotorDatabase,
) -> dict:
    """Mark a single document as rejected with a reason."""
    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        return {"error": "Farmer not found"}

    await db.farmers.update_one(
        {"farmer_id": farmer_id},
        {
            "$set": {
                f"document_statuses.{doc_type}": "rejected",
                f"document_statuses.{doc_type}_rejection_reason": reason,
                f"document_statuses.{doc_type}_reviewed_by": reviewer_id,
                f"document_statuses.{doc_type}_reviewed_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "module": "verification_service",
        "action": "document_rejected",
        "user_id": reviewer_id,
        "role": reviewer_role,
        "details": {"farmer_id": farmer_id, "doc_type": doc_type, "reason": reason},
    })

    return {"farmer_id": farmer_id, "doc_type": doc_type, "status": "rejected", "reason": reason}


async def update_farmer_verification_status(
    farmer_id: str,
    new_status: str,
    reviewer_id: str,
    reviewer_role: str,
    notes: Optional[str],
    db: AsyncIOMotorDatabase,
) -> dict:
    """
    Update the farmer's top-level verification_status and registration_status.
    On 'verified': triggers Celery ID-card regeneration task.
    """
    if new_status not in VALID_FARMER_STATUSES:
        return {"error": f"Invalid status. Must be one of: {', '.join(VALID_FARMER_STATUSES)}"}

    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        return {"error": "Farmer not found"}

    update_fields: dict = {
        "verification_status": new_status,
        "updated_at": datetime.utcnow(),
        "reviewed_by": reviewer_id,
        "reviewed_at": datetime.utcnow().isoformat(),
    }

    # Mirror to registration_status for backward compatibility
    if new_status in {"verified", "rejected", "under_review"}:
        update_fields["registration_status"] = new_status

    if notes is not None:
        update_fields["review_notes"] = notes

    await db.farmers.update_one({"farmer_id": farmer_id}, {"$set": update_fields})

    # Append to status_history for audit trail
    await db.farmers.update_one(
        {"farmer_id": farmer_id},
        {"$push": {"status_history": {
            "status": new_status,
            "changed_by": reviewer_id,
            "role": reviewer_role,
            "notes": notes,
            "timestamp": datetime.utcnow().isoformat(),
        }}}
    )

    # On verified: queue Celery ID card regeneration task
    if new_status == "verified":
        try:
            from app.tasks.id_card_task import generate_id_card
            generate_id_card.delay(farmer_id)
        except Exception:
            pass  # Non-blocking: ID card regeneration is best-effort

    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "module": "verification_service",
        "action": "farmer_status_updated",
        "user_id": reviewer_id,
        "role": reviewer_role,
        "details": {
            "farmer_id": farmer_id,
            "new_status": new_status,
            "notes": notes,
        },
    })

    return {
        "farmer_id": farmer_id,
        "verification_status": new_status,
        "reviewed_by": reviewer_id,
    }
