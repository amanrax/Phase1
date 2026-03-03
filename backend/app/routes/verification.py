# backend/app/routes/verification.py
# Document verification and farmer status management endpoints (P2)
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
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
    result = await verify_document(
        farmer_id=farmer_id,
        doc_type=doc_type,
        reviewer_id=current_user.get("user_id", current_user.get("id", "unknown")),
        reviewer_role=current_user.get("role", "unknown"),
        db=db,
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
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
