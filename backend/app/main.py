
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import batches, dashboard, forecasts, health, waste
from app.core.config import ALLOWED_ORIGINS, API_PREFIX
from app.db.base import Base
from app.db.session import engine
from app.models import inventory, product, sales


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

        Base.metadata.create_all(bind=engine)

    except Exception:
        logger.exception("Backend startup failed while connecting to MySQL.")
        raise

    logger.info("WasteWise API connected to MySQL.")
    yield


app = FastAPI(
    title="WasteWise API",
    version="1.0.0",
    description="WasteWise inventory and demand insights API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health.router)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(batches.router, prefix=API_PREFIX)
app.include_router(forecasts.router, prefix=API_PREFIX)

# Waste Tracking API
app.include_router(waste.router)
