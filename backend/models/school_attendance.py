from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database.db import Base


class SchoolAttendance(Base):
    __tablename__ = "school_attendance"

    id           = Column(Integer, primary_key=True, index=True)
    student_id   = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    marked_at    = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    confidence   = Column(Float)  # LBPH distance score from the Pi (lower = more confident)

    student = relationship("Student", backref="attendance_records")
