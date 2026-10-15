import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Dataset
from app.schemas.schemas import PreprocessingConfig, PreprocessingResponse
from app.services.preprocessing_service import PreprocessingService
from app.core.logging_config import logger

router = APIRouter()

@router.post("/{dataset_id}/preprocess", response_model=PreprocessingResponse)
def preprocess_dataset(
    dataset_id: str,
    config: PreprocessingConfig,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    raw_path = Path(dataset.file_path)
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail="Raw dataset file not found.")

    try:
        dataset.status = "preprocessing"
        db.commit()

        out_path, metadata, before_after = PreprocessingService.preprocess_dataset(
            raw_file_path=raw_path,
            dataset_id=dataset_id,
            handle_missing=config.handle_missing,
            outlier_treatment=config.outlier_treatment,
            generate_calendar_features=config.generate_calendar_features,
            val_split_size=config.val_split_size,
            test_split_size=config.test_split_size
        )

        dataset.is_preprocessed = True
        dataset.preprocessed_path = str(out_path)
        dataset.preprocessed_metadata_json = json.dumps({
            "metadata": metadata,
            "before_after_summary": before_after
        })
        dataset.status = "preprocessed"
        db.commit()

        return PreprocessingResponse(
            dataset_id=dataset.id,
            status=dataset.status,
            is_preprocessed=dataset.is_preprocessed,
            metadata=metadata,
            before_after_summary=before_after
        )
    except Exception as e:
        dataset.status = "preprocessing_error"
        db.commit()
        logger.error(f"Preprocessing failed for dataset {dataset_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Preprocessing failed: {str(e)}")

@router.get("/{dataset_id}/preprocessing-status")
def get_preprocessing_status(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if not dataset.is_preprocessed or not dataset.preprocessed_metadata_json:
        return {
            "dataset_id": dataset.id,
            "status": dataset.status,
            "is_preprocessed": False,
            "metadata": {},
            "before_after_summary": {}
        }

    data = json.loads(dataset.preprocessed_metadata_json)
    return {
        "dataset_id": dataset.id,
        "status": dataset.status,
        "is_preprocessed": True,
        "metadata": data.get("metadata", {}),
        "before_after_summary": data.get("before_after_summary", {})
    }
