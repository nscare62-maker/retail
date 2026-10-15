import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    row_count = Column(Integer, default=0)
    col_count = Column(Integer, default=0)
    columns_json = Column(Text, nullable=True)
    summary_stats_json = Column(Text, nullable=True)
    quality_report_json = Column(Text, nullable=True)
    status = Column(String(50), default="uploaded")  # uploaded, preprocessing, preprocessed, error
    is_preprocessed = Column(Boolean, default=False)
    preprocessed_path = Column(String(512), nullable=True)
    preprocessed_metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    models = relationship("ModelRecord", back_populates="dataset", cascade="all, delete-orphan")

class ModelRecord(Base):
    __tablename__ = "models"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    target_col = Column(String(100), default="sales")
    group_ids_json = Column(Text, default="[\"product_id\", \"store_id\"]")
    horizon = Column(Integer, default=14)
    lookback = Column(Integer, default=30)
    epochs = Column(Integer, default=10)
    batch_size = Column(Integer, default=64)
    learning_rate = Column(Float, default=0.001)
    status = Column(String(50), default="pending")  # pending, training, completed, failed
    progress = Column(Float, default=0.0)
    current_epoch = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)
    baseline_metrics_json = Column(Text, nullable=True)
    checkpoint_path = Column(String(512), nullable=True)
    dataset_params_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="models")
    forecasts = relationship("ForecastRecord", back_populates="model", cascade="all, delete-orphan")

class ForecastRecord(Base):
    __tablename__ = "forecasts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String(36), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    dataset_id = Column(String(36), nullable=False)
    horizon = Column(Integer, default=14)
    start_date = Column(String(50), nullable=False)
    predictions_path = Column(String(512), nullable=False)
    summary_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("ModelRecord", back_populates="forecasts")
    inventories = relationship("InventoryRecord", back_populates="forecast", cascade="all, delete-orphan")

class InventoryRecord(Base):
    __tablename__ = "inventory_recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    forecast_id = Column(String(36), ForeignKey("forecasts.id", ondelete="CASCADE"), nullable=False)
    lead_time_days = Column(Integer, default=7)
    service_level = Column(Float, default=0.95)
    recommendations_data_json = Column(Text, nullable=False)
    summary_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    forecast = relationship("ForecastRecord", back_populates="inventories")
