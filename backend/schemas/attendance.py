from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AttendanceResponse(BaseModel):
    id: int
    attendee_id: int
    event_id: int
    checked_in_at: Optional[datetime]
    badge_printed: bool

    model_config = {"from_attributes": True}
