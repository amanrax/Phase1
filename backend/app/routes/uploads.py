# backend/app/routes/uploads.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status, Request
from pathlib import Path
from app.database import get_db
from app.dependencies.roles import require_role, require_operator
from app.services.logging_service import log_event
from typing import Optional
import shutil

router = APIRouter(prefix="/uploads", tags=["Uploads"])


UPLOAD_ROOT = Path("uploads")
MAX_FILE_SIZE_MB = 10
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png"}
ALLOWED_DOC_TYPES = {"image/jpeg", "image/png", "application/pdf"}


async def save_file(file: UploadFile, dest: Path):
    """Save an upload to local filesystem."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Seek to beginning in case stream was partially read
    await file.seek(0)
    with dest.open("wb") as buffer:
        # Read file content asynchronously
        content = await file.read()
        buffer.write(content)


def validate_file_upload(file: UploadFile, allowed_types: set, max_size_mb: int):
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    # FastAPI doesn't provide file.size natively; this check would require custom wrapper.
    # Suggestion: use Streaming methods or manually check as you read.


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
    filename = f"{farmer_id}_photo{Path(file.filename).suffix}"
    dest = UPLOAD_ROOT / "photos" / farmer_id / filename
    await save_file(file, dest)
    path = f"/uploads/photos/{farmer_id}/{filename}"
    await db.farmers.update_one({"farmer_id": farmer_id},
                                {"$set": {"documents.photo": path}})
    
    await log_event(
        level="INFO",
        module="uploads",
        action="upload_photo_success",
        details={"farmer_id": farmer_id, "photo_path": path},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "Photo uploaded", "photo_path": path}


@router.post(
    "/{farmer_id}/document",
    summary="Upload farmer document",
    description="Upload NRC, certificate, or land title document"
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
    filename = f"{farmer_id}_{document_type}{Path(file.filename).suffix}"
    dest = UPLOAD_ROOT / "documents" / farmer_id / filename
    await save_file(file, dest)
    path = f"/uploads/documents/{farmer_id}/{filename}"
    await db.farmers.update_one(
        {"farmer_id": farmer_id},
        {"$set": {f"documents.{document_type}": path}}
    )
    
    await log_event(
        level="INFO",
        module="uploads",
        action="upload_document_success",
        details={"farmer_id": farmer_id, "document_type": document_type, "file_path": path},
        endpoint=str(request.url),
        user_id=current_user.get("email"),
        role=current_user.get("roles", [])[0] if current_user.get("roles") else None,
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": f"{document_type} uploaded", "file_path": path}
