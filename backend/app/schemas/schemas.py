from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict, List
from datetime import datetime

class QualityReport(BaseModel):
    total_rows: int
    total_cols: int
    missing_values: Dict[str, int]
    missing_percentages: Dict[str, float]
    duplicate_count: int
    invalid_date_count: int
    date_min: Optional[str] = None
    date_max: Optional[str] = None
    total_days: Optional[int] = None
    column_types: Dict[str, str]
    numerical_summary: Dict[str, Dict[str, float]]
    issues: List[str]
    validation_passed: bool

class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    filename: str
    row_count: int
    col_count: int
    columns: List[str]
    status: str
    is_preprocessed: bool
    created_at: datetime

class DatasetDetailResponse(DatasetResponse):
    quality_report: Optional[Dict[str, Any]] = None
    summary_stats: Optional[Dict[str, Any]] = None
    preprocessed_metadata: Optional[Dict[str, Any]] = None

class DatasetPreviewResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int

# --- Preprocessing Schemas ---

class PreprocessingConfig(BaseModel):
    handle_missing: str = "zero"  # zero, forward_fill, interpolate
    outlier_treatment: str = "cap_iqr"  # none, cap_iqr
    generate_calendar_features: bool = True
    val_split_size: float = 0.15
    test_split_size: float = 0.15

class PreprocessingResponse(BaseModel):
    dataset_id: str
    status: str
    is_preprocessed: bool
    metadata: Dict[str, Any]
    before_after_summary: Dict[str, Any]

# --- Model Schemas ---

class ModelTrainRequest(BaseModel):
    name: str
    dataset_id: str
    target_col: str = "sales"
    group_ids: List[str] = ["product_id", "store_id"]
    horizon: int = Field(default=14, ge=1, le=60)
    lookback: int = Field(default=30, ge=7, le=180)
    epochs: int = Field(default=10, ge=1, le=100)
    batch_size: int = Field(default=64, ge=8, le=512)
    learning_rate: float = Field(default=0.001, gt=0, le=0.1)

class ModelResponse(BaseModel):
    id: str
    name: str
    dataset_id: str
    target_col: str
    group_ids: List[str]
    horizon: int
    lookback: int
    epochs: int
    batch_size: int
    learning_rate: float
    status: str
    progress: float
    current_epoch: int
    error_message: Optional[str] = None
    checkpoint_path: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ModelMetricsResponse(BaseModel):
    model_id: str
    name: str
    status: str
    mae: Optional[float] = None
    rmse: Optional[float] = None
    wape: Optional[float] = None
    baseline_mae: Optional[float] = None
    baseline_rmse: Optional[float] = None
    baseline_wape: Optional[float] = None
    loss_history: List[Dict[str, Any]] = []
    product_metrics: List[Dict[str, Any]] = []
    residuals: List[Dict[str, Any]] = []
    comparison: Dict[str, Any] = {}

# --- Forecast Schemas ---

class ForecastRequest(BaseModel):
    model_id: str
    horizon: int = Field(default=14, ge=1, le=60)
    product_ids: Optional[List[str]] = None
    store_ids: Optional[List[str]] = None
    promo_rate: Optional[float] = Field(default=0.1, ge=0.0, le=1.0)
    discount_rate: Optional[float] = Field(default=0.0, ge=0.0, le=0.9)

class ForecastItem(BaseModel):
    date: str
    product_id: str
    store_id: Optional[str] = None
    category: Optional[str] = None
    predicted_demand: float
    lower_bound: float
    upper_bound: float

class ForecastResponse(BaseModel):
    id: str
    model_id: str
    dataset_id: str
    horizon: int
    start_date: str
    items: List[ForecastItem]
    summary: Dict[str, Any]
    created_at: datetime

# --- Inventory Schemas ---

class InventoryRequest(BaseModel):
    forecast_id: str
    lead_time_days: int = Field(default=7, ge=1, le=90)
    service_level: float = Field(default=0.95, ge=0.5, le=0.999)
    custom_inventory: Optional[Dict[str, float]] = None

class InventoryItem(BaseModel):
    product_id: str
    store_id: Optional[str] = None
    category: Optional[str] = None
    current_stock: float
    expected_lead_time_demand: float
    safety_stock: float
    reorder_point: float
    stock_coverage_days: float
    stockout_risk_pct: float
    suggested_order_qty: float
    status_flag: str  # OK, REORDER_NOW, CRITICAL_STOCKOUT, EXCESS_STOCK

class InventoryResponse(BaseModel):
    id: str
    forecast_id: str
    lead_time_days: int
    service_level: float
    items: List[InventoryItem]
    summary: Dict[str, Any]
    created_at: datetime
