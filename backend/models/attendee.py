from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime


class Attendee(Base):
    __tablename__ = "attendees"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    company = Column(String(255))
    email = Column(String(255), nullable=False)
    qr_id = Column(String(100), unique=True, nullable=False)   # unique scan code
    qr_code_path = Column(String(500))                          # path to QR image
    photo_url = Column(String(500))                             # captured photo
    registered_at = Column(TIMESTAMP, default=datetime.utcnow)

    event = relationship("Event", backref="attendees")
    attendance = relationship("Attendance", back_populates="attendee", uselist=False)
