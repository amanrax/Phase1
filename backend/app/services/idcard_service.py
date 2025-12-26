# backend/app/services/idcard_service.py
"""ID card generation service with QR code."""

import os
import json
from io import BytesIO
from pathlib import Path
from datetime import datetime
from fastapi import HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
import tempfile
import os
from app.services.gridfs_service import gridfs_service
import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


class IDCardService:
    """ID card service with QR code generation and PDF rendering."""

    @staticmethod
    def generate_qr_code(farmer_data: dict, farmer_id: str) -> str:
        """Generate QR code with farmer details and save as PNG."""
        qr_data = {
            "farmer_id": farmer_id,
            "name": f"{farmer_data.get('personal_info', {}).get('first_name', '')} "
                    f"{farmer_data.get('personal_info', {}).get('last_name', '')}",
            "phone": farmer_data.get('personal_info', {}).get('phone_primary', ''),
            "district": farmer_data.get('address', {}).get('district_name', ''),
            "farm_size": farmer_data.get('farm_info', {}).get('farm_size_hectares', 0),
        }

        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        qr_folder = Path(f"uploads/{farmer_id}/qr")
        qr_folder.mkdir(parents=True, exist_ok=True)
        qr_path = qr_folder / f"{farmer_id}_qr.png"
        img.save(qr_path)

        return str(qr_path)

    @staticmethod
    def generate_id_card_pdf(farmer_data: dict, farmer_id: str, qr_path: str) -> str:
        """Generate PDF ID card with embedded QR code."""
        idcard_folder = Path(f"uploads/{farmer_id}/idcards")
        idcard_folder.mkdir(parents=True, exist_ok=True)
        pdf_path = idcard_folder / f"{farmer_id}_card.pdf"

        c = canvas.Canvas(str(pdf_path), pagesize=letter)
        width, height = letter

        c.setFont("Helvetica-Bold", 20)
        c.drawCentredString(width/2, height-50, "🌾 ZAMBIAN FARMER SUPPORT SYSTEM")

        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height-100, f"Farmer ID: {farmer_id}")

        c.setFont("Helvetica", 12)
        y_position = height-140

        personal = farmer_data.get('personal_info', {})
        address = farmer_data.get('address', {})
        farm = farmer_data.get('farm_info', {})

        info_lines = [
            f"Name: {personal.get('first_name', '')} {personal.get('last_name', '')}",
            f"Phone: {personal.get('phone_primary', 'N/A')}",
            f"Province: {address.get('province_name', 'N/A')}",
            f"District: {address.get('district_name', 'N/A')}",
            f"Village: {address.get('village', 'N/A')}",
            f"Farm Size: {farm.get('farm_size_hectares', 0)} hectares",
            f"Crops: {', '.join(farm.get('crops_grown', []))}",
        ]

        for line in info_lines:
            c.drawString(50, y_position, line)
            y_position -= 25

        if os.path.exists(qr_path):
            qr_img = ImageReader(qr_path)
            c.drawImage(qr_img, width-200, height-300, width=150, height=150)

        c.setFont("Helvetica-Oblique", 10)
        gen_time = datetime.now().strftime('%Y-%m-%d %H:%M')
        c.drawCentredString(width/2, 50, f"Generated on {gen_time}")
        c.drawCentredString(width/2, 35, "Valid for official identification at agricultural offices")

        c.save()
        return str(pdf_path)

    @staticmethod
    async def generate(farmer_id: str, background_tasks: BackgroundTasks, db):
        """Async handler to generate ID card and update DB using Celery."""
        farmer = await db.farmers.find_one({"farmer_id": farmer_id})
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")

        # Queue Celery task for ID card generation
        from app.tasks.id_card_task import generate_id_card
        generate_id_card.delay(farmer_id)

        return {
            "message": "ID card generation queued",
            "farmer_id": farmer_id,
        }

    @staticmethod
    async def download(farmer_id: str, db):
        """Download generated ID card PDF."""
        farmer = await db.farmers.find_one({"farmer_id": farmer_id})
        if not farmer or not farmer.get("id_card_path"):
            # Try GridFS fallback if id_card_file_id present
            file_id = farmer.get("id_card_file_id") if farmer else None
            if not file_id:
                raise HTTPException(status_code=404, detail="ID card not found")

            try:
                # Download bytes from GridFS via async service
                file_bytes, meta = await gridfs_service.download_file(file_id)
            except Exception as e:
                raise HTTPException(status_code=404, detail=f"ID card not found in GridFS: {e}")

            # Write to a temporary file and return FileResponse
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", prefix=f"{farmer_id}_idcard_", dir=os.getenv("TMPDIR", "/tmp"))
            try:
                tmp.write(file_bytes)
                tmp.flush()
                tmp.close()
                return FileResponse(
                    tmp.name,
                    media_type=meta.get("content_type", "application/pdf"),
                    filename=meta.get("filename", os.path.basename(tmp.name)),
                    headers={"Content-Disposition": f"inline; filename={meta.get('filename', os.path.basename(tmp.name))}"}
                )
            except Exception:
                # Ensure temp file removed on failure
                try:
                    os.unlink(tmp.name)
                except Exception:
                    pass
                raise HTTPException(status_code=500, detail="Failed to prepare ID card file for download")

        # Local filesystem path case (backwards compatibility)
        file_path = farmer["id_card_path"]
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="ID card file missing on disk")

        return FileResponse(
            file_path,
            media_type="application/pdf",
            filename=os.path.basename(file_path),
            headers={"Content-Disposition": f"inline; filename={os.path.basename(file_path)}"}
        )
