
import { FormEvent, useCallback, useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000/api/v1/waste";

interface WasteRecord {
  waste_record_id: number;
  product_id: number;
  wasted_on: string;
  waste_units: number;
}

interface WasteSummary {
  total_records: number;
  total_waste_units: number;
}

function getToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function readError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) {
    return body.detail.map((item: { msg?: string }) => item.msg).join(", ");
  }
  return `Request failed (${response.status})`;
}

export default function WasteReports() {
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [summary, setSummary] = useState<WasteSummary>({
    total_records: 0,
    total_waste_units: 0,
  });

  const [productId, setProductId] = useState("1");
  const [wasteUnits, setWasteUnits] = useState("1");
  const [wastedOn, setWastedOn] = useState(getToday());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadWasteData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [recordsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_URL}/?limit=50`),
        fetch(`${API_URL}/summary`),
      ]);

      if (!recordsResponse.ok) {
        throw new Error(await readError(recordsResponse));
      }
      if (!summaryResponse.ok) {
        throw new Error(await readError(summaryResponse));
      }

      const recordsData: WasteRecord[] = await recordsResponse.json();
      const summaryData: WasteSummary = await summaryResponse.json();

      setRecords(recordsData);
      setSummary(summaryData);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Check that the backend is running.`
          : "Unable to load waste records.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWasteData();
  }, [loadWasteData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: Number(productId),
          wasted_on: wastedOn,
          waste_units: Number(wasteUnits),
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      await response.json();
      setMessage("Waste record saved successfully.");
      setWasteUnits("1");
      await loadWasteData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save the waste record.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ww-waste-page">
      <header className="ww-waste-header">
        <div>
          <p className="ww-waste-eyebrow">WASTEWISE MANAGEMENT</p>
          <h1>Waste Reports</h1>
          <p>Record food waste and keep track of your waste totals.</p>
        </div>
        <button
          className="ww-waste-refresh"
          type="button"
          onClick={() => void loadWasteData()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh data"}
        </button>
      </header>

      <section className="ww-waste-metrics" aria-label="Waste summary">
        <article className="ww-waste-card">
          <span>Total records</span>
          <strong>{summary.total_records}</strong>
          <small>Recorded waste entries</small>
        </article>
        <article className="ww-waste-card">
          <span>Total waste units</span>
          <strong>{summary.total_waste_units}</strong>
          <small>Units recorded as wasted</small>
        </article>
      </section>

      <section className="ww-waste-panel">
        <div className="ww-waste-panel-heading">
          <div>
            <h2>Record food waste</h2>
            <p>Enter the product ID, date, and number of wasted units.</p>
          </div>
        </div>

        <form className="ww-waste-form" onSubmit={handleSubmit}>
          <label>
            Product ID
            <input
              type="number"
              min="1"
              step="1"
              required
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            />
          </label>

          <label>
            Waste date
            <input
              type="date"
              required
              value={wastedOn}
              onChange={(event) => setWastedOn(event.target.value)}
            />
          </label>

          <label>
            Waste units
            <input
              type="number"
              min="1"
              step="1"
              required
              value={wasteUnits}
              onChange={(event) => setWasteUnits(event.target.value)}
            />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add waste record"}
          </button>
        </form>

        {message && (
          <p className="ww-waste-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="ww-waste-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="ww-waste-panel">
        <div className="ww-waste-panel-heading">
          <div>
            <h2>Recent waste records</h2>
            <p>Showing up to 50 records from your database.</p>
          </div>
        </div>

        {loading ? (
          <p className="ww-waste-empty">Loading waste records...</p>
        ) : records.length === 0 ? (
          <p className="ww-waste-empty">No waste records found yet.</p>
        ) : (
          <div className="ww-waste-table-wrap">
            <table className="ww-waste-table">
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Product ID</th>
                  <th>Waste date</th>
                  <th>Waste units</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.waste_record_id}>
                    <td>#{record.waste_record_id}</td>
                    <td>{record.product_id}</td>
                    <td>{record.wasted_on}</td>
                    <td>{record.waste_units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="ww-waste-note">
        Waste quantities are displayed in units, not kilograms, unless your
        product data defines the unit of measurement.
      </p>
    </main>
  );
}
