
from datetime import date, timedelta

from sqlalchemy import select

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.product import Product
from app.models.inventory import InventoryBatch
from app.models.sales import Sale, WasteRecord


# Ensure all imported models have database tables.
Base.metadata.create_all(bind=engine)

today = date.today()
store_id = "3"

product_data = [
    {"name": "Fresh Milk", "category": "Dairy"},
    {"name": "Whole Wheat Bread", "category": "Bakery"},
    {"name": "Bananas", "category": "Produce"},
]

session = SessionLocal()

try:
    # 1. Create products without duplicating existing names.
    products = {}

    for item in product_data:
        product = session.scalar(
            select(Product).where(Product.name == item["name"])
        )

        if product is None:
            product = Product(
                name=item["name"],
                category=item["category"],
            )
            session.add(product)
            session.flush()

        products[item["name"]] = product

    # 2. Create one inventory batch per product.
    batch_data = [
        ("Fresh Milk", 14, 1, 30),
        ("Whole Wheat Bread", 10, 3, 40),
        ("Bananas", 8, 5, 50),
    ]

    for name, received_days_ago, expiry_days, quantity in batch_data:
        product = products[name]
        received_date = today - timedelta(days=received_days_ago)

        existing_batch = session.scalar(
            select(InventoryBatch).where(
                InventoryBatch.product_id == product.product_id,
                InventoryBatch.received_at == received_date,
            )
        )

        if existing_batch is None:
            session.add(
                InventoryBatch(
                    product_id=product.product_id,
                    received_at=received_date,
                    expiry_date=today + timedelta(days=expiry_days),
                    quantity_received=quantity,
                    quantity_remaining=quantity - 5,
                )
            )

    # 3. Create 35 distinct days of sales for store "3".
    prices = {
        "Fresh Milk": 60.0,
        "Whole Wheat Bread": 45.0,
        "Bananas": 50.0,
    }

    base_units = {
        "Fresh Milk": 18,
        "Whole Wheat Bread": 12,
        "Bananas": 20,
    }

    for offset in range(35, 0, -1):
        sale_date = today - timedelta(days=offset)

        for name, product in products.items():
            existing_sale = session.scalar(
                select(Sale.sale_id).where(
                    Sale.product_id == product.product_id,
                    Sale.store_id == store_id,
                    Sale.sold_on == sale_date,
                ).limit(1)
            )

            if existing_sale is None:
                units = base_units[name] + (offset % 7)

                session.add(
                    Sale(
                        product_id=product.product_id,
                        store_id=store_id,
                        sold_on=sale_date,
                        units_sold=units,
                        unit_price=prices[name],
                        discount_pct=0.10 if offset % 5 == 0 else 0.0,
                    )
                )

    # 4. Add a few sample waste records.
    waste_data = [
        ("Fresh Milk", 4, 3),
        ("Whole Wheat Bread", 7, 2),
        ("Bananas", 12, 4),
    ]

    for name, days_ago, waste_units in waste_data:
        product = products[name]
        waste_date = today - timedelta(days=days_ago)

        existing_waste = session.scalar(
            select(WasteRecord.waste_record_id).where(
                WasteRecord.product_id == product.product_id,
                WasteRecord.wasted_on == waste_date,
                WasteRecord.waste_units == waste_units,
            ).limit(1)
        )

        if existing_waste is None:
            session.add(
                WasteRecord(
                    product_id=product.product_id,
                    wasted_on=waste_date,
                    waste_units=waste_units,
                )
            )

    session.commit()

    print("Sample data created successfully!")
    print("Products:", len(products))
    print("Store ID:", store_id)
    print("Sales history: 35 distinct dates")
    print("Sample inventory batches and waste records added.")

except Exception:
    session.rollback()
    raise

finally:
    session.close()
    engine.dispose()