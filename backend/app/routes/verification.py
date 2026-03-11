# backend/app/routes/verification.py
# Document verification and farmer status management endpoints (P2)
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.dependencies.roles import require_role
from app.services.verification_service import (
    get_farmer_documents,
    verify_document,
    reject_document,
    update_farmer_verification_status,
)

router = APIRouter(prefix="/farmers", tags=["Verification"])


# ─── Request models ────────────────────────────────────────────────────────────

class RejectDocumentRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Reason for rejection")


class UpdateStatusRequest(BaseModel):
    status: str = Field(..., description="New verification status")
    notes: Optional[str] = Field(None, description="Optional review notes")


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/{farmer_id}/documents",
    summary="List farmer documents with per-document verification status",
    dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))],
)
async def list_farmer_documents(
    farmer_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Return all documents for a farmer with their approval/rejection status."""
    result = await get_farmer_documents(farmer_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return result


async def _check_operator_farmer_access(farmer_id: str, current_user: dict, db) -> None:
    """Raise 403 if an OPERATOR is trying to act on a farmer not in their assigned districts."""
    roles = current_user.get("roles", [])
    if "ADMIN" in roles:
        return  # Admins can access any farmer
    if "OPERATOR" not in roles:
        raise HTTPException(status_code=403, detail="Access denied.")
    user_email = current_user.get("email")
    op_doc = await db.operators.find_one({"email": user_email})
    assigned_districts = (op_doc or {}).get("assigned_districts", [])
    farmer = await db.farmers.find_one({"farmer_id": farmer_id}, {"address.district_name": 1, "created_by": 1})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    farmer_district = (farmer.get("address") or {}).get("district_name")
    operator_id = (op_doc or {}).get("operator_id")
    created_by = farmer.get("created_by")
    if farmer_district and assigned_districts and farmer_district in assigned_districts:
        return
    if operator_id and created_by and created_by == operator_id:
        return
    raise HTTPException(status_code=403, detail="Access denied: this farmer is not in your assigned districts.")


@router.post(
    "/{farmer_id}/documents/{doc_type}/verify",
    summary="Approve a document",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))],
)
async def approve_document(
    farmer_id: str,
    doc_type: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Mark a specific document as approved."""
    await _check_operator_farmer_access(farmer_id, current_user, db)
    result = await verify_document(
        farmer_id=farmer_id,
        doc_type=doc_type,
        reviewer_id=current_user.get("user_id", current_user.get("id", "unknown")),
        reviewer_role=current_user.get("role", "unknown"),
        db=db,
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # TC-157 — notify farmer that a document was approved
    await db.notifications.insert_one({
        "user_id": farmer_id,
        "user_type": "farmer",
        "type": "document_approved",
        "title": "Document approved",
        "body": f"Your {doc_type.replace('_', ' ')} document has been approved.",
        "read": False,
        "created_at": datetime.now(timezone.utc),
        "expires_at": None,
    })

    return result


@router.post(
    "/{farmer_id}/documents/{doc_type}/reject",
    summary="Reject a document with a reason",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))],
)
async def reject_document_endpoint(
    farmer_id: str,
    doc_type: str,
    body: RejectDocumentRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Mark a specific document as rejected with a reason."""
    await _check_operator_farmer_access(farmer_id, current_user, db)
    result = await reject_document(
        farmer_id=farmer_id,
        doc_type=doc_type,
        reason=body.reason,
        reviewer_id=current_user.get("user_id", current_user.get("id", "unknown")),
        reviewer_role=current_user.get("role", "unknown"),
        db=db,
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # TC-157 — notify farmer that a document was rejected
    await db.notifications.insert_one({
        "user_id": farmer_id,
        "user_type": "farmer",
        "type": "document_rejected",
        "title": "Document rejected",
        "body": f"Your {doc_type.replace('_', ' ')} document was rejected. Reason: {body.reason}",
        "read": False,
        "created_at": datetime.now(timezone.utc),
        "expires_at": None,
    })

    return result


@router.post(
    "/{farmer_id}/status",
    summary="Update farmer verification status",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))],
)
async def update_status(
    farmer_id: str,
    body: UpdateStatusRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"])),
):
    """Update the farmer's overall verification/registration status."""
    result = await update_farmer_verification_status(
        farmer_id=farmer_id,
        new_status=body.status,
        reviewer_id=current_user.get("user_id", current_user.get("id", "unknown")),
        reviewer_role=current_user.get("role", "unknown"),
        notes=body.notes,
        db=db,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
