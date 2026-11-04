"""Train a store-level daily demand model with a chronological holdout."""

from __future__ import annotations

import numpy as np
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


SALES_FILE = RAW_DATA_DIR / "sales_train_evaluation.csv"
CALENDAR_FILE = RAW_DATA_DIR / "calendar.csv"
PRICES_FILE = RAW_DATA_DIR / "sell_prices.csv"
TARGET = "sales_units"


def _load_store_sales() -> pd.DataFrame:
    calendar = pd.read_csv(CALENDAR_FILE)
    require_columns(
        calendar,
        {
            "d", "date", "wm_yr_wk", "weekday", "month", "year", "event_type_1",
            "event_type_2", "snap_CA", "snap_TX", "snap_WI",
        },
        CALENDAR_FILE,
    )
    day_columns = [
        column
        for column in pd.read_csv(SALES_FILE, nrows=0).columns
        if column.startswith("d_")
    ]
    if not day_columns:
        raise ValueError(f"No daily sales columns found in {SALES_FILE.name}")

    store_chunks: list[pd.DataFrame] = []
    for chunk in pd.read_csv(
        SALES_FILE, usecols=["store_id", *day_columns], chunksize=512
    ):
        store_chunks.append(chunk.groupby("store_id", sort=True)[day_columns].sum())
    sales = pd.concat(store_chunks).groupby(level=0, sort=True).sum().copy()
    sales.index.name = "store_id"
    sales = sales.reset_index().melt(
        id_vars="store_id", var_name="d", value_name=TARGET
    )

    daily_calendar = calendar.copy()
    daily_calendar["date"] = pd.to_datetime(daily_calendar["date"], errors="raise")
    daily_calendar["event_type"] = (
        daily_calendar["event_type_1"]
        .fillna(daily_calendar["event_type_2"])
        .fillna("none")
    )
    daily_calendar["event_present"] = (
        daily_calendar["event_type_1"].notna()
        | daily_calendar["event_type_2"].notna()
    ).astype(int)
    data = sales.merge(
        daily_calendar[
            [
                "d", "date", "wm_yr_wk", "weekday", "month", "year", "event_type",
                "event_present", "snap_CA", "snap_TX", "snap_WI",
            ]
        ],
        on="d",
        how="left",
        validate="many_to_one",
    )
    if data["date"].isna().any():
        raise ValueError("Some sales days could not be matched to calendar dates")

    prices = pd.read_csv(PRICES_FILE)
    require_columns(
        prices, {"store_id", "item_id", "wm_yr_wk", "sell_price"}, PRICES_FILE
    )
    prices = prices.sort_values(["store_id", "item_id", "wm_yr_wk"])
    prices["previous_price"] = prices.groupby(["store_id", "item_id"])[
        "sell_price"
    ].shift(1)
    prices["is_promotion"] = (
        prices["previous_price"].notna()
        & (prices["sell_price"] < prices["previous_price"])
    ).astype(float)
    weekly_prices = prices.groupby(["store_id", "wm_yr_wk"], as_index=False).agg(
        average_sell_price=("sell_price", "mean"),
        promotion_share=("is_promotion", "mean"),
    )
    data = data.merge(
        weekly_prices,
        on=["store_id", "wm_yr_wk"],
        how="left",
        validate="many_to_one",
    )
    data[["average_sell_price", "promotion_share"]] = data[
        ["average_sell_price", "promotion_share"]
    ].fillna(0.0)

    store_state = data["store_id"].str.split("_", n=1).str[0]
    data["snap"] = np.select(
        [store_state.eq("CA"), store_state.eq("TX"), store_state.eq("WI")],
        [data["snap_CA"], data["snap_TX"], data["snap_WI"]],
        default=0,
    )
    data["weekday"] = data["weekday"].astype(str)
    data["event_type"] = data["event_type"].astype(str)
    data = data.sort_values(["store_id", "date"]).reset_index(drop=True)
    grouped_sales = data.groupby("store_id", sort=False)[TARGET]
    for lag in (1, 7, 14, 28):
        data[f"sales_lag_{lag}"] = grouped_sales.shift(lag)
    for window in (7, 28):
        data[f"sales_rolling_mean_{window}"] = grouped_sales.transform(
            lambda values: values.shift(1).rolling(window, min_periods=window).mean()
        )
    return data.dropna(subset=["sales_lag_28", "sales_rolling_mean_28"])


def train() -> dict[str, object]:
    data = _load_store_sales()
    categorical = ["store_id", "weekday", "event_type"]
    features = [
        *categorical,
        "month", "year", "event_present", "snap", "average_sell_price",
        "promotion_share", "sales_lag_1", "sales_lag_7", "sales_lag_14",
        "sales_lag_28", "sales_rolling_mean_7", "sales_rolling_mean_28",
    ]
    train_data, validation_data, cutoff = chronological_split(data, "date")
    model = Pipeline(
        steps=[
            ("preprocessor", make_preprocessor(data[features], categorical)),
            (
                "regressor",
                ExtraTreesRegressor(
                    n_estimators=300,
                    min_samples_leaf=2,
                    max_features=0.9,
                    n_jobs=-1,
                    random_state=42,
                ),
            ),
        ]
    )
    model.fit(train_data[features], train_data[TARGET])
    predicted = model.predict(validation_data[features])
    metrics: dict[str, object] = {
        "model": "extra_trees_store_daily_demand",
        "target": TARGET,
        "features": features,
        "split": "chronological",
        "train_start": train_data["date"].min(),
        "train_end": train_data["date"].max(),
        "validation_start": cutoff,
        "validation_end": validation_data["date"].max(),
        "train_rows": len(train_data),
        "validation_rows": len(validation_data),
        "validation": regression_metrics(validation_data[TARGET], predicted),
        "validation_wape": float(
            (validation_data[TARGET] - predicted).abs().sum()
            / validation_data[TARGET].sum()
        ),
    }
    artifact = persist_model("demand_forecast", model, metrics)
    print(f"Saved {artifact}; validation metrics: {metrics['validation']}")
    return metrics


if __name__ == "__main__":
    train()