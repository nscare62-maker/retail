import os
import json
import uuid
import io
import pandas as pd
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import InventoryRecord, ForecastRecord
from app.schemas.schemas import InventoryRequest, InventoryResponse, InventoryItem
from app.services.inventory_service import InventoryService
from app.core.logging_config import logger

router = APIRouter()

@router.post("/recommendations", response_model=InventoryResponse)
def create_inventory_recommendations(
    req: InventoryRequest,
    db: Session = Depends(get_db)
):
    forecast = db.query(ForecastRecord).filter(ForecastRecord.id == req.forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found.")

    if not os.path.exists(forecast.predictions_path):
        raise HTTPException(status_code=404, detail="Underlying forecast prediction file not found.")

    try:
        df = pd.read_csv(forecast.predictions_path)
        items_dict = df.to_dict(orient="records")

        calc_result = InventoryService.calculate_recommendations(
            forecast_items=items_dict,
            current_inventory_map=req.custom_inventory,
            lead_time_days=req.lead_time_days,
            service_level=req.service_level
        )

        rec_id = str(uuid.uuid4())
        rec_record = InventoryRecord(
            id=rec_id,
            forecast_id=forecast.id,
            lead_time_days=req.lead_time_days,
            service_level=req.service_level,
            recommendations_data_json=json.dumps(calc_result["items"]),
            summary_json=json.dumps(calc_result["summary"])
        )
        db.add(rec_record)
        db.commit()
        db.refresh(rec_record)

        items = [InventoryItem(**item) for item in calc_result["items"]]

        return InventoryResponse(
            id=rec_record.id,
            forecast_id=rec_record.forecast_id,
            lead_time_days=rec_record.lead_time_days,
            service_level=rec_record.service_level,
            items=items,
            summary=calc_result["summary"],
            created_at=rec_record.created_at
        )

    except Exception as e:
        logger.error(f"Inventory planning calculation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inventory calculation failed: {str(e)}")

@router.get("/recommendations", response_model=List[dict])
def list_inventory_recommendations(db: Session = Depends(get_db)):
    records = db.query(InventoryRecord).order_by(InventoryRecord.created_at.desc()).all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "forecast_id": r.forecast_id,
            "lead_time_days": r.lead_time_days,
            "service_level": r.service_level,
            "summary": json.loads(r.summary_json or "{}"),
            "created_at": r.created_at
        })
    return results

@router.get("/recommendations/{rec_id}", response_model=InventoryResponse)
def get_inventory_recommendation(rec_id: str, db: Session = Depends(get_db)):
    r = db.query(InventoryRecord).filter(InventoryRecord.id == rec_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Inventory recommendation record not found.")

    raw_items = json.loads(r.recommendations_data_json or "[]")
    items = [InventoryItem(**i) for i in raw_items]

    return InventoryResponse(
        id=r.id,
        forecast_id=r.forecast_id,
        lead_time_days=r.lead_time_days,
        service_level=r.service_level,
        items=items,
        summary=json.loads(r.summary_json or "{}"),
        created_at=r.created_at
    )

@router.get("/recommendations/{rec_id}/export")
def export_inventory_recommendation(rec_id: str, db: Session = Depends(get_db)):
    r = db.query(InventoryRecord).filter(InventoryRecord.id == rec_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Inventory recommendation record not found.")

    items = json.loads(r.recommendations_data_json or "[]")
    df = pd.DataFrame(items)

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=inventory_recommendations_{r.id[:8]}.csv"
    return response
