from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MeetingCreate(BaseModel):
    title:      str
    room:       Optional[str] = None
    organizer:  Optional[str] = None
    start_time: datetime
    end_time:   datetime


class MeetingResponse(BaseModel):
    id:         int
    title:      str
    room:       Optional[str]
    organizer:  Optional[str]
    start_time: datetime
    end_time:   datetime
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}
