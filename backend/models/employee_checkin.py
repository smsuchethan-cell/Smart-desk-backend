from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from datetime import datetime
from database.db import Base


class EmployeeCheckin(Base):
    __tablename__ = "employee_checkins"

    id            = Column(Integer, primary_key=True, index=True)
    employee_id   = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    checked_in_at = Column(TIMESTAMP, default=datetime.utcnow)

    employee = relationship("Employee", backref="checkins")
