from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database.db import get_db
from models.student import Student
from models.school_attendance import SchoolAttendance
from models.leave import Leave
from schemas.student import StudentResponse
from typing import List
import uuid, os, shutil

router = APIRouter()

UPLOAD_DIR = "static/students"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Register a student (with reference photo for face recognition) ───────────
@router.post("/students", response_model=StudentResponse)
async def create_student(
    name:          str        = Form(...),
    roll_number:   str        = Form(...),
    class_section: str        = Form(""),
    photo:         UploadFile = File(...),
    db:            Session    = Depends(get_db),
):
    existing = db.query(Student).filter(Student.roll_number == roll_number).first()
    if existing:
        raise HTTPException(400, f"Roll number {roll_number} is already registered")

    ext       = os.path.splitext(photo.filename)[1] or ".jpg"
    filename  = f"{roll_number}_{uuid.uuid4().hex[:6]}{ext}"
    save_path = f"{UPLOAD_DIR}/{filename}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(photo.file, f)

    student = Student(
        name          = name,
        roll_number   = roll_number,
        class_section = class_section,
        photo_path    = save_path,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


# ── List (also used by the Pi to sync known faces) ────────────────────────────
@router.get("/students", response_model=List[StudentResponse])
def list_students(class_section: str = None, db: Session = Depends(get_db)):
    query = db.query(Student)
    if class_section:
        query = query.filter(Student.class_section == class_section)
    return query.order_by(Student.name).all()


@router.get("/students/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    return student


@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    # Explicit cleanup rather than relying on the DB's ON DELETE CASCADE —
    # that constraint isn't actually enforced on tables created before it was
    # added to the model (same issue found on product deletion).
    db.query(SchoolAttendance).filter(SchoolAttendance.student_id == student_id).delete()
    db.query(Leave).filter(Leave.student_id == student_id).delete()

    db.delete(student)
    db.commit()
    return {"message": f"Student {student_id} deleted"}
