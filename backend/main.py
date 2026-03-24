from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database.db import engine, Base

# Import all models so SQLAlchemy registers them before create_all
from models import product, event, attendee, attendance, scan_log, enquiry  # noqa

from routes import (
    product_routes,
    event_routes,
    attendee_routes,
    analytics_routes,
    enquiry_routes,
    qr_routes,
)

app = FastAPI(
    title="Smart Digital Desk API",
    description="Backend API for Smart Digital Desk — QR-based product info & event check-in system",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (generated QR codes & badge images) ─────────────────────────
os.makedirs("static/qr", exist_ok=True)
os.makedirs("static/badges", exist_ok=True)
os.makedirs("static/photos", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Create all DB tables ───────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(product_routes.router,   prefix="/api/v1", tags=["Products"])
app.include_router(event_routes.router,     prefix="/api/v1", tags=["Events"])
app.include_router(attendee_routes.router,  prefix="/api/v1", tags=["Attendees"])
app.include_router(analytics_routes.router, prefix="/api/v1", tags=["Analytics"])
app.include_router(enquiry_routes.router,   prefix="/api/v1", tags=["Enquiries"])
app.include_router(qr_routes.router,        prefix="/api/v1", tags=["QR Scanner"])


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "message": "Smart Digital Desk Backend v2.0 — PostgreSQL",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}