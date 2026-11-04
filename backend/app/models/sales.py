from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (Index("ix_sales_store_date", "store_id", "sold_on"),)

    sale_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.product_id"), index=True)
    store_id: Mapped[str] = mapped_column(String(40), nullable=False, default="default")
    sold_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    units_sold: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    discount_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


class WasteRecord(Base):
    __tablename__ = "waste_records"

    waste_record_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.product_id"), index=True)
    wasted_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    waste_units: Mapped[int] = mapped_column(Integer, nullable=False)