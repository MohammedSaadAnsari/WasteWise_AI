
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.inventory import InventoryBatch
from app.models.product import Product
from app.models.sales import Sale, WasteRecord


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
) -> dict[str, object]:
    today = date.today()

    # Current 7-day period, including today
    week_start = today - timedelta(days=6)

    # Previous 7-day period
    previous_week_start = week_start - timedelta(days=7)
    previous_week_end = week_start - timedelta(days=1)

    # Current calendar month
    current_month_start = today.replace(day=1)

    # 1. Get daily sales for the last 7 days
    sales_by_day = db.execute(
        select(
            Sale.sold_on,
            func.sum(Sale.units_sold),
        )
        .where(
            Sale.sold_on >= week_start,
            Sale.sold_on <= today,
        )
        .group_by(Sale.sold_on)
    ).all()

    daily_sales = {
        sold_on: int(units or 0)
        for sold_on, units in sales_by_day
    }

    weekly_sales = sum(daily_sales.values())

    # 2. Calculate sales during the previous 7 days
    previous_sales = int(
        db.scalar(
            select(
                func.coalesce(func.sum(Sale.units_sold), 0)
            ).where(
                Sale.sold_on >= previous_week_start,
                Sale.sold_on <= previous_week_end,
            )
        )
        or 0
    )

    # Avoid division by zero
    sales_change = (
        round(
            (weekly_sales - previous_sales)
            / previous_sales
            * 100,
            1,
        )
        if previous_sales > 0
        else None
    )

    # 3. Find inventory batches expiring within 3 days
    # Includes expired batches and batches expiring today.
    expiry_limit = today + timedelta(days=3)

    at_risk_batches = int(
        db.scalar(
            select(
                func.count(InventoryBatch.batch_id)
            ).where(
                InventoryBatch.quantity_remaining > 0,
                InventoryBatch.expiry_date <= expiry_limit,
            )
        )
        or 0
    )

    # 4. Calculate waste recorded this calendar month
    month_waste = int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(WasteRecord.waste_units),
                    0,
                )
            ).where(
                WasteRecord.wasted_on >= current_month_start,
                WasteRecord.wasted_on <= today,
            )
        )
        or 0
    )

    # 5. Fetch expiry alerts from MySQL
    batch_rows = db.execute(
        select(InventoryBatch, Product)
        .join(
            Product,
            Product.product_id == InventoryBatch.product_id,
        )
        .where(
            InventoryBatch.quantity_remaining > 0,
            InventoryBatch.expiry_date <= expiry_limit,
        )
        .order_by(
            InventoryBatch.expiry_date.asc(),
            InventoryBatch.batch_id.asc(),
        )
        .limit(5)
    ).all()

    alerts = []

    for batch, product in batch_rows:
        days_to_expiry = (
            batch.expiry_date - today
        ).days

        # Derive alert status from the expiry date
        status = (
            "Urgent"
            if days_to_expiry <= 1
            else "Watch"
        )

        alerts.append(
            {
                "batch_id": batch.batch_id,
                "product_name": product.name,
                "expiry_date": batch.expiry_date.isoformat(),
                "quantity_remaining": batch.quantity_remaining,
                "days_to_expiry": days_to_expiry,
                "status": status,
            }
        )
    # 6. Build chart values for all 7 calendar days
    daily_sales_chart = [
        {
            "date": (
                week_start + timedelta(days=offset)
            ).isoformat(),
            "units": daily_sales.get(
                week_start + timedelta(days=offset),
                0,
            ),
        }
        for offset in range(7)
    ]

    # 7. Return dashboard summary
    return {
        "sales_units_7d": weekly_sales,
        "sales_change_percent": sales_change,
        "sales_days_recorded": len(daily_sales),
        "at_risk_batches": at_risk_batches,
        "waste_units_month": month_waste,
        "daily_sales": daily_sales_chart,
        "alerts": alerts,
        "as_of": today.isoformat(),
    }
