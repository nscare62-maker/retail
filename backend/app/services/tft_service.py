import os
import json
import torch
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
import lightning.pytorch as pl
from lightning.pytorch.callbacks import Callback, EarlyStopping, ModelCheckpoint
from pytorch_forecasting import TimeSeriesDataSet, TemporalFusionTransformer
from pytorch_forecasting.metrics import QuantileLoss
from app.core.config import MODELS_DIR
from app.core.logging_config import logger
from app.jobs.job_manager import job_manager
from app.db.session import SessionLocal
from app.db.models import ModelRecord

class TFTProgressCallback(Callback):
    """Monitors Lightning training epochs and streams real progress to JobManager and DB."""
    def __init__(self, model_id: str, total_epochs: int):
        super().__init__()
        self.model_id = model_id
        self.total_epochs = total_epochs
        self.loss_history = []

    def on_train_epoch_end(self, trainer: pl.Trainer, pl_module: pl.LightningModule):
        epoch = trainer.current_epoch
        metrics = trainer.callback_metrics
        train_loss = float(metrics.get("train_loss_epoch", metrics.get("train_loss", 0.0)))
        val_loss = float(metrics.get("val_loss", train_loss))
        
        progress = round(float((epoch + 1) / max(1, self.total_epochs) * 100), 1)
        entry = {
            "epoch": epoch + 1,
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4)
        }
        self.loss_history.append(entry)

        job_manager.update_job(
            self.model_id,
            progress=progress,
            current_epoch=epoch + 1,
            train_loss=train_loss,
            val_loss=val_loss,
            loss_history=self.loss_history
        )
        logger.info(f"Model {self.model_id} Epoch {epoch+1}/{self.total_epochs} - Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}")

        # Update DB periodically
        try:
            db = SessionLocal()
            record = db.query(ModelRecord).filter(ModelRecord.id == self.model_id).first()
            if record:
                record.progress = progress
                record.current_epoch = epoch + 1
                record.metrics_json = json.dumps({"loss_history": self.loss_history, "current_val_loss": val_loss})
                db.commit()
            db.close()
        except Exception as e:
            logger.warning(f"Failed to update model epoch in DB: {e}")

