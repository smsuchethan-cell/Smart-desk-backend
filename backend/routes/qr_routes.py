from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from database.db import get_db
from models.product import Product
from models.attendee import Attendee
from models.attendance import Attendance
from models.scan_log import ScanLog
from schemas.attendee import AttendeeResponse, CheckInResponse
from schemas.product import ProductResponse
from utils.badge_generator import generate_badge
import re
import uuid

router = APIRouter()

PRODUCT_URL_RE = re.compile(r"/products/(\d+)")


def _extract_product_id(qr_data: str):
    """Accepts either the legacy 'PRODUCT:<id>' desk-scanner format or a
    full product page URL (https://.../products/<id>) from a visitor's QR scan."""
    if qr_data.startswith("PRODUCT:"):
        try:
            return int(qr_data.split(":", 1)[1])
        except ValueError:
            return None
    match = PRODUCT_URL_RE.search(qr_data)
    return int(match.group(1)) if match else None


@router.post("/qr/scan")
def handle_qr_scan(qr_data: str, request: Request, db: Session = Depends(get_db)):
    """
    Unified QR scan handler.
    - PRODUCT:<id> or a product page URL → returns product info + logs scan
    - ATTENDEE:<qr_id> → checks in attendee, generates badge
    """
    qr_data = qr_data.strip()
    product_id = _extract_product_id(qr_data)

    # ── Sub QR: Product ────────────────────────────────────────────────────────
    if product_id is not None:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return {"success": False, "message": "Product not found"}

        # Log scan
        log = ScanLog(
            product_id=product_id,
            ip_address=request.client.host if request.client else "unknown",
        )
        db.add(log)
        db.commit()

        return {
            "type": "product",
            "success": True,
            "data": ProductResponse.model_validate(product),
        }

    # ── Master QR: Attendee ────────────────────────────────────────────────────
    elif qr_data.startswith("ATTENDEE:"):
        qr_id = qr_data.split(":", 1)[1]

        attendee = db.query(Attendee).filter(Attendee.qr_id == qr_id).first()
        if not attendee:
            return {
                "type": "attendee",
                "success": False,
                "message": f"No registration found for QR ID: {qr_id}",
            }

        # Duplicate check-in guard
        existing = db.query(Attendance).filter(Attendance.attendee_id == attendee.id).first()
        if existing:
            return {
                "type": "attendee",
                "success": True,
                "already_checked_in": True,
                "message": f"Already checked in: {attendee.name}",
                "data": AttendeeResponse.model_validate(attendee),
            }

        # Generate badge
        badge_path = generate_badge(
            name=attendee.name,
            company=attendee.company or "",
            qr_id=attendee.qr_id,
            qr_code_path=attendee.qr_code_path,
            photo_url=attendee.photo_url,
        )

        # Record attendance
        attendance = Attendance(
            attendee_id=attendee.id,
            event_id=attendee.event_id,
            badge_printed=True,
        )
        db.add(attendance)
        db.commit()

        return {
            "type": "attendee",
            "success": True,
            "already_checked_in": False,
            "message": f"Welcome {attendee.name}! Badge ready.",
            "data": AttendeeResponse.model_validate(attendee),
            "badge_path": badge_path,
        }

    else:
        return {"success": False, "message": "Unrecognized QR format"}
