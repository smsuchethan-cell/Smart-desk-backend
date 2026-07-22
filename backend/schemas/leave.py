from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class LeaveCreate(BaseModel):
    student_id: int
    date_from:  date
    date_to:    date
    reason:     Optional[str] = None


class LeaveResponse(BaseModel):
    id:         int
    student_id: int
    date_from:  date
    date_to:    date
    reason:     Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}
