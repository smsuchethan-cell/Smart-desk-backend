from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from datetime import date
from database.db import get_db
from models.student import Student
from models.school_attendance import SchoolAttendance

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


# ── Today's attendance report ─────────────────────────────────────────────────
@router.get("/school/attendance/today")
def today_attendance(db: Session = Depends(get_db)):
    today = date.today()
    total_students = db.query(Student).count()

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

    return {
        "total_students": total_students,
        "present_count":  len(present),
        "absent_count":   total_students - len(present),
        "present":        present,
    }
