import os
import json
import uuid
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, List, Optional
from app.core.config import DATASETS_DIR
from app.core.logging_config import logger

REQUIRED_COLUMNS = ["date", "product_id", "sales"]
OPTIONAL_COLUMNS = ["store_id", "category", "price", "discount", "promotion", "holiday", "inventory"]

class DataService:
    @staticmethod
    def validate_and_analyze_csv(file_path: Path) -> Dict[str, Any]:
        """Validates CSV structure and returns an extensive data quality report."""
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            return {
                "validation_passed": False,
                "issues": [f"Failed to read CSV: {str(e)}"],
                "total_rows": 0,
                "total_cols": 0,
                "missing_values": {},
                "missing_percentages": {},
                "duplicate_count": 0,
                "invalid_date_count": 0,
                "column_types": {},
                "numerical_summary": {}
            }

        issues: List[str] = []
        cols = [c.strip().lower() for c in df.columns]
        df.columns = cols

        # Check required columns
        missing_req = [col for col in REQUIRED_COLUMNS if col not in cols]
        if missing_req:
            issues.append(f"Missing required column(s): {', '.join(missing_req)}")

        total_rows = len(df)
        total_cols = len(df.columns)

        # Missing values
        missing_counts = df.isnull().sum().to_dict()
        missing_pcts = {col: round(float(count / max(1, total_rows) * 100), 2) for col, count in missing_counts.items()}

        # Date validation
        invalid_dates = 0
        date_min, date_max, total_days = None, None, None
        if "date" in df.columns:
            parsed_dates = pd.to_datetime(df["date"], errors="coerce")
            invalid_dates = int(parsed_dates.isnull().sum())
            if invalid_dates > 0:
                issues.append(f"Found {invalid_dates} invalid or unparseable date records.")
            valid_dates = parsed_dates.dropna()
            if not valid_dates.empty:
                date_min = valid_dates.min().strftime("%Y-%m-%d")
                date_max = valid_dates.max().strftime("%Y-%m-%d")
                total_days = int((valid_dates.max() - valid_dates.min()).days) + 1

        # Duplicate records check
        key_cols = ["date", "product_id"]
        if "store_id" in df.columns:
            key_cols.append("store_id")
        
        duplicate_count = 0
        if all(k in df.columns for k in key_cols):
            duplicate_count = int(df.duplicated(subset=key_cols).sum())
            if duplicate_count > 0:
                issues.append(f"Found {duplicate_count} duplicate records for key combination ({', '.join(key_cols)}).")

        # Sales negative check
        if "sales" in df.columns:
            # Check non-numeric
            sales_numeric = pd.to_numeric(df["sales"], errors="coerce")
            non_numeric_sales = int(sales_numeric.isnull().sum() - df["sales"].isnull().sum())
            if non_numeric_sales > 0:
                issues.append(f"Found {non_numeric_sales} non-numeric sales entries.")
            neg_sales = int((sales_numeric < 0).sum())
            if neg_sales > 0:
                issues.append(f"Found {neg_sales} negative sales records (demand cannot be negative).")

        # Column types
        col_types = {col: str(df[col].dtype) for col in df.columns}

        # Numerical summaries
        num_cols = df.select_dtypes(include=[np.number]).columns
        num_summary = {}
        for col in num_cols:
            s = df[col].dropna()
            if not s.empty:
                num_summary[col] = {
                    "count": float(len(s)),
                    "mean": round(float(s.mean()), 2),
                    "std": round(float(s.std()), 2) if len(s) > 1 else 0.0,
                    "min": round(float(s.min()), 2),
                    "p25": round(float(s.quantile(0.25)), 2),
                    "median": round(float(s.median()), 2),
                    "p75": round(float(s.quantile(0.75)), 2),
                    "max": round(float(s.max()), 2)
                }

        validation_passed = len(missing_req) == 0

        return {
            "validation_passed": validation_passed,
            "issues": issues,
            "total_rows": total_rows,
            "total_cols": total_cols,
            "missing_values": missing_counts,
            "missing_percentages": missing_pcts,
            "duplicate_count": duplicate_count,
            "invalid_date_count": invalid_dates,
            "date_min": date_min,
            "date_max": date_max,
            "total_days": total_days,
            "column_types": col_types,
            "numerical_summary": num_summary
        }

    @staticmethod
    def get_preview(file_path: Path, limit: int = 20) -> Dict[str, Any]:
        """Returns the first `limit` rows formatted for UI preview."""
        df = pd.read_csv(file_path, nrows=limit)
        df.columns = [c.strip().lower() for c in df.columns]
        # Replace NaN with None for clean JSON serialization
        df_clean = df.where(pd.notnull(df), None)
        return {
            "columns": list(df.columns),
            "rows": df_clean.to_dict(orient="records"),
            "total_rows": len(df_clean)
        }

    @staticmethod
    def generate_synthetic_retail_dataset(
        num_days: int = 400,
        output_path: Optional[Path] = None
    ) -> Path:
        """
        Generates a high-quality repeatable synthetic retail dataset with:
        - 4 products across 2 categories
        - 2 stores
        - Weekly seasonality (weekend spikes)
        - Promotions with price discounts
        - Holiday effects
        - Inventory tracking
        """
        if output_path is None:
            output_path = DATASETS_DIR / f"synthetic_retail_dataset_{uuid.uuid4().hex[:8]}.csv"

        np.random.seed(42)
        start_date = datetime(2025, 1, 1)
        dates = [start_date + timedelta(days=i) for i in range(num_days)]

        products = [
            {"product_id": "PRD_WINE_01", "category": "Premium Wine", "base_sales": 35, "base_price": 45.0, "volatility": 6},
            {"product_id": "PRD_WINE_02", "category": "Premium Wine", "base_sales": 25, "base_price": 65.0, "volatility": 5},
            {"product_id": "PRD_GOURMET_01", "category": "Gourmet Foods", "base_sales": 50, "base_price": 18.0, "volatility": 10},
            {"product_id": "PRD_GOURMET_02", "category": "Gourmet Foods", "base_sales": 40, "base_price": 24.0, "volatility": 8},
        ]
        stores = ["STORE_01", "STORE_02"]

        records = []
        # Pre-seed inventory
        current_inv = {
            (p["product_id"], s): np.random.randint(250, 400)
            for p in products for s in stores
        }

        for d in dates:
            d_str = d.strftime("%Y-%m-%d")
            day_of_week = d.weekday()  # 5=Sat, 6=Sun
            day_of_year = d.timetuple().tm_yday

            # Holiday flag (Christmas period, New Year, Thanksgiving, Labor Day)
            is_holiday = int(
                (d.month == 12 and d.day in [24, 25, 31]) or
                (d.month == 1 and d.day == 1) or
                (d.month == 11 and d.day in [27, 28]) or
                (d.month == 7 and d.day == 4)
            )

            for store_idx, store_id in enumerate(stores):
                store_mult = 1.15 if store_id == "STORE_01" else 0.90

                for prod in products:
                    pid = prod["product_id"]
                    cat = prod["category"]
                    base_sales = prod["base_sales"] * store_mult
                    base_price = prod["base_price"]

                    # Weekly seasonal multiplier: Friday/Saturday/Sunday higher
                    weekend_mult = 1.45 if day_of_week in [4, 5, 6] else 0.90

                    # Annual seasonality curve (e.g. higher demand towards Q4)
                    annual_trend = 1.0 + 0.15 * np.sin(2 * np.pi * (day_of_year - 60) / 365)

                    # Promotions: every ~25 days with 15-25% discount
                    is_promo = int(np.random.rand() < 0.12 or is_holiday == 1)
                    discount = round(np.random.uniform(0.10, 0.25), 2) if is_promo else 0.0
                    price = round(base_price * (1.0 - discount), 2)
                    promo_lift = 1.60 if is_promo else 1.0

                    # Holiday multiplier
                    holiday_mult = 1.50 if is_holiday else 1.0

                    # Demand calculation with Poisson / Normal noise
                    expected_sales = base_sales * weekend_mult * annual_trend * promo_lift * holiday_mult
                    sales = int(max(0, np.round(np.random.normal(expected_sales, prod["volatility"]))))

                    # Inventory update with replenishment
                    inv = current_inv[(pid, store_id)]
                    inv = max(0, inv - sales)
                    # Simple replenishment trigger if inventory falls below 80
                    if inv < 80:
                        inv += int(np.random.randint(180, 250))
                    current_inv[(pid, store_id)] = inv

                    records.append({
                        "date": d_str,
                        "product_id": pid,
                        "store_id": store_id,
                        "category": cat,
                        "sales": sales,
                        "price": price,
                        "discount": discount,
                        "promotion": is_promo,
                        "holiday": is_holiday,
                        "inventory": inv
                    })

        df = pd.DataFrame(records)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)
        logger.info(f"Generated synthetic retail dataset at {output_path} with {len(df)} rows.")
        return output_path
