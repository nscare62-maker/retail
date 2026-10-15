import torch
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from app.core.logging_config import logger

class EvaluationService:
    @staticmethod
    def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Calculates genuine MAE, RMSE, and WAPE with safe zero-denominator handling."""
        y_true = np.asarray(y_true, dtype=float)
        y_pred = np.asarray(y_pred, dtype=float)

        mae = float(np.mean(np.abs(y_true - y_pred)))
        rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

        sum_actual = float(np.sum(np.abs(y_true)))
        sum_abs_err = float(np.sum(np.abs(y_true - y_pred)))
        wape = float(sum_abs_err / sum_actual) if sum_actual > 1e-6 else 0.0

        return {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "wape": round(wape * 100, 2)  # Return percentage
        }

    @staticmethod
    def evaluate_model(
        model,
        val_dataloader,
        df: pd.DataFrame,
        target_col: str,
        group_ids: List[str],
        horizon: int,
        training_cutoff: int
    ) -> Dict[str, Any]:
        """
        Evaluates TFT model against held-out ground truth and a Seasonal Naive baseline.
        """
        model.eval()
        with torch.no_grad():
            preds = model.predict(val_dataloader, return_index=True, return_decoder_lengths=True)
            output = preds.output.cpu().numpy()  # shape: (n_series, horizon) or (n_series, horizon, n_quantiles)
            index_df = preds.index

        # If quantiles returned, select median (0.5 quantile or middle index)
        if len(output.shape) == 3:
            median_idx = output.shape[2] // 2
            y_pred_matrix = output[:, :, median_idx]
        else:
            y_pred_matrix = output

        # Extract actuals for the forecast horizon
        eval_records = []
        baseline_records = []

        test_data = df[df["time_idx"] > training_cutoff].copy()

        for row_idx, row in index_df.iterrows():
            full_filter = pd.Series(True, index=df.index)
            for g in group_ids:
                full_filter = full_filter & (df[g].astype(str) == str(row[g]))
            full_series = df[full_filter].sort_values("time_idx")
            series_test = full_series[full_series["time_idx"] > training_cutoff].head(horizon)

            actuals = series_test[target_col].values
            n_points = min(len(actuals), y_pred_matrix.shape[1])

            if n_points == 0:
                continue

            preds_series = y_pred_matrix[row_idx, :n_points]
            actuals_series = actuals[:n_points]

            # Seasonal Naive Baseline (lag 7 days from historical data)
            test_times = series_test["time_idx"].values[:n_points]

            naive_preds = []
            for t in test_times:
                lag_record = full_series[full_series["time_idx"] == (t - 7)]
                if not lag_record.empty:
                    naive_preds.append(float(lag_record[target_col].iloc[0]))
                else:
                    # Fallback to lag 1 if lag 7 not available
                    lag1 = full_series[full_series["time_idx"] == (t - 1)]
                    naive_preds.append(float(lag1[target_col].iloc[0]) if not lag1.empty else float(actuals_series.mean()))

            naive_preds = np.array(naive_preds)

            for i in range(n_points):
                p_id = str(row["product_id"]) if "product_id" in row else "UNKNOWN"
                s_id = str(row["store_id"]) if "store_id" in row else "UNKNOWN"
                dt_val = series_test["date_str"].iloc[i] if "date_str" in series_test else str(series_test["date"].iloc[i])[:10]
                act = float(actuals_series[i])
                prd = float(max(0.0, preds_series[i]))
                bsl = float(max(0.0, naive_preds[i]))

                eval_records.append({
                    "date": dt_val,
                    "product_id": p_id,
                    "store_id": s_id,
                    "actual": act,
                    "predicted": prd,
                    "baseline": bsl,
                    "residual": round(act - prd, 2)
                })

        if not eval_records:
            return {
                "overall": {"mae": 0.0, "rmse": 0.0, "wape": 0.0},
                "baseline": {"mae": 0.0, "rmse": 0.0, "wape": 0.0},
                "product_metrics": [],
                "residuals": [],
                "comparison": {"tft_beats_baseline": False, "wape_diff": 0.0}
            }

        eval_df = pd.DataFrame(eval_records)
        y_true = eval_df["actual"].values
        y_pred = eval_df["predicted"].values
        y_base = eval_df["baseline"].values

        overall_metrics = EvaluationService.calculate_metrics(y_true, y_pred)
        baseline_metrics = EvaluationService.calculate_metrics(y_true, y_base)

        # Product-level breakdown
        product_metrics = []
        for pid, grp in eval_df.groupby("product_id"):
            p_true = grp["actual"].values
            p_pred = grp["predicted"].values
            p_base = grp["baseline"].values
            m = EvaluationService.calculate_metrics(p_true, p_pred)
            b = EvaluationService.calculate_metrics(p_true, p_base)
            product_metrics.append({
                "product_id": pid,
                "records": len(grp),
                "mae": m["mae"],
                "rmse": m["rmse"],
                "wape": m["wape"],
                "baseline_mae": b["mae"],
                "baseline_wape": b["wape"]
            })

        # Residuals distribution (histogram buckets)
        residuals = eval_df["residual"].values
        hist, bin_edges = np.histogram(residuals, bins=10)
        residual_bins = [
            {"range": f"{round(bin_edges[i], 1)} to {round(bin_edges[i+1], 1)}", "count": int(hist[i])}
            for i in range(len(hist))
        ]

        tft_superior = overall_metrics["wape"] < baseline_metrics["wape"]
        wape_improvement = round(baseline_metrics["wape"] - overall_metrics["wape"], 2)

        return {
            "overall": overall_metrics,
            "baseline": baseline_metrics,
            "product_metrics": product_metrics,
            "residual_bins": residual_bins,
            "sample_predictions": eval_records[:50],  # for actual vs predicted charts
            "comparison": {
                "tft_beats_baseline": tft_superior,
                "wape_improvement_pct": wape_improvement,
                "eval_samples": len(eval_records)
            }
        }
