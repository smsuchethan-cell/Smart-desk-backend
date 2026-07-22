from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EmployeeResponse(BaseModel):
    id:            int
    name:          str
    email:         Optional[str]
    phone:         Optional[str]
    department:    Optional[str]
    designation:   Optional[str]
    photo_path:    Optional[str]
    joined_at:     Optional[datetime]

    model_config = {"from_attributes": True}
