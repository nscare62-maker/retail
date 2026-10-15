# Retail Demand Intelligence
### Temporal Fusion Transformer-Based Demand Forecasting for Retail Analytics
*Forecast smarter. Stock better. Grow faster.*

![Retail Demand Intelligence](frontend/src/assets/retail-demand-intelligence-logo.png)

---

## 1. Project Overview
**Retail Demand Intelligence** is an end-to-end web platform designed for retail planners, data scientists, and merchandise operations teams. It combines state-of-the-art **Temporal Fusion Transformer (TFT)** deep learning architectures with a curated, wine-and-gold retail analytics dashboard.

### Key Capabilities
- **Dataset Ingestion & Validation:** Drag-and-drop CSV uploads with schema auditing, missing value detection, duplicate record resolution, and numerical statistical summaries.
- **Leakage-Free Time-Series Preprocessing:** Chronological sorting, continuous multi-series temporal indexing (`time_idx`), calendar feature generation (`day_of_week`, `month`, `is_weekend`), and strict chronological train/validation/test splits.
- **Genuine Temporal Fusion Transformer Modeling:** Built directly on `PyTorch Forecasting` and `PyTorch Lightning`, utilizing multi-head self-attention, Gated Residual Networks (GRNs), and probabilistic quantile loss ($P_{10}, P_{50}, P_{90}$).
- **Out-of-Sample Model Evaluation:** Rigorous out-of-sample benchmark evaluation comparing TFT predictions against a Seasonal Naive lag-7 retail baseline using MAE, RMSE, and WAPE.
- **Probabilistic Demand Forecasting:** Multi-horizon forecasting (7, 14, 30 days) with user-controlled scenario parameters (promotional frequency, markdown depth) and non-negative demand post-processing.
- **Actionable Inventory Optimization:** Dynamic safety stock sizing ($SS = Z \times \sqrt{L} \times \sigma$) and reorder point determination ($ROP = d_L + SS$), stockout risk calculation, and purchase replenishment quantities.
- **Executive Reporting & Export:** CSV data exports and printable executive briefing summaries.

---

## 2. Technology Stack
- **Frontend:** React 19, Vite, React Router DOM, Recharts, Axios, Lucide React icons.
- **Backend:** Python 3.11, FastAPI, Uvicorn, SQLAlchemy, Pydantic v2.
- **Deep Learning:** PyTorch, PyTorch Lightning, PyTorch Forecasting.
- **Database:** SQLite (local persistent relational database).
- **Testing:** Pytest (Backend API & E2E model pipeline), Vitest & React Testing Library (Frontend UI).

---

## 3. Windows Installation & Execution Guide

### Prerequisites
- Windows 10/11 or Windows Server
- Python 3.11 (or compatible Python 3.10-3.12 environment)
- Node.js (v18+) and npm

### A. Backend Setup & Startup
From the project root directory (`retail`):

```powershell
# 1. Create Python 3.11 virtual environment
python -m venv .venv

# 2. Activate virtual environment
# If PowerShell displays an ExecutionPolicy error, run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Start the FastAPI backend server
uvicorn app.main --reload --app-dir backend --port 8000
```

- **Backend Base URL:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive OpenAPI Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc UI:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### B. Frontend Setup & Startup
Open a second PowerShell terminal in the project root:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

- **Frontend Application URL:** [http://localhost:5173](http://localhost:5173)

---

## 4. Running Automated Tests

### Backend Automated Test Suite (Pytest)
From the project root:

```powershell
$env:PYTHONPATH="backend"
.venv\Scripts\pytest.exe backend/tests -v
```

Tests verified:
- `test_health_endpoints`: Health check and system readiness verification.
- `test_dataset_workflow`: Synthetic data generation, preview, statistical quality validation, and chronological preprocessing.
- `test_inventory_calculation`: Safety stock and reorder point calculations.
- `test_e2e_tft_training_and_forecasting`: End-to-end model training, checkpoint persistence, out-of-sample evaluation, quantile forecasting, and inventory generation.

### Frontend Automated Test Suite (Vitest)
From the `frontend` directory:

```powershell
npm test
```

Tests verified:
- App layout and brand navigation rendering.
- StatusBadge status color mapping.
- KPI card formatting and gold highlights.

---

## 5. Mandatory Wine-Coloured Brand Design System

The application strictly adheres to the wine-and-gold design palette:
- **Primary Wine:** `#722F37`
- **Dark Wine:** `#4A1720`
- **Deep Burgundy:** `#5B202A`
- **Secondary Wine:** `#8B3A46`
- **Rose Accent:** `#A64D60`
- **Light Wine:** `#F2E5E7`
- **Pale Wine Background:** `#FAF5F5`
- **Main Background:** `#F8F6F4`
- **Gold Accent:** `#C9A227`
- **White Cards:** `#FFFFFF`
- **Primary Text:** `#292524`
- **Secondary Text:** `#78716C`
- **Success:** `#16803D`, **Warning:** `#D97706`, **Error:** `#DC2626`

All tokens are defined centrally in `frontend/src/index.css`.

---

## 6. Deployment Preparation & Production Considerations
- **Frontend:** Static build generated via `npm run build` outputting to `frontend/dist/`. Ready for deployment to Cloudflare Pages, Vercel, AWS S3 / CloudFront, or Nginx.
- **Backend:** Containerizable via Uvicorn/Gunicorn on AWS ECS, GCP Cloud Run, or Kubernetes.
- **Database & Storage:** In local mode, SQLite and local disk storage (`backend/storage/`) are used. For multi-node cloud deployments, configure `DATABASE_URL` for PostgreSQL and mount persistent block storage or an object store (S3/GCS) so trained model checkpoints and preprocessed datasets persist across restarts.
- **Security:** In production, enable HTTPS/TLS, set restricted `CORS_ORIGINS`, and introduce role-based authentication before exposing customer transaction records publicly.
