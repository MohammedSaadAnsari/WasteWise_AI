"""Train an expiry-risk classifier without target or post-outcome leakage."""

from __future__ import annotations

import pandas as pd
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline

from training_utils import (
    RAW_DATA_DIR,
    chronological_split,
    make_preprocessor,
    persist_model,
    require_columns,
)


DATA_FILE = RAW_DATA_DIR / "inventory_batches.csv"
TARGET = "expiry_risk_label"
EXCLUDED = {TARGET, "batch_id", "waste_units_actual_simulated"}


def train() -> dict[str, object]:
    data = pd.read_csv(DATA_FILE)
    require_columns(
        data,
        {
            "snapshot_date", "expiry_date", "received_at", "category", "product_id",
            "days_to_expiry", "quantity_remaining", "expected_demand_before_expiry",
            TARGET,
        },
        DATA_FILE,
    )
    for column in ("snapshot_date", "expiry_date", "received_at"):
        data[column] = pd.to_datetime(data[column], errors="raise")
    data["days_since_received"] = (
        data["snapshot_date"] - data["received_at"]
    ).dt.days
    data["snapshot_month"] = data["snapshot_date"].dt.month
    data["expiry_month"] = data["expiry_date"].dt.month
    data["quantity_to_expected_demand_ratio"] = data["quantity_remaining"] / (
        data["expected_demand_before_expiry"] + 1
    )

    features = [
        column
        for column in data.columns
        if column not in EXCLUDED
        and column not in {"snapshot_date", "expiry_date", "received_at"}
    ]
    if TARGET in features or "waste_units_actual_simulated" in features:
        raise ValueError("Expiry-risk feature selection includes a target or post-outcome column")
    categorical = ["category"]
    train_data, validation_data, cutoff = chronological_split(data, "snapshot_date")
    model = Pipeline(
        steps=[
            ("preprocessor", make_preprocessor(data[features], categorical)),
            (
                "classifier",
                ExtraTreesClassifier(
                    n_estimators=400,
                    min_samples_leaf=2,
                    class_weight="balanced",
                    n_jobs=-1,
                    random_state=42,
                ),
            ),
        ]
    )
    model.fit(train_data[features], train_data[TARGET])
    predicted = model.predict(validation_data[features])
    probabilities = model.predict_proba(validation_data[features])[:, 1]
    metrics: dict[str, object] = {
        "model": "extra_trees_expiry_risk",
        "target": TARGET,
        "features": features,
        "excluded_columns": sorted(EXCLUDED),
        "split": "chronological",
        "train_start": train_data["snapshot_date"].min(),
        "train_end": train_data["snapshot_date"].max(),
        "validation_start": cutoff,
        "validation_end": validation_data["snapshot_date"].max(),
        "train_rows": len(train_data),
        "validation_rows": len(validation_data),
        "validation": {
            "accuracy": float(accuracy_score(validation_data[TARGET], predicted)),
            "precision": float(
                precision_score(validation_data[TARGET], predicted, zero_division=0)
            ),
            "recall": float(
                recall_score(validation_data[TARGET], predicted, zero_division=0)
            ),
            "f1": float(f1_score(validation_data[TARGET], predicted, zero_division=0)),
            "roc_auc": float(roc_auc_score(validation_data[TARGET], probabilities)),
        },
    }
    artifact = persist_model("expiry_risk", model, metrics)
    print(f"Saved {artifact}; validation metrics: {metrics['validation']}")
    return metrics


if __name__ == "__main__":
    train()