# backend/app/routes/files.py
"""
File download route for GridFS
Serves files stored in MongoDB GridFS
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse, FileResponse
from app.services.gridfs_service import gridfs_service
from app.dependencies.roles import get_current_user
import io
import os
from pathlib import Path

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download file from GridFS
    
    **Authentication Required**
    
    Returns:
        StreamingResponse: File content with appropriate headers
    """
    try:
        file_data, metadata = await gridfs_service.download_file(file_id)
        
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=metadata.get("content_type", "application/octet-stream"),
            headers={
                "Content-Disposition": f"inline; filename={metadata['filename']}",
                "Cache-Control": "max-age=3600"
            }
        )
    
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")


@router.get("/legacy/{file_path:path}")
async def download_legacy_file(
    file_path: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download legacy filesystem files (backward compatibility)
    Serves old /uploads/ files that haven't been migrated to GridFS
    
    **Authentication Required**
    
    Returns:
        FileResponse: File content from filesystem
    """
    try:
        # Construct full path (remove leading slash if present)
        clean_path = file_path.lstrip('/')
        full_path = Path("/app") / clean_path
        
        # Security check - ensure path is within /app directory
        resolved = full_path.resolve()
        if not str(resolved).startswith('/app'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not resolved.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        # Determine media type
        ext = resolved.suffix.lower()
        media_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.pdf': 'application/pdf',
        }
        media_type = media_types.get(ext, 'application/octet-stream')
        
        return FileResponse(
            path=str(resolved),
            media_type=media_type,
            filename=resolved.name
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")


@router.get("/metadata/{file_id}")
async def get_file_metadata(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get file metadata without downloading
    
    Returns:
        dict: File metadata (filename, size, upload date, etc.)
    """
    try:
        _, metadata = await gridfs_service.download_file(file_id)
        return {
            "file_id": file_id,
            "filename": metadata["filename"],
            "content_type": metadata["content_type"],
            "size": metadata["length"],
            "uploaded_at": metadata["uploaded_at"],
            "farmer_id": metadata.get("farmer_id"),
            "file_type": metadata.get("file_type")
        }
    
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting metadata: {str(e)}")
