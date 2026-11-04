
from fastapi.testclient import TestClient

from app.main import app


def test_demand_forecast_response():
    with TestClient(app) as client:
        response = client.get("/api/v1/forecasts/demand?days=7")

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, dict)
    assert len(data) > 0


def test_demand_forecast_rejects_invalid_days():
    with TestClient(app) as client:
        response = client.get("/api/v1/forecasts/demand?days=0")

    assert response.status_code == 422


def test_demand_forecast_rejects_too_many_days():
    with TestClient(app) as client:
        response = client.get("/api/v1/forecasts/demand?days=15")

    assert response.status_code == 422
