import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_health_endpoints():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Temporal Fusion Transformer" in data["model_architecture"]

    ready_resp = client.get("/api/ready")
    assert ready_resp.status_code == 200
    assert ready_resp.json()["status"] == "ready"

def test_dataset_workflow():
    # 1. Load sample dataset
    sample_resp = client.post("/api/datasets/sample")
    assert sample_resp.status_code == 200
    ds = sample_resp.json()
    dataset_id = ds["id"]
    assert dataset_id is not None
    assert ds["row_count"] > 100

    # 2. List datasets
    list_resp = client.get("/api/datasets")
    assert list_resp.status_code == 200
    datasets = list_resp.json()
    assert any(d["id"] == dataset_id for d in datasets)

    # 3. Preview dataset
    prev_resp = client.get(f"/api/datasets/{dataset_id}/preview")
    assert prev_resp.status_code == 200
    prev_data = prev_resp.json()
    assert len(prev_data["rows"]) > 0
    assert "sales" in prev_data["columns"]

    # 4. Quality report
    quality_resp = client.get(f"/api/datasets/{dataset_id}/quality")
    assert quality_resp.status_code == 200
    q_data = quality_resp.json()
    assert q_data["validation_passed"] is True

    # 5. Preprocess dataset
    pre_resp = client.post(
        f"/api/datasets/{dataset_id}/preprocess",
        json={
            "handle_missing": "zero",
            "outlier_treatment": "cap_iqr",
            "generate_calendar_features": True,
            "val_split_size": 0.15,
            "test_split_size": 0.15
        }
    )
    assert pre_resp.status_code == 200
    pre_data = pre_resp.json()
    assert pre_data["is_preprocessed"] is True
    assert "time_idx" in pre_data["before_after_summary"]["added_features"]

def test_inventory_calculation():
    # Test inventory logic with simulated forecast items
    sample_forecast_items = [
        {"date": f"2025-10-{i:02d}", "product_id": "PRD_WINE_01", "store_id": "STORE_01", "category": "Wine", "predicted_demand": 25.0 + i}
        for i in range(1, 15)
    ]
    from app.services.inventory_service import InventoryService
    res = InventoryService.calculate_recommendations(
        forecast_items=sample_forecast_items,
        current_inventory_map={"PRD_WINE_01_STORE_01": 150.0},
        lead_time_days=7,
        service_level=0.95
    )
    assert "items" in res
    assert len(res["items"]) == 1
    item = res["items"][0]
    assert item["expected_lead_time_demand"] > 0
    assert item["safety_stock"] > 0
    assert item["reorder_point"] > item["expected_lead_time_demand"]
    assert item["status_flag"] in ["OK", "REORDER_NOW", "CRITICAL_STOCKOUT", "EXCESS_STOCK"]

def test_e2e_tft_training_and_forecasting():
    import time
    # 1. Load sample dataset
    sample_resp = client.post("/api/datasets/sample")
    assert sample_resp.status_code == 200
    dataset_id = sample_resp.json()["id"]

    # 2. Preprocess
    pre_resp = client.post(
        f"/api/datasets/{dataset_id}/preprocess",
        json={"handle_missing": "zero", "outlier_treatment": "cap_iqr", "generate_calendar_features": True, "val_split_size": 0.15, "test_split_size": 0.15}
    )
    assert pre_resp.status_code == 200

    # 3. Train TFT model for 1 epoch
    train_resp = client.post(
        "/api/models/train",
        json={
            "name": "E2E Test TFT Model",
            "dataset_id": dataset_id,
            "target_col": "sales",
            "group_ids": ["product_id", "store_id"],
            "horizon": 7,
            "lookback": 14,
            "epochs": 1,
            "batch_size": 32,
            "learning_rate": 0.01
        }
    )
    assert train_resp.status_code == 200
    model_id = train_resp.json()["id"]

    # Wait for background training to complete (up to 40s)
    max_wait = 40
    start = time.time()
    completed = False
    while time.time() - start < max_wait:
        status_resp = client.get(f"/api/models/{model_id}/status")
        if status_resp.status_code == 200 and status_resp.json()["status"] == "completed":
            completed = True
            break
        time.sleep(2)

    assert completed, f"Model training did not complete in {max_wait}s"

    # 4. Check evaluation metrics
    metrics_resp = client.get(f"/api/models/{model_id}/metrics")
    assert metrics_resp.status_code == 200
    m_data = metrics_resp.json()
    assert m_data["mae"] is not None
    assert m_data["rmse"] is not None
    assert m_data["wape"] is not None

    # 5. Generate forecast
    fc_resp = client.post(
        "/api/forecasts",
        json={
            "model_id": model_id,
            "horizon": 7,
            "promo_rate": 0.1,
            "discount_rate": 0.05
        }
    )
    assert fc_resp.status_code == 200
    fc_data = fc_resp.json()
    forecast_id = fc_data["id"]
    assert len(fc_data["items"]) > 0
    # Check all predictions are non-negative
    for itm in fc_data["items"]:
        assert itm["predicted_demand"] >= 0.0
        assert itm["lower_bound"] >= 0.0
        assert itm["upper_bound"] >= itm["predicted_demand"]

    # 6. Generate Inventory recommendations
    inv_resp = client.post(
        "/api/inventory/recommendations",
        json={
            "forecast_id": forecast_id,
            "lead_time_days": 5,
            "service_level": 0.95
        }
    )
    assert inv_resp.status_code == 200
    inv_data = inv_resp.json()
    assert len(inv_data["items"]) > 0
    assert inv_data["summary"]["total_products_analyzed"] > 0
