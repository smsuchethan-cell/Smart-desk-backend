from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from database.db import get_db
from models.scan_log import ScanLog
from models.attendance import Attendance
from models.product import Product
from models.event import Event
from models.attendee import Attendee
from datetime import date

router = APIRouter()


@router.get("/analytics/scans")
def scan_analytics(db: Session = Depends(get_db)):
    results = (
        db.query(
            Product.id,
            Product.name,
            func.count(ScanLog.id).label("total_scans"),
        )
        .join(ScanLog, ScanLog.product_id == Product.id, isouter=True)
        .group_by(Product.id, Product.name)
        .order_by(func.count(ScanLog.id).desc())
        .all()
    )
    return [
        {"product_id": r.id, "product_name": r.name, "total_scans": r.total_scans}
        for r in results
    ]


@router.get("/analytics/top-products")
def top_products(limit: int = 5, db: Session = Depends(get_db)):
    results = (
        db.query(
            Product.id,
            Product.name,
            Product.price,
            Product.image_url,
            func.count(ScanLog.id).label("total_scans"),
        )
        .join(ScanLog, ScanLog.product_id == Product.id, isouter=True)
        .group_by(Product.id, Product.name, Product.price, Product.image_url)
        .order_by(func.count(ScanLog.id).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "product_id":   r.id,
            "product_name": r.name,
            "price":        r.price,
            "image_url":    r.image_url,
            "total_scans":  r.total_scans,
        }
        for r in results
    ]


@router.get("/analytics/attendance")
def attendance_analytics(db: Session = Depends(get_db)):
    results = (
        db.query(
            Event.id,
            Event.name,
            func.count(Attendance.id).label("total_checked_in"),
        )
        .join(Attendance, Attendance.event_id == Event.id, isouter=True)
        .group_by(Event.id, Event.name)
        .order_by(func.count(Attendance.id).desc())
        .all()
    )
    return [
        {"event_id": r.id, "event_name": r.name, "total_checked_in": r.total_checked_in}
        for r in results
    ]


@router.get("/analytics/summary")
def summary(db: Session = Depends(get_db)):
    total_products   = db.query(Product).count()
    total_scans      = db.query(ScanLog).count()
    total_events     = db.query(Event).count()
    total_checked_in = db.query(Attendance).count()
    return {
        "total_products":   total_products,
        "total_scans":      total_scans,
        "total_events":     total_events,
        "total_checked_in": total_checked_in,
    }


@router.get("/analytics/attendance-summary")
def attendance_summary(db: Session = Depends(get_db)):
    today = date.today()

    # 1. Unique people who checked in today
    today_count = (
        db.query(func.count(distinct(Attendance.attendee_id)))
        .join(Event, Event.id == Attendance.event_id)
        .filter(Event.date == str(today))   # ← fixed
        .scalar()
    )

    # 2. All check-ins from past events (before today)
    previous_total = (
        db.query(func.count(Attendance.id))
        .join(Event, Event.id == Attendance.event_id)
        .filter(Event.date < str(today))    # ← fixed
        .scalar()
    )

    # 3. Total unique registered people
    total_unique_people = db.query(Attendee).count()

    # 4. Every check-in ever
    all_time_total = db.query(Attendance).count()

    return {
        "today_count":         today_count or 0,
        "previous_total":      previous_total or 0,
        "total_unique_people": total_unique_people or 0,
        "all_time_total":      all_time_total or 0,
    }