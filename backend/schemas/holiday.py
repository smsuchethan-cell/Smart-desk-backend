from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class HolidayCreate(BaseModel):
    date: date
    name: str


class HolidayResponse(BaseModel):
    id:         int
    date:       date
    name:       str
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}
