from sqlalchemy import Column, Integer, String, TIMESTAMP
from datetime import datetime, timezone
from database.db import Base


class Student(Base):
    __tablename__ = "students"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(255), nullable=False)
    roll_number    = Column(String(50), unique=True, nullable=False)
    class_section  = Column(String(50))
    photo_path     = Column(String(500))
    registered_at  = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
