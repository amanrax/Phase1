# backend/app/routes/files.py
"""
File download route for GridFS
Serves files stored in MongoDB GridFS
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.services.gridfs_service import gridfs_service
from app.dependencies.roles import get_current_user
import io

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
