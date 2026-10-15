import threading
import time
from typing import Dict, Any, Optional
from app.core.logging_config import logger

class JobManager:
    """Manages asynchronous background jobs with thread-safe progress tracking."""
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def register_job(self, job_id: str, job_type: str, initial_data: Optional[Dict[str, Any]] = None):
        with self._lock:
            self._jobs[job_id] = {
                "id": job_id,
                "type": job_type,
                "status": "pending",
                "progress": 0.0,
                "current_epoch": 0,
                "total_epochs": 0,
                "train_loss": None,
                "val_loss": None,
                "loss_history": [],
                "error": None,
                "started_at": time.time(),
                "completed_at": None,
                **(initial_data or {})
            }
            logger.info(f"Registered job {job_id} of type {job_type}")

    def update_job(self, job_id: str, **kwargs):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(kwargs)

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._jobs.get(job_id)

    def mark_completed(self, job_id: str, results: Optional[Dict[str, Any]] = None):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id]["status"] = "completed"
                self._jobs[job_id]["progress"] = 100.0
                self._jobs[job_id]["completed_at"] = time.time()
                if results:
                    self._jobs[job_id]["results"] = results
                logger.info(f"Job {job_id} marked as completed")

    def mark_failed(self, job_id: str, error_message: str):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id]["status"] = "failed"
                self._jobs[job_id]["error"] = error_message
                self._jobs[job_id]["completed_at"] = time.time()
                logger.error(f"Job {job_id} marked as failed: {error_message}")

job_manager = JobManager()
