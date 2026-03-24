from sqlalchemy import Column, Integer, ForeignKey, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    message = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    product = relationship("Product", backref="enquiries")
