# backend/app/routes/farmers_qr.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from app.utils.security import verify_qr_signature
from app.database import get_db, AsyncIOMotorDatabase
from app.dependencies.roles import require_role
from app.services.idcard_service import IDCardService
from typing import Dict

import os

router = APIRouter(prefix="/farmers", tags=["Farmers QR & ID"])


@router.post("/verify-qr")
async def verify_qr(payload: Dict, db=Depends(get_db)):
    """Verify a QR payload signed with server secret."""
    farmer_id = payload.get("farmer_id")
    timestamp = payload.get("timestamp")
    signature = payload.get("signature")

    if not farmer_id or not timestamp or not signature:
        raise HTTPException(status_code=400, detail="Missing fields in payload")

    if not verify_qr_signature(payload):
        raise HTTPException(status_code=400, detail="Invalid or tampered QR signature")

    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    return {
        "verified": True,
        "farmer_id": farmer_id,
        "name": f"{farmer['personal_info']['first_name']} {farmer['personal_info']['last_name']}",
        "province": farmer["address"].get("province_name"),
        "district": farmer["address"].get("district_name"),
    }


@router.post(
    "/{farmer_id}/generate-idcard",
    summary="Generate farmer ID card asynchronously",
    description="Queue ID card generation task for the farmer. Admin/Operator/Farmer allowed.",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=dict
)
async def generate_idcard(
    farmer_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))
):
    """
    Generate ID card PDF asynchronously for a farmer.
    Farmers can generate their own cards.
    
    Args:
        farmer_id: Unique farmer ID string (e.g., ZM1A2B3C4D)
        background_tasks: FastAPI BackgroundTasks for async task queue
        db: AsyncIOMotorDatabase dependency
        _: Role-protected user dependency (Admin, Operator, or Farmer)
    
    Returns:
        dict: Confirmation message that generation is queued
    """
    return await IDCardService.generate(farmer_id, background_tasks, db)


@router.get("/{farmer_id}/download-idcard",
            dependencies=[Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))])
async def download_idcard(farmer_id: str, db=Depends(get_db)):
    """
    Download generated ID card PDF for a farmer.
    Farmers can download their own cards.
    """
    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Check for ID card path (new field)
    file_path = farmer.get("id_card_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="ID card not generated yet")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"{farmer_id}_card.pdf"
    )


@router.get("/{farmer_id}/qr",
            dependencies=[Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))])
async def get_qr_code(farmer_id: str, db=Depends(get_db)):
    """
    Get QR code image for a farmer.
    Farmers can access their own QR codes.
    """
    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Check for QR code path
    qr_path = farmer.get("qr_code_path")
    if not qr_path or not os.path.exists(qr_path):
        raise HTTPException(status_code=404, detail="QR code not generated yet. Please generate your ID card first.")

    return FileResponse(
        path=qr_path,
        media_type="image/png",
        filename=f"{farmer_id}_qr.png"
    )
