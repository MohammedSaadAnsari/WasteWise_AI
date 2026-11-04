# WasteWise model training

Run all training jobs from the `ml` directory:

```powershell
python src\train_all.py
```

The command saves fitted scikit-learn pipelines as `.joblib` files and validation
metrics as JSON under `ml/artifacts/`. Each model can also be trained separately
by running its `src\train_*.py` script.

## Data and evaluation

- **Demand forecast:** Aggregates historical M5 sales by store and day, joins the
  calendar and weekly item prices, derives price-drop promotion share, and builds
  lag and rolling-sales features. Validation uses the latest 20% of dates; all
  lag and rolling features are shifted so they use past sales only.
- **Expiry risk:** Uses `inventory_batches.csv`, excludes `expiry_risk_label`,
  batch identifiers, and simulated post-outcome waste from features, and holds
  out the latest 20% of snapshot dates.
- **Food waste:** Uses `perishable_inventory.csv` to predict the next day's waste
  from the preceding day's inventory and sales observations. The `waste_units`
  column is never an input feature, and validation is chronological by target
  date. Daily waste labels are sparse, so the report also compares this model
  with a zero-waste baseline; use the reported held-out metrics rather than
  assuming this dataset supports accurate daily predictions.
- **Discount recommendation:** Predicts simulated gross margin and keeps all
  discount alternatives for each batch in the same train or validation group.
  These scenario targets are simulated; this model is a prototype and is not
  evidence of real customer price response.

Review `ml/artifacts/metrics.json` for held-out metrics, date ranges, and feature
lists before using the models. Metrics describe performance on the supplied
datasets and do not guarantee performance on future stores or real customers.