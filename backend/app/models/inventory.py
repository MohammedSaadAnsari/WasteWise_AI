from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    batch_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.product_id"), index=True)
    received_at: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    quantity_received: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    product: Mapped["Product"] = relationship(back_populates="batches")

    @property
    def freshness_status(self) -> str:
        remaining_days = (self.expiry_date - date.today()).days
        if remaining_days <= 1:
            return "Urgent"
        if remaining_days <= 3:
            return "Watch"
        return "Good"