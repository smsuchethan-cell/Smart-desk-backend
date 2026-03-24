from sqlalchemy import Column, Integer, String, Text, Date, TIMESTAMP
from database.db import Base
from datetime import datetime


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    date = Column(Date)
    location = Column(String(255))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
