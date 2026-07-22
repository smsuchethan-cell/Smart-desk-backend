from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime, timezone


class Attendee(Base):
    __tablename__ = "attendees"

    id            = Column(Integer, primary_key=True, index=True)
    event_id      = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name          = Column(String(255), nullable=False)
    company       = Column(String(255))
    email         = Column(String(255), nullable=False)
    phone         = Column(String(50))
    designation   = Column(String(255))
    unique_code   = Column(String(20), unique=True)
    qr_id         = Column(String(100), unique=True, nullable=False)
    qr_code_path  = Column(String(500))
    photo_path    = Column(String(500))
    registered_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))

    event      = relationship("Event", backref="attendees")
    attendance = relationship("Attendance", back_populates="attendee", uselist=False)