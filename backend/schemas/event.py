from pydantic import BaseModel, validator
from typing import Optional
from datetime import date, datetime


class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None


class EventResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    date: Optional[str]
    location: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}