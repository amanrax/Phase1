# backend/app/routes/uploads.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status, Request
import logging, traceback
from pathlib import Path
from datetime import datetime, timezone
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
    try:
        await log_event(
            level="INFO",
            module="uploads",
            action="upload_photo_attempt",
            details={"farmer_id": farmer_id, "filename": file.filename, "content_type": file.content_type},
            endpoint=str(request.url),
            user_id=current_user.get("email"),
            role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
            ip_address=request.client.host if request.client else None,
        )

        validate_file_upload(file, ALLOWED_PHOTO_TYPES, MAX_FILE_SIZE_MB)

        # Read file content
        file_data = await file.read()

        # Upload to GridFS
        file_id = await gridfs_service.upload_file(
            file_data=file_data,
            filename=file.filename,
            farmer_id=farmer_id,
            file_type="photo",
        )

        # Update farmer document with file ID
        await db.farmers.update_one(
            {"farmer_id": farmer_id},
            {"$set": {"documents.photo_file_id": file_id}},
        )

        await log_event(
            level="INFO",
            module="uploads",
            action="upload_photo_success",
            details={"farmer_id": farmer_id, "file_id": file_id},
            endpoint=str(request.url),
            user_id=current_user.get("email"),
            role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
            ip_address=request.client.host if request.client else None,
        )

        return {"message": "Photo uploaded", "file_id": file_id}
    except Exception:
        tb = traceback.format_exc()
        logging.getLogger(__name__).error("Upload photo exception:\n%s", tb)
        with open('/tmp/uploads_error.log', 'a') as _f:
            _f.write('\n=== UPLOAD PHOTO ERROR ===\n')
            _f.write(tb)
        raise HTTPException(status_code=500, detail="Internal server error")


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
    try:
        await log_event(
            level="INFO",
            module="uploads",
            action="upload_document_attempt",
            details={"farmer_id": farmer_id, "document_type": document_type, "filename": file.filename},
            endpoint=str(request.url),
            user_id=current_user.get("email"),
            role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
            ip_address=request.client.host if request.client else None,
        )

        validate_file_upload(file, ALLOWED_DOC_TYPES, MAX_FILE_SIZE_MB)
        valid_types = ["nrc", "certificate", "land_title", "license"]
        if document_type not in valid_types:
            raise HTTPException(400, f"Invalid document type. Valid: {valid_types}")

        # Read file content
        file_data = await file.read()

        farmer = await db.farmers.find_one(
            {"farmer_id": farmer_id},
            {"operator_id": 1, "created_by": 1, "personal_info": 1, f"documents.{document_type}_file_id": 1},
        )
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")

        previous_file_id = ((farmer.get("documents") or {}).get(f"{document_type}_file_id"))

        # Upload to GridFS
        file_id = await gridfs_service.upload_file(
            file_data=file_data,
            filename=file.filename,
            farmer_id=farmer_id,
            file_type="document",
            metadata={"document_type": document_type},
        )

        # Update farmer document
        await db.farmers.update_one(
            {"farmer_id": farmer_id},
            {"$set": {f"documents.{document_type}_file_id": file_id}},
        )

        if previous_file_id:
            operator_id = farmer.get("operator_id") or farmer.get("created_by")
            operator = None
            if operator_id:
                operator = await db.operators.find_one({"operator_id": operator_id}, {"email": 1})

            personal_info = farmer.get("personal_info") or {}
            farmer_name = f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip() or farmer_id
            if operator and operator.get("email"):
                await db.notifications.insert_one({
                    "user_id": operator["email"],
                    "user_type": "operator",
                    "type": "document_reuploaded",
                    "title": "Document re-uploaded",
                    "body": f"Farmer {farmer_name} re-uploaded their {document_type.replace('_', ' ')} document. Please review.",
                    "read": False,
                    "created_at": datetime.now(timezone.utc),
                    "expires_at": None,
                    "metadata": {"farmer_id": farmer_id, "document_type": document_type},
                })

        await log_event(
            level="INFO",
            module="uploads",
            action="upload_document_success",
            details={"farmer_id": farmer_id, "document_type": document_type, "file_id": file_id},
            endpoint=str(request.url),
            user_id=current_user.get("email"),
            role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
            ip_address=request.client.host if request.client else None,
        )

        return {"message": f"{document_type} uploaded", "file_id": file_id}
    except Exception:
        tb = traceback.format_exc()
        logging.getLogger(__name__).error("Upload document exception:\n%s", tb)
        with open('/tmp/uploads_error.log', 'a') as _f:
            _f.write('\n=== UPLOAD DOCUMENT ERROR ===\n')
            _f.write(tb)
        raise HTTPException(status_code=500, detail="Internal server error")
