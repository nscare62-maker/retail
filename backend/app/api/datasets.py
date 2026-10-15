import os
import json
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Dataset
from app.core.config import DATASETS_DIR, settings
from app.services.data_service import DataService
from app.schemas.schemas import DatasetResponse, DatasetDetailResponse, DatasetPreviewResponse, QualityReport
from app.core.logging_config import logger

router = APIRouter()

@router.post("/upload", response_model=DatasetDetailResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    dataset_id = str(uuid.uuid4())
    safe_filename = f"{dataset_id}_{Path(file.filename).name}"
    save_path = DATASETS_DIR / safe_filename

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Validate and analyze
    report = DataService.validate_and_analyze_csv(save_path)
    if not report["validation_passed"]:
        # Do not discard, but mark status and save issues
        logger.warning(f"Uploaded dataset {file.filename} has validation issues: {report['issues']}")

    dataset_name = name or Path(file.filename).stem

    dataset = Dataset(
        id=dataset_id,
        name=dataset_name,
        filename=file.filename,
        file_path=str(save_path),
        row_count=report["total_rows"],
        col_count=report["total_cols"],
        columns_json=json.dumps(list(report["column_types"].keys())),
        summary_stats_json=json.dumps(report["numerical_summary"]),
        quality_report_json=json.dumps(report),
        status="uploaded" if report["validation_passed"] else "validation_warning",
        is_preprocessed=False
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return DatasetDetailResponse(
        id=dataset.id,
        name=dataset.name,
        filename=dataset.filename,
        row_count=dataset.row_count,
        col_count=dataset.col_count,
        columns=json.loads(dataset.columns_json or "[]"),
        status=dataset.status,
        is_preprocessed=dataset.is_preprocessed,
        created_at=dataset.created_at,
        quality_report=report,
        summary_stats=report["numerical_summary"],
        preprocessed_metadata=None
    )

@router.post("/sample", response_model=DatasetDetailResponse)
def load_sample_dataset(db: Session = Depends(get_db)):
    """Generates and loads a full synthetic retail dataset for immediate exploration and TFT training."""
    dataset_id = str(uuid.uuid4())
    filename = f"synthetic_retail_sales_{dataset_id[:8]}.csv"
    save_path = DATASETS_DIR / filename

    DataService.generate_synthetic_retail_dataset(num_days=400, output_path=save_path)
    report = DataService.validate_and_analyze_csv(save_path)

    dataset = Dataset(
        id=dataset_id,
        name="Synthetic Retail Sales (Sample)",
        filename=filename,
        file_path=str(save_path),
        row_count=report["total_rows"],
        col_count=report["total_cols"],
        columns_json=json.dumps(list(report["column_types"].keys())),
        summary_stats_json=json.dumps(report["numerical_summary"]),
        quality_report_json=json.dumps(report),
        status="uploaded",
        is_preprocessed=False
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return DatasetDetailResponse(
        id=dataset.id,
        name=dataset.name,
        filename=dataset.filename,
        row_count=dataset.row_count,
        col_count=dataset.col_count,
        columns=json.loads(dataset.columns_json or "[]"),
        status=dataset.status,
        is_preprocessed=dataset.is_preprocessed,
        created_at=dataset.created_at,
        quality_report=report,
        summary_stats=report["numerical_summary"],
        preprocessed_metadata=None
    )

@router.get("", response_model=List[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    results = []
    for d in datasets:
        results.append(DatasetResponse(
            id=d.id,
            name=d.name,
            filename=d.filename,
            row_count=d.row_count,
            col_count=d.col_count,
            columns=json.loads(d.columns_json or "[]"),
            status=d.status,
            is_preprocessed=d.is_preprocessed,
            created_at=d.created_at
        ))
    return results

@router.get("/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    return DatasetDetailResponse(
        id=dataset.id,
        name=dataset.name,
        filename=dataset.filename,
        row_count=dataset.row_count,
        col_count=dataset.col_count,
        columns=json.loads(dataset.columns_json or "[]"),
        status=dataset.status,
        is_preprocessed=dataset.is_preprocessed,
        created_at=dataset.created_at,
        quality_report=json.loads(dataset.quality_report_json) if dataset.quality_report_json else None,
        summary_stats=json.loads(dataset.summary_stats_json) if dataset.summary_stats_json else None,
        preprocessed_metadata=json.loads(dataset.preprocessed_metadata_json) if dataset.preprocessed_metadata_json else None
    )

@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def get_dataset_preview(dataset_id: str, limit: int = 20, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    path = Path(dataset.preprocessed_path if (dataset.is_preprocessed and dataset.preprocessed_path) else dataset.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Underlying dataset file not found.")

    preview = DataService.get_preview(path, limit=limit)
    return DatasetPreviewResponse(
        columns=preview["columns"],
        rows=preview["rows"],
        total_rows=preview["total_rows"]
    )

@router.get("/{dataset_id}/quality")
def get_dataset_quality(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if dataset.quality_report_json:
        return json.loads(dataset.quality_report_json)

    path = Path(dataset.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Dataset file not found.")

    report = DataService.validate_and_analyze_csv(path)
    dataset.quality_report_json = json.dumps(report)
    db.commit()
    return report

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    # Remove files
    try:
        if dataset.file_path and os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)
        if dataset.preprocessed_path and os.path.exists(dataset.preprocessed_path):
            os.remove(dataset.preprocessed_path)
    except Exception as e:
        logger.warning(f"Error removing dataset files for {dataset_id}: {e}")

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset successfully deleted."}
