import math
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from scipy.stats import norm
from app.core.logging_config import logger

class InventoryService:
    @staticmethod
    def calculate_recommendations(
        forecast_items: List[Dict[str, Any]],
        current_inventory_map: Optional[Dict[str, float]] = None,
        lead_time_days: int = 7,
        service_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Calculates actionable retail inventory recommendations based on demand forecasts.
        Formulas:
          - Expected Lead Time Demand (d_L) = mean_daily_demand * lead_time_days
          - Safety Stock (SS) = Z * sqrt(lead_time_days) * sigma_daily_demand
          - Reorder Point (ROP) = d_L + SS
          - Stock Coverage = current_stock / mean_daily_demand
          - Suggested Order Qty = max(0, ROP - current_stock + d_L) if current_stock <= ROP else 0
        """
        if not forecast_items:
            return {"items": [], "summary": {}}

        df = pd.DataFrame(forecast_items)
        if current_inventory_map is None:
            current_inventory_map = {}

        # Z-score for target service level (e.g. 95% -> ~1.645)
        z_score = float(norm.ppf(service_level))

        recommendations = []
        total_suggested_order = 0.0
        critical_stockout_count = 0
        reorder_count = 0
        excess_count = 0

        # Group by product_id and store_id
        group_cols = ["product_id"]
        if "store_id" in df.columns:
            group_cols.append("store_id")

        for (group_vals), group_df in df.groupby(group_cols):
            if isinstance(group_vals, tuple):
                p_id, s_id = group_vals[0], group_vals[1]
            else:
                p_id, s_id = group_vals, "ALL"

            category = str(group_df["category"].iloc[0]) if "category" in group_df else "Retail"

            daily_demands = group_df["predicted_demand"].values
            mean_daily = float(np.mean(daily_demands))
            sigma_daily = float(np.std(daily_demands)) if len(daily_demands) > 1 else max(1.0, mean_daily * 0.2)

            # Expected lead time demand
            expected_lead_time_demand = mean_daily * lead_time_days

            # Safety Stock
            safety_stock = z_score * math.sqrt(lead_time_days) * sigma_daily
            safety_stock = max(2.0, safety_stock)

            # Reorder Point
            reorder_point = expected_lead_time_demand + safety_stock

            # Current stock determination
            key = f"{p_id}_{s_id}"
            if key in current_inventory_map:
                current_stock = float(current_inventory_map[key])
            elif p_id in current_inventory_map:
                current_stock = float(current_inventory_map[p_id])
            else:
                # Default heuristic based on demand if not provided
                current_stock = round(float(np.random.RandomState(hash(p_id) % 2**32).uniform(0.6, 1.8) * reorder_point), 0)

            # Stock coverage (in days)
            stock_coverage_days = round(current_stock / max(0.1, mean_daily), 1)

            # Stockout risk calculation using Normal CDF
            lead_time_sigma = math.sqrt(lead_time_days) * max(0.5, sigma_daily)
            if current_stock <= 0:
                stockout_risk_pct = 99.9
            else:
                z_val = (current_stock - expected_lead_time_demand) / lead_time_sigma
                stockout_risk_pct = round(float((1.0 - norm.cdf(z_val)) * 100), 1)
                stockout_risk_pct = max(0.1, min(99.9, stockout_risk_pct))

            # Status determination
            if current_stock < expected_lead_time_demand:
                status_flag = "CRITICAL_STOCKOUT"
                critical_stockout_count += 1
            elif current_stock <= reorder_point:
                status_flag = "REORDER_NOW"
                reorder_count += 1
            elif current_stock > 2.5 * reorder_point and current_stock > 50:
                status_flag = "EXCESS_STOCK"
                excess_count += 1
            else:
                status_flag = "OK"

            # Suggested order quantity
            if current_stock <= reorder_point:
                # Order enough to cover lead time demand and restore safety stock
                suggested_order = max(0.0, math.ceil(reorder_point - current_stock + expected_lead_time_demand))
            else:
                suggested_order = 0.0

            total_suggested_order += suggested_order

            recommendations.append({
                "product_id": str(p_id),
                "store_id": str(s_id),
                "category": category,
                "current_stock": round(current_stock, 0),
                "expected_lead_time_demand": round(expected_lead_time_demand, 1),
                "safety_stock": round(safety_stock, 1),
                "reorder_point": round(reorder_point, 1),
                "stock_coverage_days": stock_coverage_days,
                "stockout_risk_pct": stockout_risk_pct,
                "suggested_order_qty": round(suggested_order, 0),
                "status_flag": status_flag
            })

        summary = {
            "total_products_analyzed": len(recommendations),
            "lead_time_days": lead_time_days,
            "service_level_target_pct": round(service_level * 100, 1),
            "critical_stockouts": critical_stockout_count,
            "reorder_needed_count": reorder_count,
            "excess_stock_count": excess_count,
            "healthy_stock_count": len(recommendations) - critical_stockout_count - reorder_count - excess_count,
            "total_suggested_order_units": round(total_suggested_order, 0)
        }

        return {
            "items": recommendations,
            "summary": summary
        }
