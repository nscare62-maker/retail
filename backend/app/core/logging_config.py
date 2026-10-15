import logging
import sys

def setup_logging():
    log_format = "%(asctime)s | %(levelname)-7s | %(name)s:%(lineno)d - %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    # Quiet overly verbose external loggers
    logging.getLogger("lightning.pytorch").setLevel(logging.INFO)
    logging.getLogger("pytorch_forecasting").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

logger = logging.getLogger("retail_demand")
