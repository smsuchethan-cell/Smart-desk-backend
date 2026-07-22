from sqlalchemy import Column, Integer, String, Date, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database.db import Base


class Leave(Base):
    __tablename__ = "leaves"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date_from  = Column(Date, nullable=False)
    date_to    = Column(Date, nullable=False)
    reason     = Column(String(500))
    created_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))

    student = relationship("Student", backref="leaves")
