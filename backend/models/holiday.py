from sqlalchemy import Column, Integer, String, Date, TIMESTAMP
from datetime import datetime, timezone
from database.db import Base


class Holiday(Base):
    __tablename__ = "holidays"

    id         = Column(Integer, primary_key=True, index=True)
    date       = Column(Date, nullable=False, unique=True)
    name       = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
