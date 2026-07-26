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

    # Updated (not inserted) on every later sighting of the same student the
    # same day, at the same entry/exit camera — so it settles on whatever
    # was the last time they were seen, an approximation of when they left
    # since there's no separate exit-facing camera.
    left_at      = Column(TIMESTAMP, nullable=True)

    student = relationship("Student", backref="attendance_records")
