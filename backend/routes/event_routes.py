from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.event import Event
from models.attendee import Attendee
from models.attendance import Attendance
from schemas.event import EventCreate, EventUpdate, EventResponse
from typing import List

router = APIRouter()


@router.post("/events", response_model=EventResponse)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/events", response_model=List[EventResponse])
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).order_by(Event.created_at.desc()).all()


@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Explicit cleanup rather than relying on the DB's ON DELETE CASCADE —
    # that constraint isn't actually enforced on tables created before it was
    # added to the model (same issue found on product deletion).
    db.query(Attendance).filter(Attendance.event_id == event_id).delete()
    db.query(Attendee).filter(Attendee.event_id == event_id).delete()

    db.delete(event)
    db.commit()
    return {"message": f"Event {event_id} deleted"}
