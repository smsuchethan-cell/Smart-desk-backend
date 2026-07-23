from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.db import get_db, SessionLocal
from models.product import Product
from models.scan_log import ScanLog
from models.enquiry import Enquiry
from schemas.product import ProductCreate, ProductUpdate, ProductResponse
from utils.qr_generator import generate_qr
from utils.user_agent import parse_user_agent
from utils.geolocation import get_ip_location
from typing import List
import os

router = APIRouter()

# Public frontend origin — product QR codes link here so a visitor's own
# phone camera opens the product page (with its enquiry form) directly.
# Override via the FRONTEND_URL env var if the deployed frontend URL changes.
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://smart-desk-backend-1.onrender.com").rstrip("/")


@router.post("/products", response_model=ProductResponse)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)

    # Auto-generate QR code that links to the public product page, so a
    # visitor's own phone camera opens it directly (desk USB scanner input
    # still works — qr_routes parses the product id back out of the URL).
    qr_path = generate_qr(
        data=f"{FRONTEND_URL}/products/{product.id}",
        filename=f"product_{product.id}"
    )
    product.qr_code_path = qr_path
    db.commit()
    db.refresh(product)
    return product


@router.post("/products/{product_id}/regenerate-qr", response_model=ProductResponse)
def regenerate_qr(product_id: int, db: Session = Depends(get_db)):
    """Re-generate a product's QR code with the current format/FRONTEND_URL.
    Needed for products created before the QR format changed to a link."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    qr_path = generate_qr(
        data=f"{FRONTEND_URL}/products/{product.id}",
        filename=f"product_{product.id}"
    )
    product.qr_code_path = qr_path
    db.commit()
    db.refresh(product)
    return product


@router.get("/products", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.created_at.desc()).all()


def _fill_in_scan_location(scan_log_id: int, ip: str):
    """Runs after the response has already gone out — looks up the visitor's
    approximate city from their IP and updates the scan log. Uses its own DB
    session since the request's session is closed by the time this runs."""
    location = get_ip_location(ip)
    if not any(location.values()):
        return
    db = SessionLocal()
    try:
        log = db.query(ScanLog).filter(ScanLog.id == scan_log_id).first()
        if log:
            log.city = location["city"]
            log.region = location["region"]
            log.country = location["country"]
            db.commit()
    finally:
        db.close()


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Passively captured — no form, no permission prompt. Device/browser come
    # from the User-Agent header (always sent); city/region/country are
    # filled in afterward via a background IP lookup so it doesn't add
    # latency to the visitor's page load.
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    device, browser = parse_user_agent(user_agent)

    log = ScanLog(
        product_id=product_id,
        ip_address=ip,
        device=device,
        browser=browser,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    background_tasks.add_task(_fill_in_scan_location, log.id, ip)

    # Exposed so the frontend can attach a time-spent-on-page beacon to this
    # exact scan later (see /scan-logs/{id}/duration below).
    response.headers["X-Scan-Log-Id"] = str(log.id)

    return product


class ScanDurationPayload(BaseModel):
    seconds: int


@router.post("/scan-logs/{scan_log_id}/duration")
def record_scan_duration(scan_log_id: int, payload: ScanDurationPayload, db: Session = Depends(get_db)):
    """Called via navigator.sendBeacon when the visitor leaves the product
    page, so 'time spent' can be tracked without any prompt or form."""
    log = db.query(ScanLog).filter(ScanLog.id == scan_log_id).first()
    if not log:
        raise HTTPException(404, "Scan log not found")
    log.time_spent_seconds = payload.seconds
    db.commit()
    return {"status": "ok"}


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Explicit cleanup rather than relying on the DB's ON DELETE CASCADE —
    # that constraint isn't actually enforced on tables created before it was
    # added to the model, which made deleting any scanned product 500.
    db.query(ScanLog).filter(ScanLog.product_id == product_id).delete()
    db.query(Enquiry).filter(Enquiry.product_id == product_id).delete()

    db.delete(product)
    db.commit()
    return {"message": f"Product {product_id} deleted"}