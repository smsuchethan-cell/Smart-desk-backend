from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date
from io import BytesIO
from openpyxl import Workbook
from database.db import get_db
from models.student import Student
from models.school_attendance import SchoolAttendance
from models.holiday import Holiday
from models.leave import Leave
from schemas.holiday import HolidayCreate, HolidayResponse
from schemas.leave import LeaveCreate, LeaveResponse
from typing import List

router = APIRouter()


# ── Mark attendance (called by the Pi after a face match) ────────────────────
@router.post("/school/attendance")
def mark_attendance(
    roll_number: str   = Form(...),
    confidence:  float = Form(None),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.roll_number == roll_number).first()
    if not student:
        raise HTTPException(404, f"No student with roll number {roll_number}")

    today = date.today()
    already = (
        db.query(SchoolAttendance)
        .filter(
            SchoolAttendance.student_id == student.id,
            SchoolAttendance.marked_at >= today,
        )
        .first()
    )
    if already:
        return {
            "success": True,
            "already_marked": True,
            "message": f"{student.name} already marked present today",
        }

    record = SchoolAttendance(student_id=student.id, confidence=confidence)
    db.add(record)
    db.commit()

    return {
        "success": True,
        "already_marked": False,
        "message": f"Marked {student.name} present",
    }


def _students_on_leave_today(db: Session) -> dict:
    """Returns {student_id: reason} for every student with an approved Leave
    covering today's date."""
    today = date.today()
    rows = (
        db.query(Leave)
        .filter(Leave.date_from <= today, Leave.date_to >= today)
        .all()
    )
    return {row.student_id: row.reason for row in rows}


# ── Today's attendance report ─────────────────────────────────────────────────
@router.get("/school/attendance/today")
def today_attendance(db: Session = Depends(get_db)):
    today = date.today()
    total_students = db.query(Student).count()
    on_leave_map = _students_on_leave_today(db)

    records = (
        db.query(SchoolAttendance, Student)
        .join(Student, Student.id == SchoolAttendance.student_id)
        .filter(SchoolAttendance.marked_at >= today)
        .order_by(SchoolAttendance.marked_at.desc())
        .all()
    )

    present = [
        {
            "student_id":   s.id,
            "name":         s.name,
            "roll_number":  s.roll_number,
            "class_section": s.class_section,
            "marked_at":    rec.marked_at,
        }
        for rec, s in records
    ]
    present_ids = {p["student_id"] for p in present}

    # A student can't be both present and on leave — present takes priority
    # (they showed up despite the leave request being on file).
    on_leave = [
        {
            "student_id":   s.id,
            "name":         s.name,
            "roll_number":  s.roll_number,
            "class_section": s.class_section,
            "reason":       on_leave_map[s.id],
        }
        for s in db.query(Student).filter(Student.id.in_(on_leave_map.keys())).all()
        if s.id not in present_ids
    ]
    on_leave_ids = {s["student_id"] for s in on_leave}

    return {
        "total_students": total_students,
        "present_count":  len(present),
        "on_leave_count": len(on_leave),
        "absent_count":   total_students - len(present) - len(on_leave),
        "present":        present,
        "on_leave":       on_leave,
    }


# ── Class-wise attendance breakdown (School Analytics Dashboard) ─────────────
@router.get("/school/analytics/class-breakdown")
def class_breakdown(db: Session = Depends(get_db)):
    today = date.today()
    students = db.query(Student).all()
    on_leave_map = _students_on_leave_today(db)

    present_student_ids = {
        row[0] for row in (
            db.query(SchoolAttendance.student_id)
            .filter(SchoolAttendance.marked_at >= today)
            .all()
        )
    }

    classes = {}
    for s in students:
        key = s.class_section or "Unassigned"
        bucket = classes.setdefault(key, {"total": 0, "present": 0, "on_leave": 0})
        bucket["total"] += 1
        if s.id in present_student_ids:
            bucket["present"] += 1
        elif s.id in on_leave_map:
            bucket["on_leave"] += 1

    return [
        {
            "class_section": key,
            "total":         v["total"],
            "present":       v["present"],
            "on_leave":      v["on_leave"],
            "absent":        v["total"] - v["present"] - v["on_leave"],
        }
        for key, v in sorted(classes.items())
    ]


# ── Holidays ──────────────────────────────────────────────────────────────────
@router.post("/school/holidays", response_model=HolidayResponse)
def create_holiday(payload: HolidayCreate, db: Session = Depends(get_db)):
    existing = db.query(Holiday).filter(Holiday.date == payload.date).first()
    if existing:
        raise HTTPException(400, f"{payload.date} is already marked as a holiday")
    holiday = Holiday(**payload.model_dump())
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


@router.get("/school/holidays", response_model=List[HolidayResponse])
def list_holidays(db: Session = Depends(get_db)):
    return db.query(Holiday).order_by(Holiday.date).all()


@router.delete("/school/holidays/{holiday_id}")
def delete_holiday(holiday_id: int, db: Session = Depends(get_db)):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(404, "Holiday not found")
    db.delete(holiday)
    db.commit()
    return {"message": f"Holiday {holiday_id} deleted"}


# ── Leaves ────────────────────────────────────────────────────────────────────
@router.post("/school/leaves", response_model=LeaveResponse)
def create_leave(payload: LeaveCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    if payload.date_to < payload.date_from:
        raise HTTPException(400, "date_to cannot be before date_from")
    leave = Leave(**payload.model_dump())
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


@router.get("/school/leaves", response_model=List[LeaveResponse])
def list_leaves(student_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Leave)
    if student_id:
        query = query.filter(Leave.student_id == student_id)
    return query.order_by(Leave.date_from.desc()).all()


@router.delete("/school/leaves/{leave_id}")
def delete_leave(leave_id: int, db: Session = Depends(get_db)):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(404, "Leave not found")
    db.delete(leave)
    db.commit()
    return {"message": f"Leave {leave_id} deleted"}


# ── Annual report export (Excel) ──────────────────────────────────────────────
@router.get("/school/report/annual")
def export_annual_report(db: Session = Depends(get_db)):
    students = db.query(Student).order_by(Student.class_section, Student.name).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Annual Attendance"
    ws.append(["ID", "Name", "Roll Number", "Class", "Total Days Present", "Registered At"])

    for s in students:
        days_present = db.query(SchoolAttendance).filter(SchoolAttendance.student_id == s.id).count()
        ws.append([
            s.id,
            s.name,
            s.roll_number,
            s.class_section or "",
            days_present,
            s.registered_at.strftime("%Y-%m-%d") if s.registered_at else "",
        ])

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=annual_attendance_report.xlsx"},
    )
