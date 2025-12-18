# backend/app/services/gridfs_service.py
"""
GridFS Service - Cloud-native file storage using MongoDB GridFS
Replaces local filesystem storage for AWS deployment
"""
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from pymongo import MongoClient
from gridfs import GridFSBucket
from app.database import get_db
from app.config import settings
from typing import Optional, BinaryIO
from bson import ObjectId
from datetime import datetime
import io


class GridFSService:
    """
    Async GridFS service for file operations
    Uses MongoDB Atlas as storage backend (cloud-ready)
    """
    
    def __init__(self):
        """Initialize GridFS bucket - lazy loaded"""
        self._bucket: Optional[AsyncIOMotorGridFSBucket] = None
    
    async def get_bucket(self) -> AsyncIOMotorGridFSBucket:
        """Get or create GridFS bucket"""
        if not self._bucket:
            db = await get_db()
            self._bucket = AsyncIOMotorGridFSBucket(db, bucket_name="cem_files")
        return self._bucket
    
    async def upload_file(
        self,
        file_data: bytes,
        filename: str,
        farmer_id: str,
        file_type: str,  # 'photo', 'document', 'idcard', 'qr'
        metadata: Optional[dict] = None
    ) -> str:
        """
        Upload file to GridFS
        
        Args:
            file_data: Binary file content
            filename: Original filename
            farmer_id: Farmer ID
            file_type: Type of file (photo, document, idcard, qr)
            metadata: Additional metadata
        
        Returns:
            str: GridFS file ID
        """
        bucket = await self.get_bucket()
        
        # Build metadata
        file_metadata = {
            "farmer_id": farmer_id,
            "file_type": file_type,
            "original_filename": filename,
            "uploaded_at": datetime.utcnow(),
            "content_type": self._get_content_type(filename),
            **(metadata or {})
        }
        
        # Upload to GridFS
        file_id = await bucket.upload_from_stream(
            filename,
            file_data,
            metadata=file_metadata
        )
        
        return str(file_id)
    
    async def download_file(self, file_id: str) -> tuple[bytes, dict]:
        """
        Download file from GridFS
        
        Args:
            file_id: GridFS file ID
        
        Returns:
            tuple: (file_data, metadata)
        """
        bucket = await self.get_bucket()
        
        try:
            # Get file info
            file_info = await bucket.find_one({"_id": ObjectId(file_id)})
            if not file_info:
                raise FileNotFoundError(f"File {file_id} not found")
            
            # Download file data
            file_data = io.BytesIO()
            await bucket.download_to_stream(ObjectId(file_id), file_data)
            file_data.seek(0)
            
            metadata = {
                "filename": file_info.filename,
                "content_type": file_info.metadata.get("content_type"),
                "uploaded_at": file_info.upload_date,
                "length": file_info.length,
                **file_info.metadata
            }
            
            return file_data.read(), metadata
        
        except Exception as e:
            raise FileNotFoundError(f"Error downloading file {file_id}: {str(e)}")
    
    async def delete_file(self, file_id: str) -> bool:
        """
        Delete file from GridFS
        
        Args:
            file_id: GridFS file ID
        
        Returns:
            bool: True if deleted successfully
        """
        bucket = await self.get_bucket()
        
        try:
            await bucket.delete(ObjectId(file_id))
            return True
        except Exception as e:
            print(f"Error deleting file {file_id}: {str(e)}")
            return False
    
    async def get_file_url(self, file_id: str) -> str:
        """
        Get download URL for a file
        
        Args:
            file_id: GridFS file ID
        
        Returns:
            str: API endpoint URL for downloading
        """
        return f"/api/files/{file_id}"
    
    async def list_files(
        self,
        farmer_id: Optional[str] = None,
        file_type: Optional[str] = None
    ) -> list[dict]:
        """
        List files with optional filters
        
        Args:
            farmer_id: Filter by farmer ID
            file_type: Filter by file type
        
        Returns:
            list[dict]: List of file metadata
        """
        bucket = await self.get_bucket()
        
        # Build query
        query = {}
        if farmer_id:
            query["metadata.farmer_id"] = farmer_id
        if file_type:
            query["metadata.file_type"] = file_type
        
        # Find files
        cursor = bucket.find(query)
        files = []
        
        async for file_info in cursor:
            files.append({
                "file_id": str(file_info._id),
                "filename": file_info.filename,
                "farmer_id": file_info.metadata.get("farmer_id"),
                "file_type": file_info.metadata.get("file_type"),
                "uploaded_at": file_info.upload_date,
                "size": file_info.length,
                "content_type": file_info.metadata.get("content_type"),
            })
        
        return files
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type from filename"""
        ext = filename.lower().split('.')[-1]
        content_types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        return content_types.get(ext, 'application/octet-stream')


class SyncGridFSService:
    """
    Synchronous GridFS service for Celery tasks
    Uses pymongo instead of motor (Celery workers are sync)
    """
    
    def __init__(self):
        """Initialize sync GridFS bucket"""
        client = MongoClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DB_NAME]
        self.bucket = GridFSBucket(db, bucket_name="cem_files")
    
    def upload_file(
        self,
        file_data: bytes,
        filename: str,
        farmer_id: str,
        file_type: str,
        metadata: Optional[dict] = None
    ) -> str:
        """Upload file to GridFS (sync)"""
        file_metadata = {
            "farmer_id": farmer_id,
            "file_type": file_type,
            "original_filename": filename,
            "uploaded_at": datetime.utcnow(),
            "content_type": self._get_content_type(filename),
            **(metadata or {})
        }
        
        file_id = self.bucket.upload_from_stream(
            filename,
            file_data,
            metadata=file_metadata
        )
        
        return str(file_id)
    
    def download_file(self, file_id: str) -> tuple[bytes, dict]:
        """Download file from GridFS (sync)"""
        try:
            file_info = self.bucket.find_one({"_id": ObjectId(file_id)})
            if not file_info:
                raise FileNotFoundError(f"File {file_id} not found")
            
            file_data = io.BytesIO()
            self.bucket.download_to_stream(ObjectId(file_id), file_data)
            file_data.seek(0)
            
            metadata = {
                "filename": file_info.filename,
                "content_type": file_info.metadata.get("content_type"),
                "uploaded_at": file_info.upload_date,
                "length": file_info.length,
                **file_info.metadata
            }
            
            return file_data.read(), metadata
        
        except Exception as e:
            raise FileNotFoundError(f"Error downloading file {file_id}: {str(e)}")
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type from filename"""
        ext = filename.lower().split('.')[-1]
        content_types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'pdf': 'application/pdf',
        }
        return content_types.get(ext, 'application/octet-stream')


# Global instances
gridfs_service = GridFSService()
sync_gridfs_service = SyncGridFSService()
