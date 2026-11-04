
"""Demand forecasts using actual WasteWise AI sales history."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sales import Sale
from app.models.inventory import InventoryBatch


def predict_demand(
    db: Session,
    days: int = 7,
    requested_store_id: str | None = None,
) -> dict[str, Any]:
    today = date.today()
    history_start = today - timedelta(days=180)

    sales = db.scalars(
        select(Sale)
        .where(
            Sale.sold_on >= history_start,
            Sale.sold_on < today,
        )
        .order_by(Sale.store_id, Sale.sold_on)
    ).all()

    if not sales:
        raise HTTPException(
            status_code=409,
            detail="No historical sales found. Add sales before forecasting.",
        )

    sales_by_store_date: dict[str, dict[date, int]] = defaultdict(
        lambda: defaultdict(int)
    )
    product_daily_sales: dict[int, dict[date, int]] = defaultdict(
        lambda: defaultdict(int)
    )
    product_names: dict[int, str] = {}

    products = db.scalars(select(Product)).all()
    for product in products:
        product_names[product.product_id] = product.name

    for sale in sales:
        sales_by_store_date[sale.store_id][sale.sold_on] += sale.units_sold
        product_daily_sales[sale.product_id][sale.sold_on] += sale.units_sold

    stores = sorted(
        sales_by_store_date,
        key=lambda store: (
            len(sales_by_store_date[store]),
            max(sales_by_store_date[store]),
        ),
        reverse=True,
    )

    store_id = requested_store_id or stores[0]

    if store_id not in sales_by_store_date:
        raise HTTPException(
            status_code=404,
            detail=f"No sales found for store '{store_id}'.",
        )

    daily_history = sales_by_store_date[store_id]
    recorded_dates = sorted(daily_history)

    if len(recorded_dates) < 28:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Store '{store_id}' has {len(recorded_dates)} distinct "
                "sales dates; at least 28 are required."
            ),
        )

    latest_date = recorded_dates[-1]
    stale_days = (today - latest_date).days

    recent_dates = recorded_dates[-7:]
    recent_units = [daily_history[d] for d in recent_dates]
    average_daily_units = sum(recent_units) / len(recent_units)
    baseline_units = max(0, round(average_daily_units))

    history = [
        {"date": d.isoformat(), "units": daily_history[d]}
        for d in recorded_dates[-7:]
    ]

    forecast_start = today + timedelta(days=1)
    forecast = [
        {
            "date": (forecast_start + timedelta(days=offset)).isoformat(),
            "units": baseline_units,
        }
        for offset in range(days)
    ]

    inventory_batches = db.scalars(select(InventoryBatch)).all()
    inventory_by_product: dict[int, int] = defaultdict(int)
    expiry_by_product: dict[int, date] = {}

    for batch in inventory_batches:
        inventory_by_product[batch.product_id] += batch.quantity_remaining
        current_expiry = expiry_by_product.get(batch.product_id)
        if current_expiry is None or batch.expiry_date < current_expiry:
            expiry_by_product[batch.product_id] = batch.expiry_date

    product_forecasts = []

    for product_id, daily_sales in product_daily_sales.items():
        product_dates = sorted(daily_sales)
        recent_product_dates = product_dates[-7:]
        recent_product_units = [daily_sales[d] for d in recent_product_dates]
        average_product_demand = (
            sum(recent_product_units) / len(recent_product_units)
        )
        predicted_daily_units = max(0, round(average_product_demand))
        predicted_period_demand = predicted_daily_units * days
        stock = inventory_by_product[product_id]

        product_forecasts.append(
            {
                "product_id": product_id,
                "product_name": product_names.get(
                    product_id, f"Product {product_id}"
                ),
                "history_days": len(product_dates),
                "average_daily_sales": round(average_product_demand, 2),
                "predicted_daily_demand": predicted_daily_units,
                "forecast_period_days": days,
                "predicted_period_demand": predicted_period_demand,
                "current_stock": stock,
                "suggested_reorder_quantity": max(
                    0, predicted_period_demand - stock
                ),
                "earliest_expiry_date": (
                    expiry_by_product[product_id].isoformat()
                    if product_id in expiry_by_product
                    else None
                ),
                "forecast_method": "seven_day_product_average",
            }
        )

    product_forecasts.sort(
        key=lambda item: item["product_id"]
    )

    return {
        "store_id": store_id,
        "model": "seven_day_average_baseline",
        "model_validation": {
            "mae": None,
            "rmse": None,
            "r2": None,
        },
        "history_days": len(recorded_dates),
        "as_of": latest_date.isoformat(),
        "stale_days": stale_days,
        "history": history,
        "forecast": forecast,
        "product_forecasts": product_forecasts,
        "note": (
            "Baseline estimates use recent recorded sales, not a trained "
            "ML model. Reorder quantities are preliminary estimates and "
            "do not yet account for expiry, lead time, or safety stock."
        ),
    }
