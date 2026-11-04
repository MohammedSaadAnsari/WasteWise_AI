"""Load the supplied prototype CSVs into an empty WasteWise database."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pandas as pd
from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models.inventory import InventoryBatch
from app.models.product import Product
from app.models.sales import Sale, WasteRecord


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DATA = PROJECT_ROOT / "ml" / "data" / "raw"


def _as_date(value: object) -> date:
    return pd.Timestamp(value).date()


def import_demo_data() -> None:
    products = pd.read_csv(RAW_DATA / "products.csv")
    batches = pd.read_csv(RAW_DATA / "inventory_batches.csv")
    perishable = pd.read_csv(RAW_DATA / "perishable_inventory.csv")

    with SessionLocal.begin() as session:
        existing_counts = {
            model.__tablename__: session.scalar(
                select(func.count()).select_from(model)
            )
            for model in (Product, InventoryBatch, Sale, WasteRecord)
        }
        populated_tables = [name for name, count in existing_counts.items() if count]
        if populated_tables:
            raise RuntimeError(
                "Demo import requires empty tables; existing data found in: "
                + ", ".join(populated_tables)
                + ". No records were changed."
            )

        session.add_all(
            Product(
                product_id=int(row.product_id),
                name=str(row.product_name),
                category=str(row.category),
            )
            for row in products.itertuples(index=False)
        )
        session.add_all(
            InventoryBatch(
                batch_id=int(row.batch_id),
                product_id=int(row.product_id),
                received_at=_as_date(row.received_at),
                expiry_date=_as_date(row.expiry_date),
                quantity_received=int(row.initial_quantity),
                quantity_remaining=int(row.quantity_remaining),
            )
            for row in batches.itertuples(index=False)
        )
        session.add_all(
            Sale(
                product_id=int(row.product_id),
                store_id="wastewise_demo",
                sold_on=_as_date(row.date),
                units_sold=int(row.units_sold),
                unit_price=float(row.unit_price),
                discount_pct=float(row.discount_pct),
            )
            for row in perishable.itertuples(index=False)
        )
        session.add_all(
            WasteRecord(
                product_id=int(row.product_id),
                wasted_on=_as_date(row.date),
                waste_units=int(row.waste_units),
            )
            for row in perishable.itertuples(index=False)
        )

    print(
        "Imported prototype data: "
        f"{len(products)} products, {len(batches)} batches, "
        f"{len(perishable)} sales and {len(perishable)} waste records."
    )
    print("The supplied perishable/waste dataset is simulated and is not live store data.")


if __name__ == "__main__":
    import_demo_data()
