"""Train a one-day-ahead waste model using only information known by day t."""

from __future__ import annotations

import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.pipeline import Pipeline

from training_utils import (
    RAW_DATA_DIR,
    chronological_split,
    make_preprocessor,
    persist_model,
    regression_metrics,
    require_columns,
)


DATA_FILE = RAW_DATA_DIR / "perishable_inventory.csv"
TARGET = "waste_units"
FUTURE_TARGET = "next_day_waste_units"


def train() -> dict[str, object]:
    data = pd.read_csv(DATA_FILE)
    require_columns(
        data,
        {
            "product_id", "date", "category", "opening_stock", "units_received",
            "units_sold", "unit_price", "discount_pct", "days_to_expiry",
            "temperature_c", "stockout_flag", TARGET,
        },
        DATA_FILE,
    )
    data["date"] = pd.to_datetime(data["date"], errors="raise")
    data = data.sort_values(["product_id", "date"]).reset_index(drop=True)
    by_product = data.groupby("product_id", sort=False)
    data[FUTURE_TARGET] = by_product[TARGET].shift(-1)
    data["target_date"] = by_product["date"].shift(-1)
    data["sales_lag_1"] = by_product["units_sold"].shift(1)
    data["sales_lag_7"] = by_product["units_sold"].shift(7)
    data["sales_rolling_mean_7"] = by_product["units_sold"].transform(
        lambda values: values.shift(1).rolling(7, min_periods=7).mean()
    )
    data["target_weekday"] = data["target_date"].dt.dayofweek
    data["target_month"] = data["target_date"].dt.month

    features = [
        "product_id", "category", "opening_stock", "units_received", "units_sold",
        "unit_price", "discount_pct", "days_to_expiry", "temperature_c",
        "stockout_flag", "sales_lag_1", "sales_lag_7", "sales_rolling_mean_7",
        "target_weekday", "target_month",
    ]
    if TARGET in features or FUTURE_TARGET in features or "target_date" in features:
        raise ValueError("Waste-model features contain a waste target or future observation")
    data = data.dropna(subset=[FUTURE_TARGET, "target_date", "sales_lag_7"])
    train_data, validation_data, cutoff = chronological_split(data, "target_date")
    categorical = ["category"]
    model = Pipeline(
        steps=[
            ("preprocessor", make_preprocessor(data[features], categorical)),
            (
                "regressor",
                ExtraTreesRegressor(
                    n_estimators=400,
                    min_samples_leaf=2,
                    max_features=0.9,
                    n_jobs=-1,
                    random_state=42,
                ),
            ),
        ]
    )
    model.fit(train_data[features], train_data[FUTURE_TARGET])
    predicted = model.predict(validation_data[features])
    validation_metrics = regression_metrics(
        validation_data[FUTURE_TARGET], predicted
    )
    zero_baseline_metrics = regression_metrics(
        validation_data[FUTURE_TARGET],
        pd.Series(0.0, index=validation_data.index),
    )
    metrics: dict[str, object] = {
        "model": "extra_trees_next_day_food_waste",
        "target": FUTURE_TARGET,
        "source_target_column": TARGET,
        "features": features,
        "excluded_columns": [TARGET],
        "prediction_horizon": "next calendar day",
        "feature_cutoff": "features are from the prior day; target-day waste is never an input",
        "split": "chronological by target_date",
        "train_start": train_data["target_date"].min(),
        "train_end": train_data["target_date"].max(),
        "validation_start": cutoff,
        "validation_end": validation_data["target_date"].max(),
        "train_rows": len(train_data),
        "validation_rows": len(validation_data),
        "validation": validation_metrics,
        "validation_zero_baseline": zero_baseline_metrics,
        "validation_zero_target_fraction": float(
            validation_data[FUTURE_TARGET].eq(0).mean()
        ),
        "beats_zero_baseline_on_mae": bool(
            validation_metrics["mae"] < zero_baseline_metrics["mae"]
        ),
    }
    artifact = persist_model("food_waste", model, metrics)
    print(f"Saved {artifact}; validation metrics: {metrics['validation']}")
    return metrics


if __name__ == "__main__":
    train()