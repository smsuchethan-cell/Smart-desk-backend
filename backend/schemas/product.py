from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    specs: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    specs: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: Optional[float]
    specs: Optional[str]
    image_url: Optional[str]
    video_url: Optional[str]
    qr_code_path: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}
