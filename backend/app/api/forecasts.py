import os
import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ForecastRecord, ModelRecord, Dataset
from app.schemas.schemas import ForecastRequest, ForecastResponse, ForecastItem
from app.services.forecasting_service import ForecastingService
from app.core.config import FORECASTS_DIR
from app.core.logging_config import logger

router = APIRouter()

@router.post("", response_model=ForecastResponse)
def generate_forecast(
    req: ForecastRequest,
    db: Session = Depends(get_db)
):
    model = db.query(ModelRecord).filter(ModelRecord.id == req.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found.")

    if model.status != "completed":
        raise HTTPException(status_code=400, detail=f"Model training status is '{model.status}'. Forecasts require a completed model.")

    dataset = db.query(Dataset).filter(Dataset.id == model.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Associated dataset not found.")

    dataset_path = Path(dataset.preprocessed_path if dataset.is_preprocessed else dataset.file_path)
    if not dataset_path.exists():
        raise HTTPException(status_code=404, detail="Dataset file not found on disk.")

    try:
        result = ForecastingService.generate_forecast(
            model_id=model.id,
            dataset_path=dataset_path,
            horizon=req.horizon,
            product_ids=req.product_ids,
            store_ids=req.store_ids,
            promo_rate=req.promo_rate or 0.1,
            discount_rate=req.discount_rate or 0.0
        )

        forecast_record = ForecastRecord(
            id=result["forecast_id"],
            model_id=model.id,
            dataset_id=dataset.id,
            horizon=result["horizon"],
            start_date=result["start_date"],
            predictions_path=result["file_path"],
            summary_json=json.dumps(result["summary"])
        )
        db.add(forecast_record)
        db.commit()
        db.refresh(forecast_record)

        items = [ForecastItem(**item) for item in result["items"]]

        return ForecastResponse(
            id=forecast_record.id,
            model_id=forecast_record.model_id,
            dataset_id=forecast_record.dataset_id,
            horizon=forecast_record.horizon,
            start_date=forecast_record.start_date,
            items=items,
            summary=result["summary"],
            created_at=forecast_record.created_at
        )

    except Exception as e:
        logger.error(f"Forecast generation failed for model {req.model_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Forecasting failed: {str(e)}")

@router.get("", response_model=List[dict])
def list_forecasts(db: Session = Depends(get_db)):
    forecasts = db.query(ForecastRecord).order_by(ForecastRecord.created_at.desc()).all()
    results = []
    for f in forecasts:
        results.append({
            "id": f.id,
            "model_id": f.model_id,
            "dataset_id": f.dataset_id,
            "horizon": f.horizon,
            "start_date": f.start_date,
            "summary": json.loads(f.summary_json or "{}"),
            "created_at": f.created_at
        })
    return results

@router.get("/{forecast_id}", response_model=ForecastResponse)
def get_forecast(forecast_id: str, db: Session = Depends(get_db)):
    f = db.query(ForecastRecord).filter(ForecastRecord.id == forecast_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Forecast not found.")

    path = Path(f.predictions_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Forecast file not found.")

    import pandas as pd
    df = pd.read_csv(path)
    items = [ForecastItem(**row) for row in df.to_dict(orient="records")]

    return ForecastResponse(
        id=f.id,
        model_id=f.model_id,
        dataset_id=f.dataset_id,
        horizon=f.horizon,
        start_date=f.start_date,
        items=items,
        summary=json.loads(f.summary_json or "{}"),
        created_at=f.created_at
    )

@router.get("/{forecast_id}/export")
def export_forecast(forecast_id: str, db: Session = Depends(get_db)):
    f = db.query(ForecastRecord).filter(ForecastRecord.id == forecast_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Forecast not found.")

    path = Path(f.predictions_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Forecast file not found.")

    return FileResponse(
        path=str(path),
        media_type="text/csv",
        filename=f"forecast_{f.id[:8]}_{f.start_date}.csv"
    )
