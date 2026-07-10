from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from database.db import Base
from datetime import datetime, timezone


class Event(Base):
    __tablename__ = "events"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(255), nullable=False)
    description = Column(Text)
    date        = Column(String(50))
    location    = Column(String(255))
    created_at  = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))