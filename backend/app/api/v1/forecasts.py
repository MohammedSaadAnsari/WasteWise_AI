from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.services.forecast_service import predict_demand


router = APIRouter(prefix="/forecasts", tags=["forecasts"])


@router.get("/demand")
def demand_forecast(
    days: int = Query(default=7, ge=1, le=14),
    store_id: str | None = Query(default=None, min_length=1, max_length=40),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return predict_demand(db, days=days, requested_store_id=store_id)