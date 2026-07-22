from sqlalchemy import Column, Integer, String, TIMESTAMP
from datetime import datetime, timezone
from database.db import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(255), nullable=False)
    room       = Column(String(100))
    organizer  = Column(String(255))
    start_time = Column(TIMESTAMP, nullable=False)
    end_time   = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
