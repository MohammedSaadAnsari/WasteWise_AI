
import { useEffect, useState } from "react";
import { ApiError, apiGet, checkApiHealth } from "../services/api";
import Inventory from "../pages/Inventory";
import type { InventoryBatchResponse } from "../services/inventory";
import { getInventoryBatches } from "../services/inventory";
import type { DemandForecast, DemandPoint } from "../services/predictions";
import { getDemandForecast } from "../services/predictions";

type WorkspaceView =
  | "dashboard"
  | "inventory"
  | "monitoring"
  | "predictions";

type ApiStatus = "checking" | "connected" | "offline";

type ExpiryAlert = {
  batch_id: number;
  product_name: string;
  expiry_date: string;
  quantity_remaining: number;
  days_to_expiry: number;
  status: string;
};

type DashboardSummary = {
  sales_units_7d: number;
  sales_change_percent: number | null;
  sales_days_recorded: number;
  at_risk_batches: number;
  waste_units_month: number;
  daily_sales: DemandPoint[];
  alerts: ExpiryAlert[];
  as_of: string;
};

const views: { id: WorkspaceView; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "inventory", label: "Inventory", icon: "□" },
  { id: "monitoring", label: "Monitoring", icon: "◉" },
  { id: "predictions", label: "Predictions", icon: "⌁" },
];

const chartLeft = 45;
const chartRight = 675;
const chartTop = 24;
const chartBottom = 220;

