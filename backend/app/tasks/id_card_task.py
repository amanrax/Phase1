# backend/app/tasks/id_card_task.py
from celery import shared_task
from reportlab.lib.pagesizes import landscape
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from reportlab.lib.units import mm
import qrcode
from datetime import datetime
import os
from pymongo import MongoClient
from app.config import settings
from app.services.gridfs_service import sync_gridfs_service
import json
import io

# Credit card size: 85.6mm x 53.98mm
CARD_WIDTH = 85.6 * mm
CARD_HEIGHT = 53.98 * mm


@shared_task(name="app.tasks.id_card_task.generate_id_card")
def generate_id_card(farmer_id: str):
    """Generate beautiful ID card PDF with QR code for a farmer."""
    # Create MongoDB client (sync)
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    farmer = db.farmers.find_one({"farmer_id": farmer_id})

    if not farmer:
        client.close()
        raise Exception(f"Farmer {farmer_id} not found in DB.")

    try:
        # Generate QR code with farmer data
        qr_data = json.dumps({
            "farmer_id": farmer_id,
            "name": f"{farmer['personal_info']['first_name']} {farmer['personal_info']['last_name']}",
            "nrc": farmer['personal_info'].get('nrc', 'N/A'),
            "district": farmer['address'].get('district_name', 'N/A'),
            "verified": True,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Save QR code to memory buffer instead of disk
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        qr_data_bytes = qr_buffer.read()
        
        # Upload QR code to GridFS
        qr_file_id = sync_gridfs_service.upload_file(
            file_data=qr_data_bytes,
            filename=f"{farmer_id}_qr.png",
            farmer_id=farmer_id,
            file_type="qr"
        )
        print(f"✅ QR code uploaded to GridFS: {qr_file_id}")

        # Get photo from GridFS if available
        photo_file_id = (farmer.get("documents") or {}).get("photo_file_id")
        photo_data = None
        
        if photo_file_id:
            try:
                photo_bytes, _ = sync_gridfs_service.download_file(photo_file_id)
                photo_data = io.BytesIO(photo_bytes)
                print(f"✅ Photo loaded from GridFS: {photo_file_id}")
            except Exception as e:
                print(f"⚠️ Photo load failed: {e}")
        
        # Create PDF in memory
        pdf_buffer = io.BytesIO()
        c = pdf_canvas.Canvas(pdf_buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))

        # ============================================
        # FRONT SIDE
        # ============================================
        
        # Background gradient (green)
        c.setFillColor(colors.HexColor('#15803d'))
        c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=1, stroke=0)
        
        # Header strip
        c.setFillColor(colors.HexColor('#14532d'))
        c.rect(0, CARD_HEIGHT - 15*mm, CARD_WIDTH, 15*mm, fill=1, stroke=0)
        
        # Left side - Organization info
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(5*mm, CARD_HEIGHT - 7*mm, "CHIEFDOM ENTERPRISE")
        c.setFont("Helvetica", 6)
        c.drawString(5*mm, CARD_HEIGHT - 11*mm, "MWasree Enterprises Ltd")
        
        # Right side - Program branding
        c.setFont("Helvetica-Bold", 11)
        c.drawRightString(CARD_WIDTH - 5*mm, CARD_HEIGHT - 7*mm, "CEM")
        c.setFont("Helvetica", 6)
        c.drawRightString(CARD_WIDTH - 5*mm, CARD_HEIGHT - 11*mm, "Farmer ID Card")
        
        # Photo placeholder or actual photo (positioned to avoid header overlap)
        photo_w = 22 * mm
        photo_h = 28 * mm
        photo_x = 5 * mm
        photo_y = CARD_HEIGHT - 15*mm - photo_h - 2*mm
        photo_path = (farmer.get('documents') or {}).get('photo')

        if photo_data:
            try:
                img = ImageReader(photo_data)
                c.drawImage(img, photo_x, photo_y, photo_w, photo_h, mask='auto')
                print(f"✅ Photo added from GridFS: {photo_file_id}")
            except Exception as e:
                print(f"⚠️ Photo failed to render from GridFS: {e}")
                c.setFillColor(colors.HexColor('#e5e7eb'))
                c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
                c.setFillColor(colors.HexColor('#9ca3af'))
                c.setFont("Helvetica", 20)
                c.drawCentredString(photo_x + photo_w/2, photo_y + photo_h/2 - 3*mm, "👤")
        elif photo_path and os.path.exists(photo_path):
            try:
                img = ImageReader(photo_path)
                c.drawImage(img, photo_x, photo_y, photo_w, photo_h, mask='auto')
                print(f"✅ Photo added: {photo_path}")
            except Exception as e:
                print(f"⚠️ Photo failed: {e}")
                c.setFillColor(colors.HexColor('#e5e7eb'))
                c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
                c.setFillColor(colors.HexColor('#9ca3af'))
                c.setFont("Helvetica", 20)
                c.drawCentredString(photo_x + photo_w/2, photo_y + photo_h/2 - 3*mm, "👤")
        else:
            # Draw placeholder
            c.setFillColor(colors.HexColor('#e5e7eb'))
            c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
            c.setFillColor(colors.HexColor('#9ca3af'))
            c.setFont("Helvetica", 20)
            c.drawCentredString(photo_x + photo_w/2, photo_y + photo_h/2 - 3*mm, "👤")

        # Farmer details (right of photo) redesigned for tighter vertical spacing
        detail_x = 28*mm
        # Start just below header with proper spacing to avoid header touch
        detail_y = CARD_HEIGHT - 18*mm

        name = f"{farmer['personal_info']['first_name']} {farmer['personal_info']['last_name']}"
        dob_raw = farmer['personal_info'].get('date_of_birth', 'N/A')
        if dob_raw != 'N/A':
            try:
                dob_fmt = datetime.fromisoformat(dob_raw).strftime('%Y-%m-%d')
            except:
                dob_fmt = dob_raw
        else:
            dob_fmt = 'N/A'
        gender = farmer['personal_info'].get('gender', 'N/A').upper()
        phone = farmer['personal_info'].get('phone_primary', 'N/A')
        nrc_val = farmer['personal_info'].get('nrc', 'N/A')
        village = farmer['address'].get('village', 'N/A')
        chiefdom = farmer['address'].get('chiefdom_name', '')
        district_name = farmer['address'].get('district_name', 'N/A')
        province_name = farmer['address'].get('province_name', 'N/A')
        created_by = farmer.get('created_by', 'N/A')
        operator_display = created_by.split('@')[0] if created_by != 'N/A' else 'N/A'

        # NAME
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica-Bold", 5.5)
        c.drawString(detail_x, detail_y, "NAME")
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(detail_x, detail_y - 3.5*mm, name[:28])
        
        # Add separator line under NAME
        c.setStrokeColor(colors.HexColor('#bbf7d0'))
        c.setLineWidth(0.3)
        c.setStrokeAlpha(0.3)
        c.line(detail_x, detail_y - 5*mm, detail_x + 45*mm, detail_y - 5*mm)
        c.setStrokeAlpha(1)

        # FARMER ID / NRC
        detail_y -= 7.5*mm
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica-Bold", 5)
        c.drawString(detail_x, detail_y, "FARMER ID")
        c.drawString(detail_x + 25*mm, detail_y, "NRC")
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 6.5)
        c.drawString(detail_x, detail_y - 3*mm, farmer_id)
        c.drawString(detail_x + 25*mm, detail_y - 3*mm, nrc_val[:14])

        # DOB / GENDER
        detail_y -= 6.5*mm
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica-Bold", 5)
        c.drawString(detail_x, detail_y, "DOB")
        c.drawString(detail_x + 25*mm, detail_y, "GENDER")
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 6.5)
        c.drawString(detail_x, detail_y - 3*mm, dob_fmt)
        c.drawString(detail_x + 25*mm, detail_y - 3*mm, gender)

        # PHONE (replace address on front)
        detail_y -= 6*mm
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica-Bold", 5)
        c.drawString(detail_x, detail_y, "PHONE")
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 6.5)
        c.drawString(detail_x, detail_y - 3*mm, phone[:18])
        
        # No footer on front card to prevent overlap
        # Issued date and verification will be on back card only
        
        # ============================================
        # BACK SIDE (New Page)
        # ============================================
        c.showPage()
        
        # Background (light gray)
        c.setFillColor(colors.HexColor('#f3f4f6'))
        c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=1, stroke=0)
        
        # Header from memory buffer
        qr_buffer.seek(0)
        qr_img_reader = ImageReader(qr_buffer)
        qr_size = 28*mm
        qr_x = 5*mm
        qr_y = CARD_HEIGHT - 40*mm
        
        # White background for QR
        c.setFillColor(colors.white)
        c.rect(qr_x - 2*mm, qr_y - 2*mm, qr_size + 4*mm, qr_size + 4*mm, fill=1, stroke=1)
        c.drawImage(qr_img_reader, qr_x, qr_y, qr_size, qr_size)
        
        c.setFillColor(colors.HexColor('#4b5563'))
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(qr_x + qr_size/2, qr_y - 4*mm, "SCAN TO VERIFY")
        print(f"✅ QR code added to PDF")
        
        # Right column boxes - only Address and Operator (Farm Details removed)
        info_x = 38*mm
        info_w = 43*mm
        
        # Calculate available vertical space
        header_h = 8*mm
        bottom_bar_h = 5*mm
        top_margin = 3*mm
        bottom_margin = 2*mm
        
        # Box heights and gaps (Farm Details removed)
        box_gap = 3*mm
        address_h = 14*mm
        operator_h = 10*mm
        
        # Calculate starting Y position from top
        current_y = CARD_HEIGHT - header_h - top_margin

        # === FULL ADDRESS BOX (expanded, from database) ===
        current_y -= address_h
        c.setFillColor(colors.white)
        c.rect(info_x, current_y, info_w, address_h, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor('#2563eb'))
        c.setLineWidth(2)
        c.line(info_x, current_y + address_h, info_x, current_y)
        
        c.setFillColor(colors.HexColor('#1e40af'))
        c.setFont("Helvetica-Bold", 7)
        c.drawString(info_x + 2*mm, current_y + address_h - 4*mm, "📍 Full Address")
        
        c.setFillColor(colors.HexColor('#374151'))
        c.setFont("Helvetica", 5.5)
        c.drawString(info_x + 2*mm, current_y + address_h - 7*mm, f"Village: {village[:18]}")
        c.drawString(info_x + 2*mm, current_y + address_h - 10*mm, f"Chiefdom: {chiefdom[:18]}")
        c.drawString(info_x + 2*mm, current_y + address_h - 12.5*mm, f"{district_name[:18]}, {province_name[:14]}")

        # === OPERATOR DETAILS BOX (expanded) ===
        current_y -= (box_gap + operator_h)
        c.setFillColor(colors.HexColor('#eff6ff'))
        c.rect(info_x, current_y, info_w, operator_h, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor('#bfdbfe'))
        c.setLineWidth(1)
        c.rect(info_x, current_y, info_w, operator_h, fill=0, stroke=1)
        
        c.setFillColor(colors.HexColor('#1e40af'))
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(info_x + 2*mm, current_y + operator_h - 3*mm, "👤 Operator Details")
        
        c.setFillColor(colors.HexColor('#374151'))
        c.setFont("Helvetica", 5.5)
        c.drawString(info_x + 2*mm, current_y + operator_h - 5.5*mm, f"Created by: {operator_display[:16]}")
        c.setFont("Helvetica", 4.5)
        c.setFillColor(colors.HexColor('#6b7280'))
        c.drawString(info_x + 2*mm, current_y + 1.5*mm, "MWasree Enterprises Ltd, Zambia")        # Bottom verification & issued date bar (moved from front side)
        issued_date = farmer.get('created_at', datetime.utcnow())
        if isinstance(issued_date, str):
            try:
                issued_date = datetime.fromisoformat(issued_date)
            except Exception:
                issued_date = datetime.utcnow()
        c.setFillColor(colors.HexColor('#14532d'))
        c.rect(0, 0, CARD_WIDTH, 5*mm, fill=1, stroke=0)
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica", 5)
        c.drawString(5*mm, 1.6*mm, f"Issued: {issued_date.strftime('%Y-%m-%d')}")
        c.drawRightString(CARD_WIDTH - 5*mm, 1.6*mm, "✓ VERIFIED FARMER")
        
        # Save PDF
        c.save()
        print(f"✅ PDF generated in memory")
        
        # Upload PDF to GridFS
        pdf_buffer.seek(0)
        pdf_bytes = pdf_buffer.read()
        pdf_file_id = sync_gridfs_service.upload_file(
            file_data=pdf_bytes,
            filename=f"{farmer_id}_card.pdf",
            farmer_id=farmer_id,
            file_type="idcard"
        )
        print(f"✅ ID card PDF uploaded to GridFS: {pdf_file_id}")

        # Update farmer record in database with GridFS file IDs
        result = db.farmers.update_one(
            {"farmer_id": farmer_id},
            {
                "$set": {
                    "id_card_file_id": pdf_file_id,
                    "qr_code_file_id": qr_file_id,
                    "id_card_generated_at": datetime.utcnow()
                }
            }
        )
        print(f"✅ Database updated: matched={result.matched_count}, modified={result.modified_count}")

        client.close()
        return {
            "message": "ID card generated",
            "id_card_file_id": pdf_file_id,
            "qr_code_file_id": qr_file_id
        }
    
    except Exception as e:
        client.close()
        print(f"❌ Error generating ID card: {e}")
        raise
