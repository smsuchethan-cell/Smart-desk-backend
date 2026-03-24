from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database.db import get_db
from models.product import Product
from models.scan_log import ScanLog
from schemas.product import ProductCreate, ProductUpdate, ProductResponse
from utils.qr_generator import generate_qr
from typing import List

router = APIRouter()


@router.post("/products", response_model=ProductResponse)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)

    # Auto-generate QR code that encodes the product scan URL
    qr_path = generate_qr(
        data=f"PRODUCT:{product.id}",
        filename=f"product_{product.id}"
    )
    product.qr_code_path = qr_path
    db.commit()
    db.refresh(product)
    return product


@router.get("/products", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.created_at.desc()).all()


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, request: Request, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Log scan
    log = ScanLog(
        product_id=product_id,
        ip_address=request.client.host if request.client else "unknown"
    )
    db.add(log)
    db.commit()

    return product


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
    db.delete(product)
    db.commit()
    return {"message": f"Product {product_id} deleted"}