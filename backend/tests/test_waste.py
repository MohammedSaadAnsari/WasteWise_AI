
from fastapi.testclient import TestClient

from app.main import app


def test_list_waste_records():
    with TestClient(app) as client:
        response = client.get("/api/v1/waste/?limit=10")

    assert response.status_code == 200
    assert isinstance(response.json(), list)

    for record in response.json():
        assert "waste_record_id" in record
        assert "product_id" in record
        assert "wasted_on" in record
        assert "waste_units" in record


def test_waste_summary():
    with TestClient(app) as client:
        response = client.get("/api/v1/waste/summary")

    assert response.status_code == 200

    data = response.json()

    assert "total_records" in data
    assert "total_waste_units" in data
    assert data["total_records"] >= 0
    assert data["total_waste_units"] >= 0


def test_waste_limit_validation():
    with TestClient(app) as client:
        response = client.get("/api/v1/waste/?limit=0")

    assert response.status_code == 422
