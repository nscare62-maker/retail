import os
import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Tuple
from app.core.config import DATASETS_DIR
from app.core.logging_config import logger

class PreprocessingService:
    @staticmethod
    def preprocess_dataset(
        raw_file_path: Path,
        dataset_id: str,
        handle_missing: str = "zero",  # "zero", "forward_fill", "interpolate"
        outlier_treatment: str = "cap_iqr",  # "none", "cap_iqr"
        generate_calendar_features: bool = True,
        val_split_size: float = 0.15,
        test_split_size: float = 0.15
    ) -> Tuple[Path, Dict[str, Any], Dict[str, Any]]:
        """
        Executes end-to-end preprocessing for TFT demand forecasting:
        1. Date parsing and chronological sorting
        2. Key group handling (product_id, store_id)
        3. Missing value resolution
        4. Outlier analysis and capping
        5. Calendar feature engineering (day_of_week, month, is_weekend)
        6. Aligned time_idx construction across all series
        7. Chronological train/validation/test boundary calculation
        """
        df = pd.read_csv(raw_file_path)
        df.columns = [c.strip().lower() for c in df.columns]

        initial_rows = len(df)
        initial_missing = int(df.isnull().sum().sum())

        # 1. Date parsing and sorting
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"])
        df = df.sort_values(by="date").reset_index(drop=True)

        # 2. Key columns validation
        if "product_id" not in df.columns:
            raise ValueError("Required column 'product_id' is missing.")
        if "sales" not in df.columns:
            raise ValueError("Required column 'sales' is missing.")

        # If store_id not present, create a default store
        if "store_id" not in df.columns:
            df["store_id"] = "STORE_ALL"

        # If category not present, create a default category
        if "category" not in df.columns:
            df["category"] = "General"

        # Convert identifiers to string
        df["product_id"] = df["product_id"].astype(str)
        df["store_id"] = df["store_id"].astype(str)
        df["category"] = df["category"].astype(str)

        # 3. Handle duplicates by aggregating sales sum and taking latest covariates
        key_cols = ["date", "product_id", "store_id"]
        duplicate_count = int(df.duplicated(subset=key_cols).sum())
        if duplicate_count > 0:
            logger.info(f"Aggregating {duplicate_count} duplicate key records...")
            agg_dict = {"sales": "sum"}
            for col in df.columns:
                if col not in key_cols and col != "sales":
                    agg_dict[col] = "last"
            df = df.groupby(key_cols, as_index=False).agg(agg_dict)

        # 4. Handle Missing Values
        # Missing sales handling
        if handle_missing == "zero":
            df["sales"] = df["sales"].fillna(0.0)
        elif handle_missing == "forward_fill":
            df["sales"] = df.groupby(["product_id", "store_id"])["sales"].ffill().bfill().fillna(0.0)
        elif handle_missing == "interpolate":
            df["sales"] = df.groupby(["product_id", "store_id"])["sales"].transform(lambda g: g.interpolate().bfill().ffill()).fillna(0.0)
        else:
            df["sales"] = df["sales"].fillna(0.0)

        # Ensure sales is non-negative float
        df["sales"] = df["sales"].apply(lambda x: max(0.0, float(x)))

        # Fill optional numerical columns
        if "price" in df.columns:
            df["price"] = df.groupby(["product_id"])["price"].transform(lambda g: g.ffill().bfill())
            df["price"] = df["price"].fillna(10.0)
        else:
            df["price"] = 10.0

        if "discount" in df.columns:
            df["discount"] = df["discount"].fillna(0.0)
        else:
            df["discount"] = 0.0

        if "promotion" in df.columns:
            df["promotion"] = df["promotion"].fillna(0).astype(int)
        else:
            df["promotion"] = 0

        if "holiday" in df.columns:
            df["holiday"] = df["holiday"].fillna(0).astype(int)
        else:
            df["holiday"] = 0

        if "inventory" in df.columns:
            df["inventory"] = df["inventory"].fillna(100.0)
        else:
            df["inventory"] = 100.0

        # 5. Outlier Treatment (IQR method on sales per product)
        outliers_detected = 0
        if outlier_treatment == "cap_iqr":
            def cap_series(group):
                nonlocal outliers_detected
                q25 = group.quantile(0.25)
                q75 = group.quantile(0.75)
                iqr = q75 - q25
                upper_bound = q75 + 3.0 * iqr  # 3x IQR allows strong promos but caps anomalies
                mask = group > upper_bound
                outliers_detected += int(mask.sum())
                return group.clip(upper=upper_bound)

            df["sales"] = df.groupby("product_id")["sales"].transform(cap_series)

        # 6. Aligned Continuous Time Index (time_idx)
        # TFT requires an integer time_idx that aligns identically across all series
        min_date = df["date"].min()
        df["time_idx"] = (df["date"] - min_date).dt.days.astype(int)

        # 7. Calendar Features
        if generate_calendar_features:
            df["day_of_week"] = df["date"].dt.dayofweek.astype(int)
            df["month"] = df["date"].dt.month.astype(int)
            df["day_of_month"] = df["date"].dt.day.astype(int)
            df["is_weekend"] = df["day_of_week"].apply(lambda x: 1 if x in [5, 6] else 0).astype(int)

        # 8. Chronological train / validation / test boundaries
        max_time_idx = df["time_idx"].max()
        total_time_steps = max_time_idx + 1

        test_steps = max(7, int(total_time_steps * test_split_size))
        val_steps = max(7, int(total_time_steps * val_split_size))
        train_steps = total_time_steps - test_steps - val_steps

        train_cutoff = train_steps - 1
        val_cutoff = train_steps + val_steps - 1

        df["split"] = "train"
        df.loc[df["time_idx"] > train_cutoff, "split"] = "validation"
        df.loc[df["time_idx"] > val_cutoff, "split"] = "test"

        # Save preprocessed file
        output_path = DATASETS_DIR / f"{dataset_id}_preprocessed.csv"
        df["date_str"] = df["date"].dt.strftime("%Y-%m-%d")
        df.to_csv(output_path, index=False)

        metadata = {
            "processed_at": pd.Timestamp.now().isoformat(),
            "handle_missing": handle_missing,
            "outlier_treatment": outlier_treatment,
            "outliers_capped": outliers_detected,
            "calendar_features": ["day_of_week", "month", "day_of_month", "is_weekend"] if generate_calendar_features else [],
            "total_time_steps": int(total_time_steps),
            "train_cutoff_time_idx": int(train_cutoff),
            "val_cutoff_time_idx": int(val_cutoff),
            "max_time_idx": int(max_time_idx),
            "min_date": min_date.strftime("%Y-%m-%d"),
            "max_date": df["date"].max().strftime("%Y-%m-%d"),
            "unique_products": int(df["product_id"].nunique()),
            "unique_stores": int(df["store_id"].nunique()),
            "unique_categories": int(df["category"].nunique()),
            "train_records": int((df["split"] == "train").sum()),
            "val_records": int((df["split"] == "validation").sum()),
            "test_records": int((df["split"] == "test").sum())
        }

        before_after = {
            "initial_rows": initial_rows,
            "final_rows": len(df),
            "initial_missing_values": initial_missing,
            "final_missing_values": int(df.isnull().sum().sum()),
            "duplicates_resolved": duplicate_count,
            "outliers_adjusted": outliers_detected,
            "added_features": ["time_idx", "day_of_week", "month", "day_of_month", "is_weekend"]
        }

        logger.info(f"Preprocessing completed for dataset {dataset_id}: {before_after}")
        return output_path, metadata, before_after
