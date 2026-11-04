
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.sales import WasteRecord
from app.models.product import Product


router = APIRouter(prefix="/api/v1/waste", tags=["Waste Tracking"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class WasteCreate(BaseModel):
    product_id: int = Field(gt=0)
    wasted_on: date
    waste_units: int = Field(gt=0)


class WasteResponse(BaseModel):
    waste_record_id: int
    product_id: int
    wasted_on: date
    waste_units: int

    model_config = {"from_attributes": True}


@router.post("/", response_model=WasteResponse, status_code=201)
def create_waste_record(
    waste: WasteCreate,
    db: Session = Depends(get_db),
):
    product = db.get(Product, waste.product_id)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    record = WasteRecord(
        product_id=waste.product_id,
        wasted_on=waste.wasted_on,
        waste_units=waste.waste_units,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.get("/", response_model=list[WasteResponse])
def list_waste_records(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    statement = (
        select(WasteRecord)
        .order_by(WasteRecord.wasted_on.desc())
        .limit(limit)
    )

    return db.scalars(statement).all()


@router.get("/summary")
def waste_summary(db: Session = Depends(get_db)):
    records = db.scalars(select(WasteRecord)).all()

    total_records = len(records)
    total_waste_units = sum(record.waste_units for record in records)

    return {
        "total_records": total_records,
        "total_waste_units": total_waste_units,
    }
