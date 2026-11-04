
from fastapi.testclient import TestClient

from app.main import app


def test_dashboard_summary_response():
    with TestClient(app) as client:
        response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200

    data = response.json()

    assert "sales_units_7d" in data
    assert "sales_change_percent" in data
    assert "sales_days_recorded" in data
    assert "at_risk_batches" in data
    assert "waste_units_month" in data
    assert "daily_sales" in data
    assert "alerts" in data
    assert "as_of" in data

    assert isinstance(data["daily_sales"], list)
    assert len(data["daily_sales"]) == 7

    assert isinstance(data["alerts"], list)

    for day in data["daily_sales"]:
        assert "date" in day
        assert "units" in day

    for alert in data["alerts"]:
        assert "product_name" in alert
        assert "expiry_date" in alert
        assert "days_to_expiry" in alert
        assert alert["status"] in {"Urgent", "Watch"}