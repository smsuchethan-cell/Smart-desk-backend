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

    # Passively captured — no form, no permission prompt. device/browser
    # come from the User-Agent header; city/region/country from an IP
    # geolocation lookup (approximate, not exact GPS); time_spent_seconds
    # is filled in later via a sendBeacon call when the visitor leaves.
    device             = Column(String(50))
    browser            = Column(String(50))
    city               = Column(String(100))
    region             = Column(String(100))
    country            = Column(String(100))
    time_spent_seconds = Column(Integer)

    product = relationship("Product", backref="scan_logs")
