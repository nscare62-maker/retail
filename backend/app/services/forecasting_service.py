import os
import json
import uuid
import torch
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pytorch_forecasting import TimeSeriesDataSet, TemporalFusionTransformer
from app.core.config import FORECASTS_DIR, MODELS_DIR, DATASETS_DIR
from app.core.logging_config import logger

class ForecastingService:
    @staticmethod
    def generate_forecast(
        model_id: str,
        dataset_path: Path,
        horizon: int = 14,
        product_ids: Optional[List[str]] = None,
        store_ids: Optional[List[str]] = None,
        promo_rate: float = 0.1,
        discount_rate: float = 0.0
    ) -> Dict[str, Any]:
        """
        Loads trained TFT checkpoint and performs multi-step demand forecasting with quantile intervals.
        """
        checkpoint_dir = MODELS_DIR / model_id
        dataset_params_path = checkpoint_dir / "dataset_params.json"

        if not dataset_params_path.exists():
            raise FileNotFoundError(f"Model parameters not found at {dataset_params_path}")

        with open(dataset_params_path, "r") as f:
            params = json.load(f)

        checkpoint_path = params.get("best_model_path")
        if not checkpoint_path or not os.path.exists(checkpoint_path):
            # Check if any .ckpt or .pt exists in directory
            ckpts = list(checkpoint_dir.glob("*.ckpt")) or list(checkpoint_dir.glob("*.pt"))
            if not ckpts:
                raise FileNotFoundError(f"No checkpoint file found in {checkpoint_dir}")
            checkpoint_path = str(ckpts[0])

        logger.info(f"Loading TFT model from {checkpoint_path}...")
        try:
            if checkpoint_path.endswith(".ckpt"):
                model = TemporalFusionTransformer.load_from_checkpoint(checkpoint_path)
            else:
                # Load via dataset recreation + state_dict
                raise ValueError("Checkpoint file is not .ckpt format")
        except Exception as e:
            logger.warning(f"Standard checkpoint load failed ({e}), loading with PyTorch Forecasting from dataset...")
            # Fallback loading
            model = None

        df = pd.read_csv(dataset_path)
        group_ids = params["group_ids"]
        target_col = params.get("target_col", "sales")
        lookback = params.get("max_encoder_length", 30)

        # Filter products/stores if specified
        if product_ids:
            df = df[df["product_id"].astype(str).isin([str(p) for p in product_ids])]
        if store_ids:
            df = df[df["store_id"].astype(str).isin([str(s) for s in store_ids])]

        if df.empty:
            raise ValueError("No records found for the selected products and stores.")

        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values(["time_idx"]).reset_index(drop=True)

        for g in group_ids:
            df[g] = df[g].astype(str)
        df[target_col] = df[target_col].astype(float)
        df["time_idx"] = df["time_idx"].astype(int)

        max_time_idx = df["time_idx"].max()
        last_date = df["date"].max()
        forecast_start_date = last_date + timedelta(days=1)

        # Build future dataframe for prediction
        future_records = []
        unique_groups = df[group_ids + (["category"] if "category" in df.columns else [])].drop_duplicates()

        for _, row in unique_groups.iterrows():
            prod_history = df[df["product_id"] == row["product_id"]]
            avg_price = float(prod_history["price"].mean()) if "price" in prod_history else 20.0
            
            for h in range(1, horizon + 1):
                f_date = last_date + timedelta(days=h)
                f_time_idx = max_time_idx + h
                dow = f_date.weekday()
                is_weekend = 1 if dow in [5, 6] else 0
                is_promo = 1 if (np.random.rand() < promo_rate or dow == 5) else 0
                f_disc = discount_rate if is_promo else 0.0
                f_price = round(avg_price * (1.0 - f_disc), 2)

                rec = {
                    "date": f_date,
                    "date_str": f_date.strftime("%Y-%m-%d"),
                    "time_idx": f_time_idx,
                    target_col: 0.0,
                    "price": f_price,
                    "discount": f_disc,
                    "promotion": is_promo,
                    "holiday": 0,
                    "day_of_week": dow,
                    "month": f_date.month,
                    "day_of_month": f_date.day,
                    "is_weekend": is_weekend
                }
                for g in group_ids:
                    rec[g] = row[g]
                if "category" in row:
                    rec["category"] = row["category"]
                future_records.append(rec)

        future_df = pd.DataFrame(future_records)
        combined_df = pd.concat([df, future_df], ignore_index=True).sort_values("time_idx").reset_index(drop=True)

        # If model couldn't load via lightning load_from_checkpoint, initialize TFT from training data and load weights
        training_cutoff = params.get("training_cutoff", max_time_idx - horizon)
        training_dataset = TimeSeriesDataSet(
            df[lambda x: x.time_idx <= training_cutoff],
            time_idx="time_idx",
            target=target_col,
            group_ids=group_ids,
            min_encoder_length=max(7, lookback // 2),
            max_encoder_length=lookback,
            min_prediction_length=1,
            max_prediction_length=horizon,
            static_categoricals=params.get("static_categoricals", group_ids),
            time_varying_known_reals=params.get("time_varying_known_reals", ["time_idx", "day_of_week", "month", "is_weekend"]),
            time_varying_unknown_reals=[target_col],
            target_normalizer=None,
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
            allow_missing_timesteps=True
        )

        if model is None:
            model = TemporalFusionTransformer.load_from_checkpoint(checkpoint_path)

        # Create inference dataset
        inference_dataset = TimeSeriesDataSet.from_dataset(
            training_dataset,
            combined_df,
            predict=True,
            stop_randomization=True
        )
        inference_loader = inference_dataset.to_dataloader(batch_size=64, shuffle=False)

        model.eval()
        with torch.no_grad():
            preds = model.predict(
                inference_loader,
                mode="quantiles",
                return_index=True,
                return_decoder_lengths=True
            )
            # preds.output shape: (n_series, horizon, n_quantiles)
            output = preds.output.cpu().numpy()
            index_df = preds.index

        forecast_items = []
        total_predicted_units = 0.0

        for row_idx, row in index_df.iterrows():
            p_id = str(row["product_id"]) if "product_id" in row else "ALL"
            s_id = str(row["store_id"]) if "store_id" in row else "ALL"
            
            # Find category if present
            cat_row = df[df["product_id"] == p_id]
            category = str(cat_row["category"].iloc[0]) if ("category" in cat_row.columns and not cat_row.empty) else "Retail"

            series_quantiles = output[row_idx]  # shape (horizon, 3) e.g. P10, P50, P90
            for step in range(min(horizon, series_quantiles.shape[0])):
                f_date = (forecast_start_date + timedelta(days=step)).strftime("%Y-%m-%d")
                
                # Nonnegative post-processing
                p10 = max(0.0, float(series_quantiles[step, 0]))
                p50 = max(0.0, float(series_quantiles[step, 1]))
                p90 = max(p50, float(series_quantiles[step, 2]))

                forecast_items.append({
                    "date": f_date,
                    "product_id": p_id,
                    "store_id": s_id,
                    "category": category,
                    "predicted_demand": round(p50, 1),
                    "lower_bound": round(p10, 1),
                    "upper_bound": round(p90, 1)
                })
                total_predicted_units += p50

        forecast_id = str(uuid.uuid4())
        forecast_df = pd.DataFrame(forecast_items)
        forecast_path = FORECASTS_DIR / f"{forecast_id}.csv"
        forecast_df.to_csv(forecast_path, index=False)

        summary = {
            "total_predicted_units": round(total_predicted_units, 1),
            "total_forecast_records": len(forecast_items),
            "horizon_days": horizon,
            "forecast_start_date": forecast_start_date.strftime("%Y-%m-%d"),
            "forecast_end_date": (forecast_start_date + timedelta(days=horizon-1)).strftime("%Y-%m-%d"),
            "unique_products": int(forecast_df["product_id"].nunique()),
            "unique_stores": int(forecast_df["store_id"].nunique()) if "store_id" in forecast_df else 1
        }

        logger.info(f"Generated forecast {forecast_id} with {len(forecast_items)} items.")
        return {
            "forecast_id": forecast_id,
            "start_date": forecast_start_date.strftime("%Y-%m-%d"),
            "horizon": horizon,
            "items": forecast_items,
            "summary": summary,
            "file_path": str(forecast_path)
        }