class TFTService:
    @staticmethod
    def train_tft_model_sync(
        model_id: str,
        dataset_path: Path,
        target_col: str = "sales",
        group_ids: Optional[List[str]] = None,
        horizon: int = 14,
        lookback: int = 30,
        epochs: int = 10,
        batch_size: int = 64,
        learning_rate: float = 0.001
    ) -> Dict[str, Any]:
        """
        Executes real TFT training with PyTorch Forecasting and PyTorch Lightning.
        """
        if group_ids is None:
            group_ids = ["product_id", "store_id"]

        logger.info(f"Starting TFT training for model {model_id} on {dataset_path}...")
        df = pd.read_csv(dataset_path)

        # Validate columns
        required = [target_col, "time_idx"] + group_ids
        for c in required:
            if c not in df.columns:
                raise ValueError(f"Required column '{c}' not found in preprocessed dataset.")

        # Ensure correct types
        for g in group_ids:
            df[g] = df[g].astype(str)
        df[target_col] = df[target_col].astype(float)
        df["time_idx"] = df["time_idx"].astype(int)

        # Discover known reals
        potential_known_reals = ["time_idx", "day_of_week", "month", "day_of_month", "is_weekend", "price", "discount", "promotion", "holiday"]
        time_varying_known_reals = [c for c in potential_known_reals if c in df.columns]

        # Discover static categoricals
        static_categoricals = [g for g in group_ids]
        if "category" in df.columns and "category" not in static_categoricals:
            df["category"] = df["category"].astype(str)
            static_categoricals.append("category")

        # Define lookback and horizon limits
        max_time_idx = df["time_idx"].max()
        training_cutoff = max_time_idx - horizon

        if training_cutoff <= lookback:
            raise ValueError(f"Insufficient history. Total time steps ({max_time_idx+1}) must exceed lookback ({lookback}) + horizon ({horizon}).")

        # 1. Construct Training TimeSeriesDataSet
        training_data = TimeSeriesDataSet(
            df[lambda x: x.time_idx <= training_cutoff],
            time_idx="time_idx",
            target=target_col,
            group_ids=group_ids,
            min_encoder_length=max(7, lookback // 2),
            max_encoder_length=lookback,
            min_prediction_length=1,
            max_prediction_length=horizon,
            static_categoricals=static_categoricals,
            time_varying_known_reals=time_varying_known_reals,
            time_varying_unknown_reals=[target_col],
            target_normalizer=None,
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
            allow_missing_timesteps=True
        )

        # 2. Validation dataset
        validation_data = TimeSeriesDataSet.from_dataset(
            training_data,
            df,
            predict=True,
            stop_randomization=True
        )

        # 3. Dataloaders
        train_dataloader = training_data.to_dataloader(batch_size=batch_size, shuffle=True)
        val_dataloader = validation_data.to_dataloader(batch_size=batch_size, shuffle=False)

        # 4. Instantiate Temporal Fusion Transformer
        tft = TemporalFusionTransformer.from_dataset(
            training_data,
            learning_rate=learning_rate,
            hidden_size=16,
            attention_head_size=2,
            dropout=0.1,
            hidden_continuous_size=8,
            loss=QuantileLoss([0.1, 0.5, 0.9]),
            reduce_on_plateau_patience=3
        )

        # 5. Checkpoint & Callbacks
        checkpoint_dir = MODELS_DIR / model_id
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
        checkpoint_callback = ModelCheckpoint(
            dirpath=str(checkpoint_dir),
            filename="best_tft",
            monitor="val_loss",
            mode="min",
            save_top_k=1,
            save_weights_only=False
        )
        early_stop_callback = EarlyStopping(
            monitor="val_loss",
            min_delta=1e-4,
            patience=4,
            mode="min"
        )
        progress_callback = TFTProgressCallback(model_id=model_id, total_epochs=epochs)

        trainer = pl.Trainer(
            max_epochs=epochs,
            accelerator="cpu",
            callbacks=[checkpoint_callback, early_stop_callback, progress_callback],
            enable_model_summary=False,
            logger=False,
            gradient_clip_val=0.1
        )

        trainer.fit(tft, train_dataloaders=train_dataloader, val_dataloaders=val_dataloader)

        # Get best checkpoint path
        best_path = checkpoint_callback.best_model_path
        if not best_path or not os.path.exists(best_path):
            best_path = str(checkpoint_dir / "tft_model_final.pt")
            torch.save(tft.state_dict(), best_path)

        # Save dataset parameters for inference
        dataset_params_path = checkpoint_dir / "dataset_params.json"
        dataset_meta = {
            "group_ids": group_ids,
            "static_categoricals": static_categoricals,
            "time_varying_known_reals": time_varying_known_reals,
            "time_varying_unknown_reals": [target_col],
            "max_encoder_length": lookback,
            "max_prediction_length": horizon,
            "training_cutoff": int(training_cutoff),
            "max_time_idx": int(max_time_idx),
            "best_model_path": str(best_path)
        }
        with open(dataset_params_path, "w") as f:
            json.dump(dataset_meta, f, indent=2)

        # Compute Out-of-sample Evaluation Metrics on test/val set
        from app.services.evaluation_service import EvaluationService
        eval_results = EvaluationService.evaluate_model(
            model=tft,
            val_dataloader=val_dataloader,
            df=df,
            target_col=target_col,
            group_ids=group_ids,
            horizon=horizon,
            training_cutoff=training_cutoff
        )

        return {
            "checkpoint_path": str(best_path),
            "dataset_params_path": str(dataset_params_path),
            "loss_history": progress_callback.loss_history,
            "evaluation": eval_results
        }
