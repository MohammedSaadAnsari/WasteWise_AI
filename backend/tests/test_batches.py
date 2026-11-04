
from datetime import date

from fastapi.testclient import TestClient

from app.main import app


def test_list_batches_response():
    with TestClient(app) as client:
        response = client.get("/api/v1/batches?limit=10")

    assert response.status_code == 200

    data = response.json()

    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert data["total"] == len(data["items"])

    for batch in data["items"]:
        assert "batch_id" in batch
        assert "product_id" in batch
        assert "product_name" in batch
        assert "quantity_remaining" in batch
        assert "expiry_date" in batch
        assert "days_to_expiry" in batch
        assert "status" in batch

        expiry_date = date.fromisoformat(batch["expiry_date"])
        expected_days = (expiry_date - date.today()).days

        assert batch["days_to_expiry"] == expected_days


def test_list_batches_limit_validation():
    with TestClient(app) as client:
        response = client.get("/api/v1/batches?limit=0")

    assert response.status_code == 422
