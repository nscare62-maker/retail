import os
import time
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging_config import setup_logging, logger
from app.db.session import init_db
from app.api import health, datasets, preprocessing, models, forecasts, inventory

setup_logging()
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Retail Demand Intelligence database and services...")
    init_db()
    logger.info("System is ready.")
    yield
    logger.info("Shutting down Retail Demand Intelligence services.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Temporal Fusion Transformer-Based Demand Forecasting for Retail Analytics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Request Logging & Timing Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration:.3f}s)")
    return response

# Centralized Exception Handler (Protects internal stack traces from leaking)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error handling {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred while processing the retail analytics request.",
            "error_type": exc.__class__.__name__
        }
    )

# Include API Routers
app.include_router(health.router, prefix="/api", tags=["System Health"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(preprocessing.router, prefix="/api/datasets", tags=["Preprocessing"])
app.include_router(models.router, prefix="/api/models", tags=["TFT Models"])
app.include_router(forecasts.router, prefix="/api/forecasts", tags=["Demand Forecasting"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory Planning"])

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": "Forecast smarter. Stock better. Grow faster.",
        "docs": "/docs",
        "api_status": "active"
    }
