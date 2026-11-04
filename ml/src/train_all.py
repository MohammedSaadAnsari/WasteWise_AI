"""Train all WasteWise models and write a combined validation report."""

from __future__ import annotations

import json

from train_discount_model import train as train_discount
from train_expiry_risk import train as train_expiry
from train_forecast import train as train_forecast
from train_waste_model import train as train_waste
from training_utils import ARTIFACT_DIR


def main() -> None:
    results = {
        "demand_forecast": train_forecast(),
        "expiry_risk": train_expiry(),
        "food_waste": train_waste(),
        "discount_recommendation_prototype": train_discount(),
    }
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = ARTIFACT_DIR / "metrics.json"
    with report_path.open("w", encoding="utf-8") as output:
        json.dump(results, output, indent=2, default=str)
        output.write("\n")
    print(f"Saved combined validation report to {report_path}")


if __name__ == "__main__":
    main()
