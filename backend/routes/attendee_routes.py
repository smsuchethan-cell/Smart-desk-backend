from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.attendee import Attendee
from models.attendance import Attendance
from models.event import Event
from schemas.attendee import AttendeeCreate, AttendeeResponse, CheckInResponse
from utils.qr_generator import generate_qr
from utils.badge_generator import generate_badge
import uuid

router = APIRouter()


@router.post("/attendees/register", response_model=AttendeeResponse)
def register_attendee(payload: AttendeeCreate, db: Session = Depends(get_db)):
    # Confirm event exists
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Generate unique QR ID
    qr_id = str(uuid.uuid4()).split("-")[0].upper()  # e.g., A3F9C2B1

    attendee = Attendee(
        event_id=payload.event_id,
        name=payload.name,
        company=payload.company,
        email=payload.email,
        qr_id=qr_id,
    )
    db.add(attendee)
    db.commit()
    db.refresh(attendee)

    # Generate QR code encoding the unique ID
    qr_path = generate_qr(
        data=f"ATTENDEE:{qr_id}",
        filename=f"attendee_{qr_id}"
    )
    attendee.qr_code_path = qr_path
    db.commit()
    db.refresh(attendee)
    return attendee


@router.get("/attendees", response_model=list[AttendeeResponse])
def list_attendees(event_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Attendee)
    if event_id:
        query = query.filter(Attendee.event_id == event_id)
    return query.order_by(Attendee.registered_at.desc()).all()


@router.get("/attendees/{attendee_id}", response_model=AttendeeResponse)
def get_attendee(attendee_id: int, db: Session = Depends(get_db)):
    attendee = db.query(Attendee).filter(Attendee.id == attendee_id).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
    return attendee


@router.post("/attendees/checkin/{qr_id}", response_model=CheckInResponse)
def checkin_attendee(qr_id: str, db: Session = Depends(get_db)):
    attendee = db.query(Attendee).filter(Attendee.qr_id == qr_id).first()
    if not attendee:
        return CheckInResponse(
            success=False,
            message=f"No attendee found with QR ID: {qr_id}",
        )

    # Check for duplicate check-in
    existing = db.query(Attendance).filter(Attendance.attendee_id == attendee.id).first()
    if existing:
        return CheckInResponse(
            success=True,
            message="Already checked in",
            attendee=AttendeeResponse.model_validate(attendee),
            badge_path=existing.badge_path if hasattr(existing, "badge_path") else None,
            already_checked_in=True,
        )

    # Generate badge image
    badge_path = generate_badge(
        name=attendee.name,
        company=attendee.company or "",
        qr_id=attendee.qr_id,
        qr_code_path=attendee.qr_code_path,
        photo_url=attendee.photo_url,
    )

    # Log attendance
    attendance = Attendance(
        attendee_id=attendee.id,
        event_id=attendee.event_id,
        badge_printed=True,
    )
    db.add(attendance)
    db.commit()

    return CheckInResponse(
        success=True,
        message=f"Welcome {attendee.name}! Badge generated.",
        attendee=AttendeeResponse.model_validate(attendee),
        badge_path=badge_path,
        already_checked_in=False,
    )
