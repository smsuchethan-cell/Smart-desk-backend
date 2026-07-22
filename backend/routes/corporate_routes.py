from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import date, datetime
from database.db import get_db
from models.employee import Employee
from models.employee_checkin import EmployeeCheckin
from models.meeting import Meeting
from schemas.employee import EmployeeResponse
from schemas.meeting import MeetingCreate, MeetingResponse
from typing import List
import os, uuid, shutil

router = APIRouter()

UPLOAD_DIR = "static/employees"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Employees ──────────────────────────────────────────────────────────────
@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(
    name:        str        = Form(...),
    email:       str        = Form(""),
    phone:       str        = Form(""),
    department:  str        = Form(""),
    designation: str        = Form(""),
    photo:       UploadFile = File(None),
    db: Session = Depends(get_db),
):
    photo_path = None
    if photo and photo.filename:
        ext       = os.path.splitext(photo.filename)[1] or ".jpg"
        filename  = f"{uuid.uuid4().hex}{ext}"
        save_path = f"{UPLOAD_DIR}/{filename}"
        with open(save_path, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_path = save_path

    employee = Employee(
        name=name, email=email, phone=phone,
        department=department, designation=designation, photo_path=photo_path,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(db: Session = Depends(get_db)):
    return db.query(Employee).order_by(Employee.name).all()


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(404, "Employee not found")
    db.query(EmployeeCheckin).filter(EmployeeCheckin.employee_id == employee_id).delete()
    db.delete(employee)
    db.commit()
    return {"message": f"Employee {employee_id} deleted"}


@router.post("/employees/{employee_id}/checkin")
def checkin_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(404, "Employee not found")

    today = date.today()
    already = (
        db.query(EmployeeCheckin)
        .filter(EmployeeCheckin.employee_id == employee_id, EmployeeCheckin.checked_in_at >= today)
        .first()
    )
    if already:
        return {"success": True, "already_checked_in": True, "message": f"{employee.name} already checked in today"}

    db.add(EmployeeCheckin(employee_id=employee_id))
    db.commit()
    return {"success": True, "already_checked_in": False, "message": f"Checked in {employee.name}"}


@router.get("/employees/checkins/today")
def today_employee_checkins(db: Session = Depends(get_db)):
    today = date.today()
    total_employees = db.query(Employee).count()

    records = (
        db.query(EmployeeCheckin, Employee)
        .join(Employee, Employee.id == EmployeeCheckin.employee_id)
        .filter(EmployeeCheckin.checked_in_at >= today)
        .order_by(EmployeeCheckin.checked_in_at.desc())
        .all()
    )
    present = [
        {
            "employee_id":  e.id,
            "name":         e.name,
            "department":   e.department,
            "designation":  e.designation,
            "checked_in_at": rec.checked_in_at,
        }
        for rec, e in records
    ]

    return {
        "total_employees": total_employees,
        "present_count":   len(present),
        "absent_count":    total_employees - len(present),
        "present":         present,
    }


@router.get("/corporate/analytics/department-breakdown")
def department_breakdown(db: Session = Depends(get_db)):
    today = date.today()
    employees = db.query(Employee).all()
    present_ids = {
        row[0] for row in (
            db.query(EmployeeCheckin.employee_id)
            .filter(EmployeeCheckin.checked_in_at >= today)
            .all()
        )
    }

    depts = {}
    for e in employees:
        key = e.department or "Unassigned"
        bucket = depts.setdefault(key, {"total": 0, "present": 0})
        bucket["total"] += 1
        if e.id in present_ids:
            bucket["present"] += 1

    return [
        {"department": k, "total": v["total"], "present": v["present"], "absent": v["total"] - v["present"]}
        for k, v in sorted(depts.items())
    ]


# ── Meetings ──────────────────────────────────────────────────────────────
@router.post("/meetings", response_model=MeetingResponse)
def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db)):
    if payload.end_time <= payload.start_time:
        raise HTTPException(400, "end_time must be after start_time")
    meeting = Meeting(**payload.model_dump())
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/meetings", response_model=List[MeetingResponse])
def list_meetings(db: Session = Depends(get_db)):
    return db.query(Meeting).order_by(Meeting.start_time).all()


@router.delete("/meetings/{meeting_id}")
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    db.delete(meeting)
    db.commit()
    return {"message": f"Meeting {meeting_id} deleted"}


@router.get("/meetings/status")
def meetings_status(db: Session = Depends(get_db)):
    """Classifies each meeting as upcoming/ongoing/completed based on the
    current time — powers Corporate mode's meeting-room status indicators."""
    now = datetime.utcnow()
    meetings = db.query(Meeting).order_by(Meeting.start_time).all()

    result = []
    for m in meetings:
        if now < m.start_time:
            status = "upcoming"
        elif m.start_time <= now <= m.end_time:
            status = "ongoing"
        else:
            status = "completed"
        result.append({
            "id": m.id, "title": m.title, "room": m.room, "organizer": m.organizer,
            "start_time": m.start_time, "end_time": m.end_time, "status": status,
        })
    return result
