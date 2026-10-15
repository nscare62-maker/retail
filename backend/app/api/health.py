from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import DATASETS_DIR, MODELS_DIR, FORECASTS_DIR

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": "Retail Demand Intelligence",
        "version": "1.0.0",
        "model_architecture": "Temporal Fusion Transformer (TFT)",
        "theme": "Wine & Gold Analytics"
    }

@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {str(e)}")

    if not (DATASETS_DIR.exists() and MODELS_DIR.exists() and FORECASTS_DIR.exists()):
        raise HTTPException(status_code=503, detail="Storage directories not accessible")

    return {
        "status": "ready",
        "database": "connected",
        "storage": "accessible"
    }