function getPoint(index: number, value: number, chartMax: number) {
  const x = chartLeft + (index / 13) * (chartRight - chartLeft);
  const y = chartBottom - (value / chartMax) * (chartBottom - chartTop);
  return `${x},${y}`;
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function getExpiryMessage(days: number): string {
  if (days < 0) {
    const expiredDays = Math.abs(days);
    return `Expired ${expiredDays} day${expiredDays === 1 ? "" : "s"} ago`;
  }

  if (days === 0) {
    return "Expires today";
  }

  if (days === 1) {
    return "Expires tomorrow";
  }

  return `Expires in ${days} days`;
}

function SalesForecastChart({
  history,
  forecast,
}: {
  history: DemandPoint[];
  forecast: DemandPoint[];
}) {
  const values = [...history, ...forecast].map((point) => point.units);
  const chartMax = Math.max(10, Math.ceil(Math.max(...values, 1) / 20) * 20);

  const observedPoints = history
    .map((point, index) => getPoint(index, point.units, chartMax))
    .join(" ");

  const forecastPoints = [
    getPoint(
      Math.max(history.length - 1, 0),
      history[history.length - 1]?.units ?? 0,
      chartMax,
    ),
    ...forecast.map((point, index) =>
      getPoint(index + history.length, point.units, chartMax),
    ),
  ].join(" ");

  const yTicks = [0, 1, 2, 3, 4].map((step) =>
    Math.round((chartMax * step) / 4),
  );

  const chartDates = [...history, ...forecast];
  const xTicks = chartDates
    .map((point, index) => ({
      index,
      label: formatWeekday(point.date),
    }))
    .filter(
      ({ index }) =>
        index === 0 ||
        index % 2 === 0 ||
        index === chartDates.length - 1,
    );

  const dividerX =
    chartLeft +
    (Math.max(history.length - 1, 0) / 13) *
      (chartRight - chartLeft);

  return (
    <svg
      className="forecast-chart"
      viewBox="0 0 720 270"
      role="img"
      aria-label="Demand chart from historical sales and model forecast"
    >
      {yTicks.map((tick) => {
        const y =
          chartBottom - (tick / chartMax) * (chartBottom - chartTop);

        return (
          <g key={tick}>
            <line
              className="forecast-chart__grid"
              x1={chartLeft}
              x2={chartRight}
              y1={y}
              y2={y}
            />
            <text className="forecast-chart__axis" x="8" y={y + 4}>
              {tick}
            </text>
          </g>
        );
      })}

      <line
        className="forecast-chart__divider"
        x1={dividerX}
        x2={dividerX}
        y1={chartTop}
        y2={chartBottom}
      />

      <text
        className="forecast-chart__divider-label"
        x={dividerX + 8}
        y={chartTop + 13}
      >
        FORECAST
      </text>

      <polyline
        className="forecast-chart__observed"
        points={observedPoints}
      />

      <polyline
        className="forecast-chart__projected"
        points={forecastPoints}
      />

      {history.map((value, index) => {
        const [x, y] = getPoint(index, value.units, chartMax).split(",");

        return (
          <circle
            className="forecast-chart__observed-point"
            cx={x}
            cy={y}
            key={`observed-${index}`}
            r="4"
          />
        );
      })}

      {forecast.map((value, index) => {
        const [x, y] = getPoint(
          index + history.length,
          value.units,
          chartMax,
        ).split(",");

        return (
          <circle
            className="forecast-chart__projected-point"
            cx={x}
            cy={y}
            key={`projected-${index}`}
            r="4"
          />
        );
      })}

      {xTicks.map(({ index, label }) => {
        const x =
          chartLeft + (index / 13) * (chartRight - chartLeft);

        return (
          <text
            className="forecast-chart__axis"
            key={`${label}-${index}`}
            textAnchor="middle"
            x={x}
            y="247"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function WorkspaceContent({ view }: { view: WorkspaceView }) {
  if (view === "inventory") {
    return <Inventory />;
  }

  return <WorkspaceDataContent view={view} />;
}

function WorkspaceDataContent({
  view,
}: {
  view: Exclude<WorkspaceView, "inventory">;
}) {
  const [data, setData] = useState<
    DashboardSummary | InventoryBatchResponse | DemandForecast | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        if (view === "dashboard") {
          const [summary, batches] = await Promise.all([
            apiGet<DashboardSummary>(
              "/api/v1/dashboard/summary",
              controller.signal,
            ),
            getInventoryBatches(controller.signal),
          ]);

          const expiryAlerts: ExpiryAlert[] = batches.items
            .filter((batch) => batch.days_to_expiry <= 3)
            .sort((a, b) => a.days_to_expiry - b.days_to_expiry)
            .map((batch) => ({
              batch_id: batch.batch_id,
              product_name: batch.product_name,
              expiry_date: batch.expiry_date,
              quantity_remaining: batch.quantity_remaining,
              days_to_expiry: batch.days_to_expiry,
              status: batch.days_to_expiry <= 1 ? "Urgent" : "Watch",
            }));

          setData({
            ...summary,
            at_risk_batches: batches.items.filter(
              (batch) => batch.days_to_expiry <= 3,
            ).length,
            alerts: expiryAlerts,
          });
        } else if (view === "monitoring") {
          const result = await getInventoryBatches(controller.signal);
          setData(result);
        } else {
          const result = await getDemandForecast(7, controller.signal);
          setData(result);
        }
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setError(
          loadError instanceof ApiError || loadError instanceof Error
            ? loadError.message
            : "The requested workspace data could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => controller.abort();
  }, [view, retry]);

  if (loading) {
    return (
      <div className="workspace-state" role="status">
        Loading {view} from the WasteWise API…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="workspace-state workspace-state--error"
        role="alert"
      >
        <strong>{error || "The API returned no data."}</strong>
        <span>
          Check the backend connection and MySQL configuration, then try
          again.
        </span>
        <button
          className="workspace-state__retry"
          type="button"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry connection
        </button>
      </div>
    );
  }

  if (view === "monitoring") {
    const batches = (data as InventoryBatchResponse).items;

    return (
      <>
        <div className="workspace__view-heading">
          <div>
            <span className="workspace__overline">Inventory pulse</span>
            <h3>Monitoring</h3>
            <p>{batches.length} inventory batches loaded from MySQL.</p>
          </div>
          <span className="workspace__sample-tag">MYSQL INVENTORY</span>
        </div>

        <div className="monitor-table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>On hand</th>
                <th>Freshness</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.batch_id}>
                  <td>
                    <strong>{batch.product_name}</strong>
                    <span>{batch.category}</span>
                  </td>
                  <td>
                    {batch.quantity_remaining} <small>units</small>
                  </td>
                  <td>
                    {batch.days_to_expiry < 0
                      ? "Expired"
                      : batch.days_to_expiry === 0
                        ? "Today"
                        : `${batch.days_to_expiry} days`}
                  </td>
                  <td>
                    <span
                      className={`status-pill status-pill--${batch.status.toLowerCase()}`}
                    >
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    No inventory batches have been added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="workspace__footnote">
          Inventory levels and freshness status are read from your MySQL
          database.
        </p>
      </>
    );
  }

  if (view === "predictions") {
    const predictions = data as DemandForecast;

    return (
      <>
        <div className="workspace__view-heading">
          <div>
            <span className="workspace__overline">
              Plan a little further ahead
            </span>
            <h3>Demand predictions</h3>
            <p>
              Store {predictions.store_id} · data through {predictions.as_of}{" "}
              ({predictions.history_days} days).
            </p>
          </div>
          <span className="workspace__sample-tag">MODEL PROTOTYPE</span>
        </div>

        <div className="chart-card">
          <div className="chart-card__heading">
            <div>
              <strong>Daily demand</strong>
              <span>Observed sales and 7-day forecast · units</span>
            </div>
            <span className="chart-card__metric">
              Model R²{" "}
              <strong>
                {predictions.model_validation.r2?.toFixed(2) ?? "n/a"}
              </strong>
            </span>
          </div>

          <SalesForecastChart
            history={predictions.history}
            forecast={predictions.forecast}
          />

          <div className="chart-legend">
            <span>
              <i className="chart-legend__observed" />
              Observed
            </span>
            <span>
              <i className="chart-legend__forecast" />
              Model forecast
            </span>
          </div>
        </div>

        <p className="workspace__footnote">
          {predictions.stale_days > 7 && (
            <strong className="workspace__stale-warning">
              Sales are {predictions.stale_days} days old. Refresh your data.{" "}
            </strong>
          )}
          {predictions.note}
        </p>
      </>
    );
  }

  const summary = data as DashboardSummary;
  const maxDailySales = Math.max(
    1,
    ...summary.daily_sales.map((day) => day.units),
  );

  return (
    <>
      <div className="workspace__view-heading">
        <div>
          <span className="workspace__overline">
            A clearer view of today
          </span>
          <h3>
            Good morning, team <span aria-hidden="true">✳</span>
          </h3>
          <p>Here’s a quick look at your food operations.</p>
        </div>
        <span className="workspace__sample-tag">MYSQL CONNECTED</span>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-card__label">Demand this week</span>
          <strong>
            {summary.sales_units_7d.toLocaleString()} <small>units</small>
          </strong>
          <span className="metric-card__note metric-card__note--positive">
            {summary.sales_days_recorded === 0
              ? "No sales recorded in the last 7 days"
              : summary.sales_change_percent === null
                ? `${summary.sales_days_recorded} sales days · no prior week to compare`
                : `${summary.sales_change_percent > 0 ? "↑" : summary.sales_change_percent < 0 ? "↓" : ""} ${Math.abs(summary.sales_change_percent)}% vs. last week`}
          </span>
          <span className="metric-card__icon">
            <span>↗</span>
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-card__label">Batches to watch</span>
          <strong>
            {summary.at_risk_batches} <small>batches</small>
          </strong>
          <span className="metric-card__note metric-card__note--attention">
            Expiring within 3 days
          </span>
          <span className="metric-card__icon metric-card__icon--orange">
            <span>!</span>
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-card__label">Waste this month</span>
          <strong>
            {summary.waste_units_month.toLocaleString()} <small>units</small>
          </strong>
          <span className="metric-card__note">
            Recorded waste this month
          </span>
          <span className="metric-card__icon metric-card__icon--mint">
            <span>⌁</span>
          </span>
        </article>
      </div>

      <div className="dashboard-lower">
        <article className="dashboard-panel">
          <div className="dashboard-panel__heading">
            <div>
              <strong>Demand at a glance</strong>
              <span>Daily recorded sales</span>
            </div>
            <span className="dashboard-panel__range">Last 7 days</span>
        </div>
<div
  className="mini-bars"
  role="img"
  aria-label={`Daily recorded sales: ${summary.daily_sales
    .map((day) => `${formatWeekday(day.date)} ${day.units} units`)
    .join(", ")}`}
>
  {summary.daily_sales.map((day, index) => (
    <div
      className="mini-bars__item"
      key={day.date}
      title={`${day.date}: ${day.units} units`}
      aria-label={`${day.date}: ${day.units} units`}
    >
      <span className="mini-bars__value">
        {day.units}
      </span>

      <div
        className={`mini-bars__bar${
          index === summary.daily_sales.length - 1
            ? " mini-bars__bar--highlight"
            : ""
        }`}
        style={{
          height: `${Math.max(
            day.units > 0 ? 8 : 2,
            (day.units / maxDailySales) * 100,
          )}%`,
        }}
      />

      <span>{formatWeekday(day.date).slice(0, 1)}</span>
    </div>
  ))}
</div>

        </article>

        <article className="attention-panel">
          <div className="attention-panel__heading">
            <strong>Expiry alerts</strong>
            <span>{summary.alerts.length} items</span>
          </div>

          {summary.alerts.map((alert) => (
            <div className="attention-item" key={alert.batch_id}>
              <span
                className={`attention-item__dot${
                  alert.status === "Urgent"
                    ? " attention-item__dot--orange"
                    : " attention-item__dot--green"
                }`}
              />
              <div>
                <strong>{alert.product_name}</strong>
                <span>
                  {alert.quantity_remaining} units ·{" "}
                  {getExpiryMessage(alert.days_to_expiry)}
                </span>
                <span
                  className={`status-pill status-pill--${alert.status.toLowerCase()}`}
                >
                  {alert.status}
                </span>
              </div>
              <span className="attention-item__arrow" aria-hidden="true">
                ›
              </span>
            </div>
          ))}

          {summary.alerts.length === 0 && (
            <p className="attention-panel__empty">
              No batches are nearing expiry.
            </p>
          )}
        </article>
      </div>

      <p className="workspace__footnote">
        Dashboard metrics are calculated from sales, inventory and waste
        records in MySQL.
      </p>
    </>
  );
}

export default function DashboardPreview() {
  const [activeView, setActiveView] =
    useState<WorkspaceView>("dashboard");

  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    const controller = new AbortController();

    checkApiHealth(controller.signal)
      .then(() => setApiStatus("connected"))
      .catch(() => {
        if (!controller.signal.aborted) {
          setApiStatus("offline");
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <section
      className="workspace-section"
      id="workspace"
      aria-labelledby="workspace-title"
    >
      <div className="workspace-section__intro">
        <span className="eyebrow">
          Meet your everyday food companion
        </span>
        <h2 id="workspace-title">
          The whole picture,
          <br />
          <span>in one place.</span>
        </h2>
        <p>
          Explore the WasteWise workspace: a home for your operations, stock
          monitoring and demand insights.
        </p>
      </div>

      <div className="workspace">
        <aside
          className="workspace__sidebar"
          aria-label="Workspace sections"
        >
          <div className="workspace__brand">
            <span className="workspace__brand-mark">w</span>
            <span>
              Waste<span>Wise</span>
              <small>FOOD INTELLIGENCE</small>
            </span>
          </div>

          <span className="workspace__nav-label">WORKSPACE</span>

          <div
            className="workspace__nav"
            role="tablist"
            aria-label="Workspace views"
          >
            {views.map((view) => (
              <button
                aria-controls="workspace-panel"
                aria-selected={activeView === view.id}
                className={`workspace__nav-item${
                  activeView === view.id
                    ? " workspace__nav-item--active"
                    : ""
                }`}
                id={`${view.id}-tab`}
                key={view.id}
                onClick={() => setActiveView(view.id)}
                onKeyDown={(event) => {
                  if (
                    event.key !== "ArrowLeft" &&
                    event.key !== "ArrowRight"
                  ) {
                    return;
                  }

                  event.preventDefault();

                  const currentIndex = views.findIndex(
                    (item) => item.id === activeView,
                  );

                  const offset = event.key === "ArrowRight" ? 1 : -1;
                  const nextView =
                    views[
                      (currentIndex + offset + views.length) % views.length
                    ];

                  setActiveView(nextView.id);
                  document
                    .getElementById(`${nextView.id}-tab`)
                    ?.focus();
                }}
                role="tab"
                type="button"
              >
                <span className="workspace__nav-icon" aria-hidden="true">
                  {view.icon}
                </span>
                {view.label}
              </button>
            ))}
          </div>

          <div className="workspace__sidebar-bottom">
            <span
              className={`workspace__online-dot${
                apiStatus === "connected"
                  ? ""
                  : " workspace__online-dot--offline"
              }`}
            />
            Connected workspace
            <span className="workspace__avatar">W</span>
          </div>
        </aside>

        <div className="workspace__main">
          <div className="workspace__topbar">
            <span className="workspace__breadcrumb">
              Workspace <span>/</span>{" "}
              {views.find((view) => view.id === activeView)?.label}
            </span>

            <span className={`api-connection api-connection--${apiStatus}`}>
              <span />
              {apiStatus === "checking"
                ? "Connecting…"
                : apiStatus === "connected"
                  ? "MySQL connected"
                  : "Backend offline"}
            </span>
          </div>

          <div
            aria-labelledby={`${activeView}-tab`}
            className="workspace__content"
            id="workspace-panel"
            key={activeView}
            role="tabpanel"
            tabIndex={0}
          >
            <WorkspaceContent view={activeView} />
          </div>
        </div>
      </div>
    </section>
  );
}
