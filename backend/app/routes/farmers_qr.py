# backend/app/routes/farmers_qr.py
# QR code generation, retrieval, and verification endpoints for farmers
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from app.utils.security import verify_qr_signature
from app.database import get_db, AsyncIOMotorDatabase
from app.dependencies.roles import require_role
from app.services.idcard_service import IDCardService
from typing import Dict
import asyncio
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


@router.get(
    "/verify-qr/{farmer_id}",
    summary="Public QR verification by farmer ID",
    description=(
        "Public endpoint — no authentication required. "
        "Returns a safe public summary of the farmer for QR scanner display."
    ),
)
async def verify_farmer_by_id(farmer_id: str, db=Depends(get_db)):
    """Return limited public info about a farmer identified by QR code scan."""
    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    personal = farmer.get("personal_info", {})
    address = farmer.get("address", {})
    operator_id = farmer.get("operator_id")

    operator_name: str | None = None
    if operator_id:
        op = await db.operators.find_one({"operator_id": operator_id}, {"full_name": 1})
        if op:
            operator_name = op.get("full_name")

    # Build a photo URL from whichever storage location is available
    photo_url: str | None = None
    photo_file_id = farmer.get("photo_file_id") or (farmer.get("documents") or {}).get("photo_file_id")
    photo_path = farmer.get("photo_path") or (farmer.get("documents") or {}).get("photo")
    if photo_file_id:
        photo_url = f"/api/files/{photo_file_id}"
    elif photo_path:
        photo_url = photo_path if photo_path.startswith("/api/") else f"/api/files/{photo_path}"

    return {
        "verified": True,
        "farmer_id": farmer_id,
        "name": f"{personal.get('first_name', '')} {personal.get('last_name', '')}".strip(),
        "nrc": personal.get("nrc") or farmer.get("nrc_number"),
        "province": address.get("province_name"),
        "district": address.get("district_name"),
        "photo_url": photo_url,
        "registered_date": farmer["created_at"].isoformat() if hasattr(farmer.get("created_at"), "isoformat") else str(farmer.get("created_at", "")),
        "operator_name": operator_name,
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


@router.post(
    "/{farmer_id}/generate-qr",
    summary="Generate QR code for a farmer",
    description="Generates (or re-generates) the QR code PNG for a farmer. Auth required.",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))]
)
async def generate_qr_code_endpoint(
    farmer_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Generate a QR code image for the farmer and persist it to GridFS.
    The QR payload encodes farmer_id, name, nrc, and a verify URL.
    """
    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Run synchronous QR generation in a thread pool so we don't block the event loop
    loop = asyncio.get_event_loop()
    qr_path = await loop.run_in_executor(
        None, IDCardService.generate_qr_code, farmer, farmer_id
    )

    # Upload to GridFS and update farmer document
    try:
        from app.services.gridfs_service import gridfs_service
        with open(qr_path, "rb") as f:
            qr_bytes = f.read()
        file_id = await gridfs_service.upload_file(
            file_data=qr_bytes,
            filename=f"{farmer_id}_qr.png",
            content_type="image/png",
            metadata={"farmer_id": farmer_id, "file_type": "qr"},
        )
        await db.farmers.update_one(
            {"farmer_id": farmer_id},
            {"$set": {"qr_code_file_id": str(file_id), "qr_code_path": qr_path}},
        )
        qr_url = f"/api/files/{file_id}"
    except Exception:
        # Fallback: QR was saved to filesystem, no GridFS
        qr_url = f"/api/farmers/{farmer_id}/qr"

    return {
        "farmer_id": farmer_id,
        "message": "QR code generated successfully.",
        "qr_url": qr_url,
    }


@router.get("/{farmer_id}/download-idcard",
            dependencies=[Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))])
async def download_idcard(farmer_id: str, db=Depends(get_db)):
    """
    Download generated ID card PDF for a farmer.
    Farmers can download their own cards.
    """
    # Delegate to IDCardService which supports GridFS fallback
    return await IDCardService.download(farmer_id, db)


@router.get("/{farmer_id}/qr",
            dependencies=[Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))])
async def get_qr_code(farmer_id: str, db=Depends(get_db)):
    """
    Get QR code image for a farmer.
    Supports both GridFS (new) and filesystem (legacy) storage.
    Farmers can access their own QR codes.
    """
    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Try GridFS first (new method)
    qr_file_id = farmer.get("qr_code_file_id")
    if qr_file_id:
        try:
            from app.services.gridfs_service import gridfs_service
            file_data, metadata = await gridfs_service.download_file(str(qr_file_id))
            from io import BytesIO
            from fastapi.responses import StreamingResponse
            return StreamingResponse(
                BytesIO(file_data),
                media_type="image/png",
                headers={"Content-Disposition": f"inline; filename={farmer_id}_qr.png"}
            )
        except Exception:
            pass  # GridFS QR lookup failed — fall through to filesystem path
    
    # Fallback to filesystem path (legacy method)
    qr_path = farmer.get("qr_code_path")
    if qr_path and os.path.exists(qr_path):
        return FileResponse(
            path=qr_path,
            media_type="image/png",
            filename=f"{farmer_id}_qr.png"
        )
    
    # No QR code found in either location
    raise HTTPException(
        status_code=404, 
        detail="QR code not generated yet. Please generate your ID card first."
    )
