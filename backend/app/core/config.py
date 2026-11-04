"""Environment-backed application settings."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent
load_dotenv(BACKEND_ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is required. Copy backend\\.env.example to backend\\.env "
        "and set the MySQL connection string."
    )

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
API_PREFIX = "/api/v1"
FORECAST_ARTIFACT_DIR = PROJECT_ROOT / "ml" / "artifacts"