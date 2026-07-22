from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EnquiryCreate(BaseModel):
    product_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None


class EnquiryResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    name: str
    email: Optional[str]
    phone: Optional[str]
    message: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}
