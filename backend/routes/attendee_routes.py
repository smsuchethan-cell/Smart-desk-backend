from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database.db import get_db
from models.attendee import Attendee
from models.attendance import Attendance
from models.event import Event
from schemas.attendee import AttendeeResponse, CheckInResponse
from utils.qr_generator import generate_qr
from utils.badge_generator import generate_badge
from utils.mailer import send_registration_email
import uuid, os, shutil

router = APIRouter()

UPLOAD_DIR = "static/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def make_unique_code() -> str:
    return str(uuid.uuid4()).replace("-", "").upper()[:6]


# ── Register ──────────────────────────────────────────────────────────────────
@router.post("/attendees/register", response_model=AttendeeResponse)
async def register_attendee(
    event_id:    int         = Form(...),
    name:        str         = Form(...),
    email:       str         = Form(...),
    company:     str         = Form(""),
    designation: str         = Form(""),
    photo:       UploadFile  = File(None),
    db:          Session     = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")

    photo_path = None
    if photo and photo.filename:
        ext       = os.path.splitext(photo.filename)[1] or ".jpg"
        filename  = f"{uuid.uuid4().hex}{ext}"
        save_path = f"{UPLOAD_DIR}/{filename}"
        with open(save_path, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_path = save_path

    qr_id       = str(uuid.uuid4()).split("-")[0].upper()
    unique_code = make_unique_code()

    attendee = Attendee(
        event_id    = event_id,
        name        = name,
        company     = company,
        email       = email,
        designation = designation,
        unique_code = unique_code,
        qr_id       = qr_id,
        photo_path  = photo_path,
    )
    db.add(attendee)
    db.commit()
    db.refresh(attendee)

    qr_path = generate_qr(data=f"ATTENDEE:{qr_id}", filename=f"attendee_{qr_id}")
    attendee.qr_code_path = qr_path
    db.commit()
    db.refresh(attendee)

    try:
        send_registration_email(
            to_email    = email,
            name        = name,
            unique_code = unique_code,
            event_name  = event.name,
        )
    except Exception as e:
        print(f"Email failed: {e}")

    return attendee


# ── List ──────────────────────────────────────────────────────────────────────
@router.get("/attendees", response_model=list[AttendeeResponse])
def list_attendees(event_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Attendee)
    if event_id:
        query = query.filter(Attendee.event_id == event_id)
    return query.order_by(Attendee.registered_at.desc()).all()


# ── Get one ───────────────────────────────────────────────────────────────────
@router.get("/attendees/{attendee_id}", response_model=AttendeeResponse)
def get_attendee(attendee_id: int, db: Session = Depends(get_db)):
    a = db.query(Attendee).filter(Attendee.id == attendee_id).first()
    if not a:
        raise HTTPException(404, "Attendee not found")
    return a


# ── Check-in via QR ───────────────────────────────────────────────────────────
@router.post("/attendees/checkin/{qr_id}", response_model=CheckInResponse)
def checkin_attendee(qr_id: str, db: Session = Depends(get_db)):
    attendee = db.query(Attendee).filter(Attendee.qr_id == qr_id).first()
    if not attendee:
        return CheckInResponse(success=False, message=f"No attendee found: {qr_id}")

    existing = db.query(Attendance).filter(Attendance.attendee_id == attendee.id).first()
    if existing:
        return CheckInResponse(
            success=True, message="Already checked in",
            attendee=AttendeeResponse.model_validate(attendee),
            badge_path=existing.badge_path,
            already_checked_in=True,
        )

    event = db.query(Event).filter(Event.id == attendee.event_id).first()

    badge_path = generate_badge(
        name         = attendee.name,
        company      = attendee.company or "",
        designation  = attendee.designation or "",
        qr_id        = attendee.qr_id,
        qr_code_path = attendee.qr_code_path,
        photo_path   = attendee.photo_path,
        event_name   = event.name if event else "",
        email        = attendee.email or "",
    )

    attendance = Attendance(
        attendee_id   = attendee.id,
        event_id      = attendee.event_id,
        badge_printed = True,
        badge_path    = badge_path,        # ← saved in same commit
    )
    db.add(attendance)
    db.commit()

    return CheckInResponse(
        success=True, message=f"Welcome {attendee.name}!",
        attendee=AttendeeResponse.model_validate(attendee),
        badge_path=badge_path, already_checked_in=False,
    )


# ── Gate verify ───────────────────────────────────────────────────────────────
@router.post("/gate/verify")
def gate_verify(unique_code: str = Form(...), db: Session = Depends(get_db)):
    attendee = db.query(Attendee).filter(
        Attendee.unique_code == unique_code.upper()
    ).first()
    if not attendee:
        raise HTTPException(400, "Invalid code. Please check and try again.")

    event = db.query(Event).filter(Event.id == attendee.event_id).first()

    existing = db.query(Attendance).filter(Attendance.attendee_id == attendee.id).first()
    if existing:
        return {
            "success":            False,
            "message":            "Already checked in",
            "already_checked_in": True,
            "name":               attendee.name,
            "print_url":          f"/api/v1/gate/print/{attendee.id}",
        }

    # Generate badge first
    badge_path = generate_badge(
        name         = attendee.name,
        company      = attendee.company or "",
        designation  = attendee.designation or "",
        qr_id        = attendee.qr_id,
        qr_code_path = attendee.qr_code_path,
        photo_path   = attendee.photo_path,
        event_name   = event.name if event else "",
        email        = attendee.email or "",
    )

    # Save attendance with badge_path in ONE commit
    attendance = Attendance(
        attendee_id   = attendee.id,
        event_id      = attendee.event_id,
        badge_printed = True,
        badge_path    = badge_path,        # ← in same commit, no second commit needed
    )
    db.add(attendance)
    db.commit()

    return {
        "success":    True,
        "message":    f"Welcome, {attendee.name}!",
        "name":       attendee.name,
        "badge_path": badge_path,
        "print_url":  f"/api/v1/gate/print/{attendee.id}",
    }


# ── Print badge ───────────────────────────────────────────────────────────────
@router.get("/gate/print/{attendee_id}")
def print_badge(attendee_id: int, db: Session = Depends(get_db)):
    attendance = db.query(Attendance).filter(
        Attendance.attendee_id == attendee_id
    ).first()
    if not attendance:
        raise HTTPException(404, "Attendance record not found")
    if not attendance.badge_path or not os.path.exists(attendance.badge_path):
        raise HTTPException(404, "Badge file not found")
    return FileResponse(
        attendance.badge_path,
        media_type = "application/pdf",
        headers    = {"Content-Disposition": "inline"},
    )