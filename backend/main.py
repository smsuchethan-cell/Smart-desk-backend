from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
import os

from database.db import engine, Base

# Import all models so SQLAlchemy registers them before create_all
from models import product, event, attendee, attendance, scan_log, enquiry, student, school_attendance, holiday, leave, stall_status, employee, employee_checkin, meeting  # noqa

from routes import (
    product_routes,
    event_routes,
    attendee_routes,
    analytics_routes,
    enquiry_routes,
    qr_routes,
    stall_routes,              # ← NEW
    student_routes,
    school_routes,
    corporate_routes,
    auth_routes,
    chat_routes,
)
from fastapi import Depends
from utils.auth import require_auth

app = FastAPI(
    title="Smart Digital Desk API",
    description="Backend API for Smart Digital Desk — QR-based product info & event check-in system",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
FRONTEND_ORIGINS = [
    "https://smart-desk-backend-1.onrender.com",  # deployed React frontend (Render static site)
    "http://localhost:3000",                      # local dev (react-scripts start)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ──────────────────────────────────────────────────────────────
os.makedirs("static/qr",       exist_ok=True)
os.makedirs("static/badges",   exist_ok=True)
os.makedirs("static/photos",   exist_ok=True)
os.makedirs("static/students", exist_ok=True)
os.makedirs("static/employees", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Create all DB tables ──────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Lightweight column migrations ───────────────────────────────────────────
# create_all() only creates missing TABLES — it never alters columns on
# tables that already exist. There's no Alembic set up in this project, so
# new columns on pre-existing tables need to be added explicitly here.
# Each statement is idempotent (safe to run on every startup).
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE attendees ADD COLUMN IF NOT EXISTS phone VARCHAR(50)"))
    conn.execute(text("ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS device VARCHAR(50)"))
    conn.execute(text("ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS browser VARCHAR(50)"))
    conn.execute(text("ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS city VARCHAR(100)"))
    conn.execute(text("ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS region VARCHAR(100)"))
    conn.execute(text("ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS country VARCHAR(100)"))
    conn.execute(text("ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER"))
    conn.execute(text("ALTER TABLE school_attendance ADD COLUMN IF NOT EXISTS left_at TIMESTAMP"))

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(product_routes.router,   prefix="/api/v1", tags=["Products"])
app.include_router(event_routes.router,     prefix="/api/v1", tags=["Events"])
app.include_router(attendee_routes.router,  prefix="/api/v1", tags=["Attendees"])
app.include_router(analytics_routes.router, prefix="/api/v1", tags=["Analytics"], dependencies=[Depends(require_auth)])
app.include_router(enquiry_routes.router,   prefix="/api/v1", tags=["Enquiries"])
app.include_router(qr_routes.router,        prefix="/api/v1", tags=["QR Scanner"])
app.include_router(stall_routes.router,     prefix="/api/v1", tags=["Stall"])  # ← NEW
app.include_router(student_routes.router,   prefix="/api/v1", tags=["Students"])
app.include_router(school_routes.router,    prefix="/api/v1", tags=["School"])
app.include_router(corporate_routes.router, prefix="/api/v1", tags=["Corporate"], dependencies=[Depends(require_auth)])
app.include_router(auth_routes.router,      prefix="/api/v1", tags=["Auth"])
app.include_router(chat_routes.router,      prefix="/api/v1", tags=["Help Bot"])


# ── Health ────────────────────────────────────────────────────────────────────
# Note: the real gate/register pages are on the React frontend now
# (smart-desk-backend-1.onrender.com/gate and /register/:eventId) — this
# API used to also serve its own standalone versions of both from static
# HTML files, from before those frontend pages existed. Removed as dead code.
@app.get("/", tags=["Health"])
def root():
    return {
        "status":  "online",
        "message": "Smart Digital Desk Backend v2.0",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}