# backend/app/routes/uploads.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status, Request
from pathlib import Path
from app.database import get_db
from app.dependencies.roles import require_role, require_operator
from app.services.logging_service import log_event
from app.services.gridfs_service import gridfs_service
from typing import Optional

router = APIRouter(prefix="/uploads", tags=["Uploads"])

MAX_FILE_SIZE_MB = 10
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png"}
ALLOWED_DOC_TYPES = {"image/jpeg", "image/png", "application/pdf"}


def validate_file_upload(file: UploadFile, allowed_types: set, max_size_mb: int):
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")


@router.post(
    "/{farmer_id}/photo",
    summary="Upload farmer photo",
    description="Upload farmer passport photo"
)
async def upload_photo(
    request: Request,
    farmer_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_operator),
    db=Depends(get_db)
):
    await log_event(
        level="INFO",
        module="uploads",
        action="upload_photo_attempt",
        details={"farmer_id": farmer_id, "filename": file.filename, "content_type": file.content_type},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    validate_file_upload(file, ALLOWED_PHOTO_TYPES, MAX_FILE_SIZE_MB)
    
    # Read file content
    file_data = await file.read()
    
    # Upload to GridFS
    file_id = await gridfs_service.upload_file(
        file_data=file_data,
        filename=file.filename,
        farmer_id=farmer_id,
        file_type="photo"
    )
    
    # Update farmer document with file ID
    await db.farmers.update_one(
        {"farmer_id": farmer_id},
        {"$set": {"documents.photo_file_id": file_id}}
    )
    
    await log_event(
        level="INFO",
        module="uploads",
        action="upload_photo_success",
        details={"farmer_id": farmer_id, "file_id": file_id},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "Photo uploaded", "file_id": file_id}


@router.post(
    "/{farmer_id}/document/{document_type}",
    summary="Upload farmer document",
    description="Upload farmer documents like NRC, certificate, land title, license"
)
async def upload_document(
    request: Request,
    farmer_id: str,
    document_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_operator),
    db=Depends(get_db)
):
    await log_event(
        level="INFO",
        module="uploads",
        action="upload_document_attempt",
        details={"farmer_id": farmer_id, "document_type": document_type, "filename": file.filename},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    validate_file_upload(file, ALLOWED_DOC_TYPES, MAX_FILE_SIZE_MB)
    valid_types = ["nrc", "certificate", "land_title", "license"]
    if document_type not in valid_types:
        raise HTTPException(400, f"Invalid document type. Valid: {valid_types}")
    
    # Read file content
    file_data = await file.read()
    
    # Upload to GridFS
    file_id = await gridfs_service.upload_file(
        file_data=file_data,
        filename=file.filename,
        farmer_id=farmer_id,
        file_type="document",
        metadata={"document_type": document_type}
    )
    
    # Update farmer document
    await db.farmers.update_one(
        {"farmer_id": farmer_id},
        {"$set": {f"documents.{document_type}_file_id": file_id}}
    )
    
    await log_event(
        level="INFO",
        module="uploads",
        action="upload_document_success",
        details={"farmer_id": farmer_id, "document_type": document_type, "file_id": file_id},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": f"{document_type} uploaded", "file_id": file_id}
