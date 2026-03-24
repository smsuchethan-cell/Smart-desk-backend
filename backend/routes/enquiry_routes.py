from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.enquiry import Enquiry
from models.product import Product
from schemas.enquiry import EnquiryCreate, EnquiryResponse
from typing import List

router = APIRouter()


@router.post("/enquiries", response_model=EnquiryResponse)
def submit_enquiry(payload: EnquiryCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    enquiry = Enquiry(**payload.model_dump())
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.get("/enquiries", response_model=List[EnquiryResponse])
def list_enquiries(db: Session = Depends(get_db)):
    return db.query(Enquiry).order_by(Enquiry.created_at.desc()).all()


@router.get("/enquiries/product/{product_id}", response_model=List[EnquiryResponse])
def enquiries_by_product(product_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Enquiry)
        .filter(Enquiry.product_id == product_id)
        .order_by(Enquiry.created_at.desc())
        .all()
    )


@router.delete("/enquiries/{enquiry_id}")
def delete_enquiry(enquiry_id: int, db: Session = Depends(get_db)):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    db.delete(enquiry)
    db.commit()
    return {"message": f"Enquiry {enquiry_id} deleted"}
