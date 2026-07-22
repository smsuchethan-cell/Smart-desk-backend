from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StudentResponse(BaseModel):
    id:            int
    name:          str
    roll_number:   str
    class_section: Optional[str]
    photo_path:    Optional[str]
    registered_at: Optional[datetime]

    model_config = {"from_attributes": True}
