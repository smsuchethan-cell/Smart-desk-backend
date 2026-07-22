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


@router.get("/analytics/revenue-potential")
def revenue_potential(db: Session = Depends(get_db)):
    """Theoretical revenue if every recorded scan became a sale — a simple,
    honest 'ceiling' metric built purely from real scan counts and real
    product prices, not a fabricated conversion-rate assumption."""
    results = (
        db.query(
            Product.id,
            Product.name,
            Product.price,
            func.count(ScanLog.id).label("total_scans"),
        )
        .join(ScanLog, ScanLog.product_id == Product.id, isouter=True)
        .group_by(Product.id, Product.name, Product.price)
        .all()
    )

    breakdown = [
        {
            "product_id":       r.id,
            "product_name":     r.name,
            "price":            r.price or 0,
            "total_scans":      r.total_scans,
            "revenue_potential": (r.price or 0) * r.total_scans,
        }
        for r in results
    ]
    breakdown.sort(key=lambda r: r["revenue_potential"], reverse=True)

    return {
        "total_revenue_potential": sum(r["revenue_potential"] for r in breakdown),
        "products": breakdown,
    }


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

    # Bucket by the actual check-in timestamp rather than the event's
    # (optional, manually-entered) date field, so two events running at once
    # both count correctly even if one has no date set.

    # 1. Unique people who checked in today
    today_count = (
        db.query(func.count(distinct(Attendance.attendee_id)))
        .filter(func.date(Attendance.checked_in_at) == today)
        .scalar()
    )

    # 2. All check-ins from before today
    previous_total = (
        db.query(func.count(Attendance.id))
        .filter(func.date(Attendance.checked_in_at) < today)
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


@router.get("/analytics/hourly-traffic")
def hourly_traffic(db: Session = Depends(get_db)):
    """Today's check-ins bucketed by hour of day (0-23), zero-filled for a clean chart."""
    today = date.today()
    results = (
        db.query(
            func.extract("hour", Attendance.checked_in_at).label("hour"),
            func.count(Attendance.id).label("count"),
        )
        .filter(func.date(Attendance.checked_in_at) == today)
        .group_by("hour")
        .all()
    )
    counts = {int(r.hour): r.count for r in results}
    return [{"hour": h, "checkins": counts.get(h, 0)} for h in range(24)]


@router.get("/analytics/recent-checkins")
def recent_checkins(limit: int = 10, db: Session = Depends(get_db)):
    """Most recent check-ins across all events, for real-time dashboard alerts."""
    results = (
        db.query(Attendance, Attendee, Event)
        .join(Attendee, Attendee.id == Attendance.attendee_id)
        .join(Event, Event.id == Attendance.event_id)
        .order_by(Attendance.checked_in_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "attendance_id": att.id,
            "attendee_name": a.name,
            "company":       a.company,
            "event_name":    ev.name,
            "checked_in_at": att.checked_in_at,
        }
        for att, a, ev in results
    ]