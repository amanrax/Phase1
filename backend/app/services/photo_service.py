"""Photo upload and management service."""
import os
from fastapi import HTTPException, UploadFile
from app.config import settings
from pathlib import Path


class PhotoService:
    """Handles farmer photo uploads and storage."""

    @staticmethod
    async def upload(farmer_id: str, file: UploadFile, db):
        """
        Upload and save farmer photo to the file system,
        update MongoDB farmer document with photo path.

        Args:
            farmer_id (str): Unique farmer identifier.
            file (UploadFile): Uploaded photo file.
            db: Async motor database instance.

        Returns:
            dict: Upload success message and photo path.

        Raises:
            HTTPException: If farmer not found or file save fails.
        """
        farmer = await db.farmers.find_one({"farmer_id": farmer_id})
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")

        # Construct upload folder path
        upload_folder = Path(settings.UPLOAD_DIR) / "photos" / farmer_id
        upload_folder.mkdir(parents=True, exist_ok=True)

        # TC-201: Delete any existing photos for this farmer before saving new one
        # (handles extension changes, e.g. old .jpg replaced by .png)
        for existing in upload_folder.iterdir():
            if existing.is_file() and existing.stem == farmer_id:
                try:
                    existing.unlink()
                except OSError:
                    pass  # Best-effort deletion — proceed regardless

        # Save file with standard naming
        file_extension = file.filename.split(".")[-1].lower()
        if file_extension not in settings.ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image type. Allowed types: {settings.ALLOWED_IMAGE_EXTENSIONS}"
            )

        file_path = upload_folder / f"{farmer_id}_photo.{file_extension}"

        # Write file to disk
        try:
            contents = await file.read()
            if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail=f"File size exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit"
                )
            with open(file_path, "wb") as f:
                f.write(contents)
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to save photo: {str(e)}"
            )

        # Generate relative path for DB reference
        relative_path = f"/uploads/photos/{farmer_id}/{file_path.name}"

        # Update MongoDB
        await db.farmers.update_one(
            {"farmer_id": farmer_id},
            {"$set": {"documents.photo": relative_path}}
        )

        return {"message": "Photo uploaded successfully", "photo_path": relative_path}
