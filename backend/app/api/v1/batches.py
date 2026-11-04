from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.inventory import InventoryBatch
from app.models.product import Product


router = APIRouter(prefix="/batches", tags=["inventory"])


@router.get("")
def list_batches(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    rows = db.execute(
        select(InventoryBatch, Product)
        .join(Product, Product.product_id == InventoryBatch.product_id)
        .order_by(InventoryBatch.expiry_date.asc(), InventoryBatch.batch_id.asc())
        .limit(limit)
    ).all()
    today = date.today()
    batches = [
        {
            "batch_id": batch.batch_id,
            "product_id": product.product_id,
            "product_name": product.name,
            "category": product.category,
            "quantity_remaining": batch.quantity_remaining,
            "expiry_date": batch.expiry_date.isoformat(),
            "days_to_expiry": (batch.expiry_date - today).days,
            "status": batch.freshness_status,
        }
        for batch, product in rows
    ]
    return {"items": batches, "total": len(batches)}