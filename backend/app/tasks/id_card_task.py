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
import json

UPLOAD_DIR = "/app/uploads/idcards"
QR_DIR = "/app/uploads/qr"

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
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        os.makedirs(QR_DIR, exist_ok=True)

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
        
        qr_path = os.path.join(QR_DIR, f"{farmer_id}_qr.png")
        qr_img.save(qr_path)
        print(f"✅ QR code saved to: {qr_path}")

        # Get photo path
        photo_path = farmer.get("documents", {}).get("photo")
        if photo_path and not photo_path.startswith("/app"):
            photo_path = f"/app{photo_path}" if not photo_path.startswith("/") else f"/app{photo_path}"

        # Create PDF with front and back pages
        pdf_path = os.path.join(UPLOAD_DIR, f"{farmer_id}_card.pdf")
        c = pdf_canvas.Canvas(pdf_path, pagesize=(CARD_WIDTH, CARD_HEIGHT))

        # ============================================
        # FRONT SIDE
        # ============================================
        
        # Background gradient (green)
        c.setFillColor(colors.HexColor('#15803d'))
        c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=1, stroke=0)
        
        # Header strip
        c.setFillColor(colors.HexColor('#14532d'))
        c.rect(0, CARD_HEIGHT - 15*mm, CARD_WIDTH, 15*mm, fill=1, stroke=0)
        
        # Title
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(5*mm, CARD_HEIGHT - 7*mm, "REPUBLIC OF ZAMBIA")
        c.setFont("Helvetica", 7)
        c.drawString(5*mm, CARD_HEIGHT - 11*mm, "Ministry of Agriculture")
        
        # ZIAMIS logo text (right side)
        c.setFont("Helvetica-Bold", 12)
        c.drawRightString(CARD_WIDTH - 5*mm, CARD_HEIGHT - 7*mm, "ZIAMIS")
        c.setFont("Helvetica", 6)
        c.drawRightString(CARD_WIDTH - 5*mm, CARD_HEIGHT - 11*mm, "Farmer Registry")
        
        # Photo placeholder or actual photo
        photo_x = 5*mm
        photo_y = CARD_HEIGHT - 38*mm
        photo_w = 20*mm
        photo_h = 24*mm
        
        if photo_path and os.path.exists(photo_path):
            try:
                img = ImageReader(photo_path)
                c.drawImage(img, photo_x, photo_y, photo_w, photo_h, mask='auto')
                print(f"✅ Photo added: {photo_path}")
            except Exception as e:
                print(f"⚠️ Photo failed: {e}")
                # Draw placeholder
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
        
        # Farmer details (right of photo)
        detail_x = 28*mm
        detail_y = CARD_HEIGHT - 20*mm
        
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica-Bold", 6)
        c.drawString(detail_x, detail_y, "NAME")
        
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        name = f"{farmer['personal_info']['first_name']} {farmer['personal_info']['last_name']}"
        c.drawString(detail_x, detail_y - 4*mm, name[:25])  # Truncate if too long
        
        # Farmer ID and NRC
        detail_y -= 10*mm
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica-Bold", 5)
        c.drawString(detail_x, detail_y, "FARMER ID")
        c.drawString(detail_x + 25*mm, detail_y, "NRC")
        
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 7)
        c.drawString(detail_x, detail_y - 3*mm, farmer_id)
        c.drawString(detail_x + 25*mm, detail_y - 3*mm, farmer['personal_info'].get('nrc', 'N/A')[:12])
        
        # DOB and Gender
        detail_y -= 8*mm
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica-Bold", 5)
        c.drawString(detail_x, detail_y, "DOB")
        c.drawString(detail_x + 25*mm, detail_y, "GENDER")
        
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 7)
        dob = farmer['personal_info'].get('date_of_birth', 'N/A')
        if dob != 'N/A':
            try:
                dob = datetime.fromisoformat(dob).strftime('%Y-%m-%d')
            except:
                pass
        c.drawString(detail_x, detail_y - 3*mm, dob)
        c.drawString(detail_x + 25*mm, detail_y - 3*mm, farmer['personal_info'].get('gender', 'N/A').upper())
        
        # District
        detail_y -= 8*mm
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica-Bold", 5)
        c.drawString(detail_x, detail_y, "DISTRICT")
        
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 7)
        district = f"{farmer['address'].get('district_name', 'N/A')}, {farmer['address'].get('province_name', 'N/A')}"
        c.drawString(detail_x, detail_y - 3*mm, district[:35])
        
        # Footer
        c.setFillColor(colors.HexColor('#14532d'))
        c.rect(0, 0, CARD_WIDTH, 6*mm, fill=1, stroke=0)
        
        c.setFillColor(colors.HexColor('#bbf7d0'))
        c.setFont("Helvetica", 6)
        issued_date = farmer.get('created_at', datetime.utcnow())
        if isinstance(issued_date, str):
            try:
                issued_date = datetime.fromisoformat(issued_date)
            except:
                issued_date = datetime.utcnow()
        c.drawString(5*mm, 2*mm, f"Issued: {issued_date.strftime('%Y-%m-%d')}")
        c.drawRightString(CARD_WIDTH - 5*mm, 2*mm, "✓ VERIFIED FARMER")
        
        # ============================================
        # BACK SIDE (New Page)
        # ============================================
        c.showPage()
        
        # Background (light gray)
        c.setFillColor(colors.HexColor('#f3f4f6'))
        c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=1, stroke=0)
        
        # Header
        c.setFillColor(colors.HexColor('#15803d'))
        c.rect(0, CARD_HEIGHT - 8*mm, CARD_WIDTH, 8*mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(CARD_WIDTH/2, CARD_HEIGHT - 5.5*mm, "FARMER IDENTIFICATION CARD")
        
        # QR Code
        if os.path.exists(qr_path):
            qr_img_reader = ImageReader(qr_path)
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
        
        # Farm Information Box
        info_x = 38*mm
        info_y = CARD_HEIGHT - 20*mm
        info_w = 43*mm
        info_h = 12*mm
        
        c.setFillColor(colors.white)
        c.rect(info_x, info_y, info_w, info_h, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor('#16a34a'))
        c.setLineWidth(2)
        c.line(info_x, info_y + info_h, info_x, info_y)
        
        c.setFillColor(colors.HexColor('#15803d'))
        c.setFont("Helvetica-Bold", 7)
        c.drawString(info_x + 2*mm, info_y + info_h - 4*mm, "🌾 Farm Information")
        
        c.setFillColor(colors.HexColor('#374151'))
        c.setFont("Helvetica", 6)
        village = farmer['address'].get('village', 'N/A')
        chiefdom = farmer['address'].get('chiefdom_name', 'N/A')
        c.drawString(info_x + 2*mm, info_y + info_h - 8*mm, f"Location: {village[:20]}")
        c.drawString(info_x + 2*mm, info_y + info_h - 11*mm, f"Chiefdom: {chiefdom[:20]}")
        
        # Important Notice Box
        info_y -= 15*mm
        info_h = 10*mm
        
        c.setFillColor(colors.white)
        c.rect(info_x, info_y, info_w, info_h, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor('#2563eb'))
        c.setLineWidth(2)
        c.line(info_x, info_y + info_h, info_x, info_y)
        
        c.setFillColor(colors.HexColor('#1e40af'))
        c.setFont("Helvetica-Bold", 7)
        c.drawString(info_x + 2*mm, info_y + info_h - 4*mm, "ℹ️ Important Notice")
        
        c.setFillColor(colors.HexColor('#374151'))
        c.setFont("Helvetica", 5)
        notice_text = "This card is property of the Government"
        c.drawString(info_x + 2*mm, info_y + info_h - 7*mm, notice_text)
        c.drawString(info_x + 2*mm, info_y + info_h - 9.5*mm, "of Zambia. Return to Ministry of Agric.")
        
        # Support Info Box
        info_y -= 8*mm
        info_h = 6*mm
        
        c.setFillColor(colors.HexColor('#dcfce7'))
        c.rect(info_x, info_y, info_w, info_h, fill=1, stroke=0)
        
        c.setFillColor(colors.HexColor('#15803d'))
        c.setFont("Helvetica-Bold", 6)
        c.drawCentredString(info_x + info_w/2, info_y + info_h - 3*mm, "📞 Support: +260-211-XXX-XXX")
        c.setFont("Helvetica", 5)
        c.drawCentredString(info_x + info_w/2, info_y + info_h - 5.5*mm, "www.agriculture.gov.zm")
        
        # Save PDF
        c.save()
        print(f"✅ PDF saved to: {pdf_path}")
        
        # Verify file exists
        if os.path.exists(pdf_path):
            file_size = os.path.getsize(pdf_path)
            print(f"✅ PDF file verified: {file_size} bytes")
        else:
            raise Exception(f"PDF file not found after output: {pdf_path}")

        # Update farmer record in database
        result = db.farmers.update_one(
            {"farmer_id": farmer_id},
            {
                "$set": {
                    "id_card_path": pdf_path,
                    "qr_code_path": qr_path,
                    "id_card_generated_at": datetime.utcnow()
                }
            }
        )
        print(f"✅ Database updated: matched={result.matched_count}, modified={result.modified_count}")

        client.close()
        return {"message": "ID card generated", "id_card_path": pdf_path}
    
    except Exception as e:
        client.close()
        print(f"❌ Error generating ID card: {e}")
        raise
