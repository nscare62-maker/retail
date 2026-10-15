# Retail Demand Intelligence — Synthetic Sample Dataset

## Notice
All data contained in `retail_sales_sample.csv` is **artificially generated and synthetic**. It is designed specifically for demonstrations, testing, and benchmarking the Temporal Fusion Transformer (TFT) forecasting model. **Do not use this synthetic data for actual commercial purchasing or inventory commitments.**

## Dataset Specifications
- **Time Horizon:** 400 consecutive daily records from `2025-01-01` onward.
- **Total Records:** 3,200 observations (4 distinct SKUs across 2 stores over 400 days).
- **Categories:** Premium Wine, Gourmet Foods.
- **Granularity:** Daily sales per `(product_id, store_id, date)`.

## Schema Definition
| Column | Type | Description |
| :--- | :--- | :--- |
| `date` | `YYYY-MM-DD` | Calendar transaction date |
| `product_id` | String | Unique SKU identifier (e.g. `PRD_WINE_01`) |
| `store_id` | String | Retail store branch identifier (`STORE_01`, `STORE_02`) |
| `category` | String | Merchandise department |
| `sales` | Float / Int | Unit quantity demanded (non-negative) |
| `price` | Float | Base product retail price |
| `discount` | Float | Promotional markdown rate (e.g. 0.15 for 15% off) |
| `promotion` | Int (0/1) | Promotional event indicator flag |
| `holiday` | Int (0/1) | Major holiday indicator flag |
| `inventory` | Float | End-of-day available warehouse stock |

## Model Compatibility
This dataset contains sufficient history (400 days) to comfortably support:
- Lookback window: up to 60 days
- Multi-step horizon: 7, 14, or 30 days
- Out-of-sample chronological splits: 70% Train, 15% Validation, 15% Test.
