
import { useCallback, useEffect, useState } from "react";
import {
  getInventoryBatches,
  type InventoryBatch,
} from "../services/inventory";

function getPriority(batch: InventoryBatch) {
  if (batch.days_to_expiry < 0) return "Expired";
  if (batch.days_to_expiry <= 1) return "Urgent";
  if (batch.days_to_expiry <= 3) return "Watch";
  return "Good";
}

function getRecommendation(batch: InventoryBatch) {
  const priority = getPriority(batch);

  if (priority === "Expired") {
    return "Remove from sale and review for safe disposal. Do not sell expired stock.";
  }

  if (priority === "Urgent") {
    return "Prioritize safe stock checks and promotion today. Follow food-safety rules.";
  }

  if (priority === "Watch") {
    return "Monitor daily and prioritize selling suitable stock before expiry.";
  }

  return "Continue normal stock rotation and monitor demand.";
}

export default function Recommendations() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getInventoryBatches();
      setBatches(response.items);
    } catch {
      setError(
        "Unable to load inventory recommendations. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  const expiredCount = batches.filter(
    (batch) => batch.days_to_expiry < 0
  ).length;

  const urgentCount = batches.filter(
    (batch) =>
      batch.days_to_expiry >= 0 && batch.days_to_expiry <= 1
  ).length;

  const watchCount = batches.filter(
    (batch) =>
      batch.days_to_expiry >= 2 && batch.days_to_expiry <= 3
  ).length;

  return (
    <main className="ww-waste-page">
      <header className="ww-waste-header">
        <div>
          <p className="ww-waste-eyebrow">WASTEWISE AI · SMART ACTIONS</p>
          <h1>Inventory Recommendations</h1>
          <p>
            Practical actions based on live inventory quantities and expiry
            dates.
          </p>
        </div>

        <button
          className="ww-waste-refresh"
          onClick={() => void loadBatches()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      <section className="ww-waste-metrics">
        <article className="ww-waste-card">
          <span>Expired batches</span>
          <strong>{expiredCount}</strong>
          <small>Require immediate review</small>
        </article>

        <article className="ww-waste-card">
          <span>Urgent batches</span>
          <strong>{urgentCount}</strong>
          <small>Expire today or tomorrow</small>
        </article>

        <article className="ww-waste-card">
          <span>Watch list</span>
          <strong>{watchCount}</strong>
          <small>Expire in 2–3 days</small>
        </article>

        <article className="ww-waste-card">
          <span>Total batches</span>
          <strong>{batches.length}</strong>
          <small>Loaded from inventory API</small>
        </article>
      </section>

      <section className="ww-waste-panel">
        <div className="ww-waste-panel-heading">
          <div>
            <h2>Recommended actions</h2>
            <p>Sorted by the most urgent expiry dates first.</p>
          </div>
        </div>

        {loading && (
          <p className="ww-waste-message">Loading inventory data...</p>
        )}

        {error && (
          <div>
            <p className="ww-waste-message ww-waste-error">{error}</p>
            <button
              className="ww-waste-refresh"
              onClick={() => void loadBatches()}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && batches.length === 0 && (
          <p className="ww-waste-empty">No inventory batches found.</p>
        )}

        {!loading && !error && batches.length > 0 && (
          <div className="ww-waste-table-wrap">
            <table className="ww-waste-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Expiry date</th>
                  <th>Priority</th>
                  <th>Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {[...batches]
                  .sort(
                    (a, b) =>
                      a.days_to_expiry - b.days_to_expiry
                  )
                  .map((batch) => {
                    const priority = getPriority(batch);

                    return (
                      <tr key={batch.batch_id}>
                        <td>
                          <strong>{batch.product_name}</strong>
                          <br />
                          <small>{batch.category}</small>
                        </td>
                        <td>{batch.quantity_remaining}</td>
                        <td>
                          {batch.expiry_date}
                          <br />
                          <small>
                            {batch.days_to_expiry < 0
                              ? `${Math.abs(batch.days_to_expiry)} day(s) expired`
                              : batch.days_to_expiry === 0
                                ? "Expires today"
                                : `${batch.days_to_expiry} day(s) remaining`}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`ww-rec-priority ww-rec-${priority.toLowerCase()}`}
                          >
                            {priority}
                          </span>
                        </td>
                        <td>{getRecommendation(batch)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        <p className="ww-waste-note">
          Recommendations are rule-based using inventory expiry dates. They
          are not generated by a trained recommendation model.
        </p>
      </section>
    </main>
  );
}
