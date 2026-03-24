from sqlalchemy import Column, Integer, ForeignKey, String, TIMESTAMP
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime


class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    scanned_at = Column(TIMESTAMP, default=datetime.utcnow)
    ip_address = Column(String(50))

    product = relationship("Product", backref="scan_logs")
