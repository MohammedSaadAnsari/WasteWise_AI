"""Train a prototype discount model on simulated scenarios, grouped by batch."""

from __future__ import annotations

import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline

from training_utils import (
    RAW_DATA_DIR,
    make_preprocessor,
    persist_model,
    regression_metrics,
    require_columns,
)


DATA_FILE = RAW_DATA_DIR / "discount_scenarios_simulated.csv"
TARGET = "estimated_gross_margin_simulated"


def train() -> dict[str, object]:
    data = pd.read_csv(DATA_FILE)
    require_columns(
        data,
        {
            "batch_id", "product_id", "days_to_expiry", "quantity_remaining",
            "discount_pct", TARGET,
        },
        DATA_FILE,
    )
    features = ["product_id", "days_to_expiry", "quantity_remaining", "discount_pct"]
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_indices, validation_indices = next(
        splitter.split(data[features], data[TARGET], groups=data["batch_id"])
    )
    train_data = data.iloc[train_indices]
    validation_data = data.iloc[validation_indices]
    if set(train_data["batch_id"]).intersection(validation_data["batch_id"]):
        raise ValueError("A batch appears in both discount-model partitions")

    model = Pipeline(
        steps=[
            ("preprocessor", make_preprocessor(data[features], ["product_id"])),
            (
                "regressor",
                ExtraTreesRegressor(
                    n_estimators=400,
                    min_samples_leaf=1,
                    max_features=1.0,
                    n_jobs=-1,
                    random_state=42,
                ),
            ),
        ]
    )
    model.fit(train_data[features], train_data[TARGET])
    predicted = model.predict(validation_data[features])
    metrics: dict[str, object] = {
        "model": "extra_trees_simulated_discount_prototype",
        "target": TARGET,
        "features": features,
        "split": "grouped by batch_id to keep scenario alternatives together",
        "train_rows": len(train_data),
        "validation_rows": len(validation_data),
        "train_batches": int(train_data["batch_id"].nunique()),
        "validation_batches": int(validation_data["batch_id"].nunique()),
        "validation": regression_metrics(validation_data[TARGET], predicted),
        "limitation": (
            "Training targets are simulated scenario estimates, not observed customer behavior "
            "or evidence of real price response."
        ),
    }
    artifact = persist_model("discount_recommendation_prototype", model, metrics)
    print(f"Saved {artifact}; validation metrics: {metrics['validation']}")
    return metrics


if __name__ == "__main__":
    train()