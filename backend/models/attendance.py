from sqlalchemy import Column, Integer, ForeignKey, Boolean, TIMESTAMP
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    attendee_id = Column(Integer, ForeignKey("attendees.id", ondelete="CASCADE"), nullable=False, unique=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    checked_in_at = Column(TIMESTAMP, default=datetime.utcnow)
    badge_printed = Column(Boolean, default=False)

    attendee = relationship("Attendee", back_populates="attendance")
    event = relationship("Event", backref="attendance_records")
