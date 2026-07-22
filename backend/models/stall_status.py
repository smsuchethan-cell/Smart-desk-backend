from sqlalchemy import Column, Integer, String, Float, TIMESTAMP
from database.db import Base


class StallStatus(Base):
    """Single-row table (id is always 1) tracking the live footfall counter,
    GPS location, and camera heartbeat. Was previously a JSON file on local
    disk, which gets wiped on every Render redeploy — moved to the DB so
    the counter and camera-live status actually persist."""
    __tablename__ = "stall_status"

    id              = Column(Integer, primary_key=True)
    today_count     = Column(Integer, default=0)
    yesterday_count = Column(Integer, default=0)
    total_count     = Column(Integer, default=0)
    today_date      = Column(String(20))
    latitude        = Column(Float)
    longitude       = Column(Float)
    last_updated    = Column(TIMESTAMP)
    last_heartbeat  = Column(TIMESTAMP)
