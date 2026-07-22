from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse
import os, io, socket
import qrcode

from database.db import engine, Base

# Import all models so SQLAlchemy registers them before create_all
from models import product, event, attendee, attendance, scan_log, enquiry, student, school_attendance, holiday, leave, stall_status  # noqa

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
)

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
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Create all DB tables ──────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(product_routes.router,   prefix="/api/v1", tags=["Products"])
app.include_router(event_routes.router,     prefix="/api/v1", tags=["Events"])
app.include_router(attendee_routes.router,  prefix="/api/v1", tags=["Attendees"])
app.include_router(analytics_routes.router, prefix="/api/v1", tags=["Analytics"])
app.include_router(enquiry_routes.router,   prefix="/api/v1", tags=["Enquiries"])
app.include_router(qr_routes.router,        prefix="/api/v1", tags=["QR Scanner"])
app.include_router(stall_routes.router,     prefix="/api/v1", tags=["Stall"])  # ← NEW
app.include_router(student_routes.router,   prefix="/api/v1", tags=["Students"])
app.include_router(school_routes.router,    prefix="/api/v1", tags=["School"])


# ── Gate page (mobile) ────────────────────────────────────────────────────────
@app.get("/gate", response_class=HTMLResponse, tags=["Gate"])
def gate_page():
    gate_html = "static/gate.html"
    if not os.path.exists(gate_html):
        return HTMLResponse("<h2>gate.html not found in static/</h2>", status_code=404)
    with open(gate_html, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


# ── Self-registration page ────────────────────────────────────────────────────
@app.get("/register", response_class=HTMLResponse, tags=["Gate"])
def register_page():
    path = "static/register.html"
    if not os.path.exists(path):
        return HTMLResponse("<h2>register.html not found in static/</h2>", status_code=404)
    with open(path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


# ── System QR ─────────────────────────────────────────────────────────────────
@app.get("/system-qr", tags=["Gate"])
def system_qr():
    try:
        hostname = socket.gethostname()
        ip       = socket.gethostbyname(hostname)
    except Exception:
        ip = "localhost"

    gate_url = f"http://{ip}:8000/gate"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(gate_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#6c63ff", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"X-Gate-URL": gate_url},
    )


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "status":   "online",
        "message":  "Smart Digital Desk Backend v2.0",
        "docs":     "/docs",
        "gate":     "/gate",
        "register": "/register",
        "qr":       "/system-qr",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}