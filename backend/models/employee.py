from sqlalchemy import Column, Integer, String, TIMESTAMP
from datetime import datetime, timezone
from database.db import Base


class Employee(Base):
    __tablename__ = "employees"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(255), nullable=False)
    email         = Column(String(255))
    phone         = Column(String(50))
    department    = Column(String(100))
    designation   = Column(String(100))
    photo_path    = Column(String(500))
    joined_at     = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
