import os
import json
import uuid
import shutil
import threading
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db, SessionLocal
from app.db.models import ModelRecord, Dataset
from app.schemas.schemas import ModelTrainRequest, ModelResponse, ModelMetricsResponse
from app.services.tft_service import TFTService
from app.jobs.job_manager import job_manager
from app.core.config import MODELS_DIR
from app.core.logging_config import logger

router = APIRouter()

def run_tft_training_background(model_id: str, dataset_path: Path, req_data: dict):
    db = SessionLocal()
    try:
        job_manager.update_job(model_id, status="training")
        record = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
        if record:
            record.status = "training"
            db.commit()

        results = TFTService.train_tft_model_sync(
            model_id=model_id,
            dataset_path=dataset_path,
            target_col=req_data.get("target_col", "sales"),
            group_ids=req_data.get("group_ids", ["product_id", "store_id"]),
            horizon=req_data.get("horizon", 14),
            lookback=req_data.get("lookback", 30),
            epochs=req_data.get("epochs", 10),
            batch_size=req_data.get("batch_size", 64),
            learning_rate=req_data.get("learning_rate", 0.001)
        )

        record = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
        if record:
            record.status = "completed"
            record.progress = 100.0
            record.checkpoint_path = results.get("checkpoint_path")
            eval_data = results.get("evaluation", {})
            record.metrics_json = json.dumps({
                "overall": eval_data.get("overall", {}),
                "loss_history": results.get("loss_history", []),
                "product_metrics": eval_data.get("product_metrics", []),
                "residual_bins": eval_data.get("residual_bins", []),
                "sample_predictions": eval_data.get("sample_predictions", []),
                "comparison": eval_data.get("comparison", {})
            })
            record.baseline_metrics_json = json.dumps(eval_data.get("baseline", {}))
            db.commit()

        job_manager.mark_completed(model_id, results)
        logger.info(f"Background TFT training completed for model {model_id}")

    except Exception as e:
        logger.error(f"Background TFT training failed for model {model_id}: {e}", exc_info=True)
        job_manager.mark_failed(model_id, str(e))
        record = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
        if record:
            record.status = "failed"
            record.error_message = str(e)
            db.commit()
    finally:
        db.close()

