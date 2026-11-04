"""Shared utilities for reproducible model training."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ML_ROOT = Path(__file__).resolve().parents[1]
RAW_DATA_DIR = ML_ROOT / "data" / "raw"
ARTIFACT_DIR = ML_ROOT / "artifacts"


def require_columns(data: pd.DataFrame, columns: set[str], source: Path) -> None:
    missing = columns.difference(data.columns)
    if missing:
        raise ValueError(f"{source.name} is missing required columns: {sorted(missing)}")


def chronological_split(
    data: pd.DataFrame, date_column: str, validation_fraction: float = 0.2
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Timestamp]:
    dates = pd.to_datetime(data[date_column], errors="raise")
    unique_dates = pd.Index(dates.unique()).sort_values()
    if len(unique_dates) < 2:
        raise ValueError(f"Not enough distinct dates in {date_column} for a split")
    first_validation_index = max(1, int(len(unique_dates) * (1 - validation_fraction)))
    first_validation_index = min(first_validation_index, len(unique_dates) - 1)
    cutoff = pd.Timestamp(unique_dates[first_validation_index])
    train_mask = dates < cutoff
    validation_mask = dates >= cutoff
    if not train_mask.any() or not validation_mask.any():
        raise ValueError(f"Chronological split on {date_column} produced an empty partition")
    return data.loc[train_mask].copy(), data.loc[validation_mask].copy(), cutoff


def make_preprocessor(
    features: pd.DataFrame, categorical_features: list[str]
) -> ColumnTransformer:
    numeric_features = [column for column in features.columns if column not in categorical_features]
    return ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ("numeric", "passthrough", numeric_features),
        ],
        remainder="drop",
    )


def persist_model(
    name: str,
    model: Pipeline,
    metrics: dict[str, Any],
) -> Path:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model_path = ARTIFACT_DIR / f"{name}.joblib"
    metrics_path = ARTIFACT_DIR / f"{name}.metrics.json"
    joblib.dump(model, model_path, compress=3)
    with metrics_path.open("w", encoding="utf-8") as output:
        json.dump(metrics, output, indent=2, default=str)
        output.write("\n")
    return model_path


def regression_metrics(actual: pd.Series, predicted: Any) -> dict[str, float]:
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    return {
        "mae": float(mean_absolute_error(actual, predicted)),
        "rmse": float(mean_squared_error(actual, predicted) ** 0.5),
        "r2": float(r2_score(actual, predicted)),
    }
