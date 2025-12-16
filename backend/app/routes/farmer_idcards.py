# backend/app/routes/farmer_idcards.py
"""
Endpoints for farmer ID card generation and download.
"""

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from starlette.responses import FileResponse
from app.database import AsyncIOMotorDatabase, get_db
from app.dependencies.roles import require_role
from app.services.idcard_service import IDCardService
from typing import Union


router = APIRouter(prefix="/farmers", tags=["Farmer ID Cards"])


@router.post(
    "/{farmer_id}/generate-idcard",
    summary="Generate farmer ID card asynchronously",
    description="Queue ID card generation task for the farmer. Admin/Operator only.",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=dict
)
async def generate_idcard(
    farmer_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(require_role(["ADMIN", "OPERATOR"]))
):
    """
    Generate ID card PDF asynchronously for a farmer.
    
    Args:
        farmer_id: Unique farmer ID string (e.g., ZM1A2B3C4D)
        background_tasks: FastAPI BackgroundTasks for async task queue
        db: AsyncIOMotorDatabase dependency
        _: Role-protected user dependency (Admin or Operator)
    
    Returns:
        dict: Confirmation message that generation is queued
    """
    return await IDCardService.generate(farmer_id, background_tasks, db)


# Also expose a GET endpoint for environments where POST without a body
# may be problematic (some clients/proxies). This routes to the same
# generation logic and returns the same 202 response.
@router.get(
    "/{farmer_id}/generate-idcard",
    summary="(GET) Generate farmer ID card asynchronously",
    description="Queue ID card generation task for the farmer (GET alias). Admin/Operator only.",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=dict
)
async def generate_idcard_get(
    farmer_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(require_role(["ADMIN", "OPERATOR"]))
):
    return await IDCardService.generate(farmer_id, background_tasks, db)


@router.get(
    "/{farmer_id}/download-idcard",
    summary="Download generated farmer ID card PDF",
    description="Download the previously generated ID card PDF file. Auth required.",
    response_class=FileResponse
)
async def download_idcard(
    farmer_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))
) -> Union[FileResponse, dict]:
    """
    Download generated ID card PDF for a farmer.
    
    Args:
        farmer_id: Unique farmer ID
        db: AsyncIOMotorDatabase dependency
        _: Role-protected user dependency
    
    Returns:
        FileResponse: PDF file response
    
    Raises:
        HTTPException 404 if ID card PDF not found
    """
    response = await IDCardService.download(farmer_id, db)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ID card not found")
    return response