@router.post("/train", response_model=ModelResponse)
def train_model(
    req: ModelTrainRequest,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if not dataset.is_preprocessed or not dataset.preprocessed_path:
        # Auto-preprocess if not already done
        from app.services.preprocessing_service import PreprocessingService
        try:
            out_path, metadata, before_after = PreprocessingService.preprocess_dataset(
                raw_file_path=Path(dataset.file_path),
                dataset_id=dataset.id
            )
            dataset.is_preprocessed = True
            dataset.preprocessed_path = str(out_path)
            dataset.preprocessed_metadata_json = json.dumps({"metadata": metadata, "before_after_summary": before_after})
            dataset.status = "preprocessed"
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Dataset must be preprocessed before training: {e}")

    model_id = str(uuid.uuid4())
    dataset_path = Path(dataset.preprocessed_path)

    model_record = ModelRecord(
        id=model_id,
        name=req.name,
        dataset_id=req.dataset_id,
        target_col=req.target_col,
        group_ids_json=json.dumps(req.group_ids),
        horizon=req.horizon,
        lookback=req.lookback,
        epochs=req.epochs,
        batch_size=req.batch_size,
        learning_rate=req.learning_rate,
        status="pending",
        progress=0.0,
        current_epoch=0
    )
    db.add(model_record)
    db.commit()
    db.refresh(model_record)

    job_manager.register_job(model_id, "tft_training", {
        "model_id": model_id,
        "name": req.name,
        "total_epochs": req.epochs
    })

    thread = threading.Thread(
        target=run_tft_training_background,
        args=(model_id, dataset_path, req.model_dump()),
        daemon=True
    )
    thread.start()

    return ModelResponse(
        id=model_record.id,
        name=model_record.name,
        dataset_id=model_record.dataset_id,
        target_col=model_record.target_col,
        group_ids=json.loads(model_record.group_ids_json or "[]"),
        horizon=model_record.horizon,
        lookback=model_record.lookback,
        epochs=model_record.epochs,
        batch_size=model_record.batch_size,
        learning_rate=model_record.learning_rate,
        status=model_record.status,
        progress=model_record.progress,
        current_epoch=model_record.current_epoch,
        error_message=model_record.error_message,
        checkpoint_path=model_record.checkpoint_path,
        created_at=model_record.created_at
    )

@router.get("", response_model=List[ModelResponse])
def list_models(db: Session = Depends(get_db)):
    models = db.query(ModelRecord).order_by(ModelRecord.created_at.desc()).all()
    results = []
    for m in models:
        # Check active job progress if still training
        active_job = job_manager.get_job(m.id)
        prog = active_job["progress"] if (active_job and m.status == "training") else m.progress
        cur_ep = active_job["current_epoch"] if (active_job and m.status == "training") else m.current_epoch
        stat = active_job["status"] if (active_job and m.status in ["pending", "training"]) else m.status

        results.append(ModelResponse(
            id=m.id,
            name=m.name,
            dataset_id=m.dataset_id,
            target_col=m.target_col,
            group_ids=json.loads(m.group_ids_json or "[]"),
            horizon=m.horizon,
            lookback=m.lookback,
            epochs=m.epochs,
            batch_size=m.batch_size,
            learning_rate=m.learning_rate,
            status=stat,
            progress=prog,
            current_epoch=cur_ep,
            error_message=m.error_message,
            checkpoint_path=m.checkpoint_path,
            created_at=m.created_at
        ))
    return results

@router.get("/{model_id}", response_model=ModelResponse)
def get_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found.")

    active_job = job_manager.get_job(m.id)
    prog = active_job["progress"] if (active_job and m.status == "training") else m.progress
    cur_ep = active_job["current_epoch"] if (active_job and m.status == "training") else m.current_epoch
    stat = active_job["status"] if (active_job and m.status in ["pending", "training"]) else m.status

    return ModelResponse(
        id=m.id,
        name=m.name,
        dataset_id=m.dataset_id,
        target_col=m.target_col,
        group_ids=json.loads(m.group_ids_json or "[]"),
        horizon=m.horizon,
        lookback=m.lookback,
        epochs=m.epochs,
        batch_size=m.batch_size,
        learning_rate=m.learning_rate,
        status=stat,
        progress=prog,
        current_epoch=cur_ep,
        error_message=m.error_message,
        checkpoint_path=m.checkpoint_path,
        created_at=m.created_at
    )

@router.get("/{model_id}/status")
def get_model_status(model_id: str, db: Session = Depends(get_db)):
    m = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found.")

    active_job = job_manager.get_job(model_id)
    if active_job:
        return {
            "model_id": model_id,
            "status": active_job.get("status", m.status),
            "progress": active_job.get("progress", m.progress),
            "current_epoch": active_job.get("current_epoch", m.current_epoch),
            "total_epochs": m.epochs,
            "train_loss": active_job.get("train_loss"),
            "val_loss": active_job.get("val_loss"),
            "loss_history": active_job.get("loss_history", []),
            "error": active_job.get("error", m.error_message)
        }

    metrics = json.loads(m.metrics_json or "{}")
    return {
        "model_id": model_id,
        "status": m.status,
        "progress": m.progress,
        "current_epoch": m.current_epoch,
        "total_epochs": m.epochs,
        "loss_history": metrics.get("loss_history", []),
        "error": m.error_message
    }

@router.get("/{model_id}/metrics")
def get_model_metrics(model_id: str, db: Session = Depends(get_db)):
    m = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found.")

    metrics = json.loads(m.metrics_json or "{}")
    baseline = json.loads(m.baseline_metrics_json or "{}")
    overall = metrics.get("overall", {})

    return {
        "model_id": m.id,
        "name": m.name,
        "status": m.status,
        "mae": overall.get("mae"),
        "rmse": overall.get("rmse"),
        "wape": overall.get("wape"),
        "baseline_mae": baseline.get("mae"),
        "baseline_rmse": baseline.get("rmse"),
        "baseline_wape": baseline.get("wape"),
        "loss_history": metrics.get("loss_history", []),
        "product_metrics": metrics.get("product_metrics", []),
        "residual_bins": metrics.get("residual_bins", []),
        "sample_predictions": metrics.get("sample_predictions", []),
        "comparison": metrics.get("comparison", {})
    }

@router.delete("/{model_id}")
def delete_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found.")

    # Remove checkpoint folder
    model_folder = MODELS_DIR / model_id
    if model_folder.exists():
        shutil.rmtree(model_folder, ignore_errors=True)

    db.delete(m)
    db.commit()
    return {"message": "Model successfully deleted."}
