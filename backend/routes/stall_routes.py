from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, date
from database.db import get_db
from models.stall_status import StallStatus

router = APIRouter()

# If the Pi hasn't sent a heartbeat in this many seconds, treat the camera as offline.
HEARTBEAT_TIMEOUT_SECONDS = 30


def get_singleton(db: Session) -> StallStatus:
    row = db.query(StallStatus).filter(StallStatus.id == 1).first()
    if not row:
        row = StallStatus(id=1, today_date=str(date.today()))
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def check_and_reset(db: Session, row: StallStatus) -> StallStatus:
    """Reset today's count if the date has changed."""
    today = str(date.today())
    if row.today_date != today:
        row.yesterday_count = row.today_count
        row.today_count = 0
        row.today_date = today
        db.commit()
        db.refresh(row)
    return row


@router.post("/stall/update")
def update_stall_count(count: int, db: Session = Depends(get_db)):
    row = get_singleton(db)
    row = check_and_reset(db, row)

    # Only update if count is higher than current
    # (Pi sends its own cumulative unique-visitor count for today, we just store it)
    if count > row.today_count:
        diff = count - row.today_count
        row.today_count = count
        row.total_count += diff

    row.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "updated", "count": count}


@router.post("/stall/heartbeat")
def stall_heartbeat(db: Session = Depends(get_db)):
    """Called frequently by the Pi just to prove it's connected and running,
    independent of whether the visitor count changed this cycle."""
    row = get_singleton(db)
    row.last_heartbeat = datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@router.get("/stall/count")
def get_stall_count(db: Session = Depends(get_db)):
    row = get_singleton(db)
    row = check_and_reset(db, row)

    camera_live = (
        row.last_heartbeat is not None
        and (datetime.utcnow() - row.last_heartbeat).total_seconds() < HEARTBEAT_TIMEOUT_SECONDS
    )

    return {
        "today_count":     row.today_count,
        "yesterday_count": row.yesterday_count,
        "total_count":     row.total_count,
        "today_date":      row.today_date,
        "last_updated":    row.last_updated.isoformat() if row.last_updated else None,
        "camera_live":     camera_live,
        "latitude":        row.latitude,
        "longitude":       row.longitude,
    }


@router.post("/stall/reset")
def reset_stall_count(db: Session = Depends(get_db)):
    row = get_singleton(db)
    row.yesterday_count = row.today_count
    row.today_count = 0
    row.today_date = str(date.today())
    row.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "reset"}


# ============================================================
# GPS LOCATION APIs
# ============================================================

@router.post("/stall/gps")
def update_gps(latitude: float, longitude: float, db: Session = Depends(get_db)):
    row = get_singleton(db)
    row.latitude = latitude
    row.longitude = longitude
    row.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "GPS Updated", "latitude": latitude, "longitude": longitude}


@router.get("/stall/gps")
def get_gps(db: Session = Depends(get_db)):
    row = get_singleton(db)
    return {"latitude": row.latitude, "longitude": row.longitude}
