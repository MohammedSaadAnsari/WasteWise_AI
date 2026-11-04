
import { useEffect, useMemo, useState } from "react";
import {
  getInventoryBatches,
  type InventoryBatch,
} from "../services/inventory";

export default function Inventory() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filter states
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [expirySort, setExpirySort] = useState("soonest");

  // Fetch inventory from the backend API
  useEffect(() => {
    const controller = new AbortController();

    async function loadInventory() {
      try {
        setLoading(true);
        setError("");

        const response = await getInventoryBatches(controller.signal);
        setBatches(response.items);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load inventory."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadInventory();

    return () => controller.abort();
  }, []);

  // Get available categories
  const categories = useMemo(
    () =>
      [...new Set(batches.map((batch) => batch.category))].sort(),
    [batches]
  );

  // Search, filter, and sort batches
  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return batches
      .filter((batch) => {
        const matchesSearch =
          batch.product_name.toLowerCase().includes(query) ||
          batch.category.toLowerCase().includes(query);

        const matchesCategory =
          category === "All" || batch.category === category;

        const matchesStatus =
          status === "All" || batch.status === status;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        const difference =
          new Date(a.expiry_date).getTime() -
          new Date(b.expiry_date).getTime();

        return expirySort === "soonest"
          ? difference
          : -difference;
      });
  }, [batches, search, category, status, expirySort]);

  // Expiry alerts: products expiring within 3 days or already expired
  const expiryAlerts = useMemo(
    () =>
      batches
        .filter((batch) => batch.days_to_expiry <= 3)
        .sort((a, b) => a.days_to_expiry - b.days_to_expiry),
    [batches]
  );

  // Loading state
  if (loading) {
    return (
      <section className="workspace">
        <p>Loading inventory...</p>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="workspace">
        <h2>Inventory</h2>
        <p role="alert">Could not load inventory: {error}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="workspace">
      {/* Page heading */}
      <div className="section-heading">
        <div>
          <span className="eyebrow">Stock management</span>
          <h2>Inventory</h2>
          <p>Monitor stock quantities and product expiry dates.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="metric-grid">
        <article className="metric-card">
          <p>Total batches</p>
          <h3>{batches.length}</h3>
        </article>

        <article className="metric-card">
          <p>Urgent batches</p>
          <h3>
            {batches.filter((b) => b.status === "Urgent").length}
          </h3>
        </article>

        <article className="metric-card">
          <p>Watch batches</p>
          <h3>
            {batches.filter((b) => b.status === "Watch").length}
          </h3>
        </article>
      </div>

      {/* Expiry alerts */}
      <div className="expiry-alerts">
        <h3>Expiry Alerts</h3>
        <p>Products expiring within the next 3 days or already expired.</p>

        {expiryAlerts.length === 0 ? (
          <p>No products currently match the expiry alert criteria.</p>
        ) : (
          expiryAlerts.map((batch) => (
            <article
              className={`expiry-alert expiry-alert--${batch.status.toLowerCase()}`}
              key={batch.batch_id}
            >
              <div>
                <strong>{batch.product_name}</strong>
                <p>
                  {batch.days_to_expiry < 0
                    ? `Expired ${Math.abs(batch.days_to_expiry)} day(s) ago`
                    : batch.days_to_expiry === 0
                      ? "Expiry date is today"
                      : `Expires in ${batch.days_to_expiry} day(s)`}
                </p>
              </div>

              <span>{batch.status}</span>
            </article>
          ))
        )}
      </div>

      {/* Search and filters */}
      <div className="inventory-filters">
        <div className="filter-field">
          <label htmlFor="inventory-search">Search products</label>
          <input
            id="inventory-search"
            type="search"
            placeholder="Search product or category..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="inventory-category">Category</label>
          <select
            id="inventory-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="All">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="inventory-status">Status</label>
          <select
            id="inventory-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Urgent">Urgent</option>
            <option value="Watch">Watch</option>
            <option value="Good">Good</option>
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="inventory-expiry">Sort by expiry</label>
          <select
            id="inventory-expiry"
            value={expirySort}
            onChange={(event) => setExpirySort(event.target.value)}
          >
            <option value="soonest">Expiring soonest</option>
            <option value="latest">Expiring latest</option>
          </select>
        </div>

        <button
          type="button"
          className="inventory-reset"
          onClick={() => {
            setSearch("");
            setCategory("All");
            setStatus("All");
            setExpirySort("soonest");
          }}
        >
          Reset filters
        </button>
      </div>

      {/* Results count */}
      <div className="inventory-results">
        <p>
          Showing <strong>{filteredBatches.length}</strong> of{" "}
          <strong>{batches.length}</strong> batches
        </p>
      </div>

      {/* Inventory table */}
      {filteredBatches.length === 0 ? (
        <p>No inventory batches match your filters.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Expiry date</th>
                <th>Days left</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredBatches.map((batch) => (
                <tr key={batch.batch_id}>
                  <td>{batch.product_name}</td>
                  <td>{batch.category}</td>
                  <td>{batch.quantity_remaining} units</td>
                  <td>{batch.expiry_date}</td>
                  <td>{batch.days_to_expiry}</td>
                  <td>
                    <span
                      className={`status status--${batch.status.toLowerCase()}`}
                    >
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
