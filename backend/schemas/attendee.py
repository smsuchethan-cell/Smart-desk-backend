from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AttendeeCreate(BaseModel):
    event_id:    int
    name:        str
    company:     Optional[str] = None
    email:       str
    phone:       Optional[str] = None
    designation: Optional[str] = None


class AttendeeResponse(BaseModel):
    id:            int
    event_id:      int
    name:          str
    company:       Optional[str]
    email:         str
    phone:         Optional[str] = None
    designation:   Optional[str]
    unique_code:   Optional[str]
    qr_id:         str
    qr_code_path:  Optional[str]
    photo_path:    Optional[str]
    registered_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CheckInResponse(BaseModel):
    success:            bool
    message:            str
    attendee:           Optional[AttendeeResponse] = None
    badge_path:         Optional[str] = None
    already_checked_in: bool = False