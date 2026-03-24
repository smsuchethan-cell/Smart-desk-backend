from sqlalchemy import Column, Integer, String, Float, Text, TIMESTAMP
from database.db import Base
from datetime import datetime


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Float)
    specs = Column(Text)               # JSON string or plain text specs
    image_url = Column(String(500))
    video_url = Column(String(500))
    qr_code_path = Column(String(500))  # path to generated QR image
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)