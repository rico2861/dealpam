import logging, sys, time
from pythonjsonlogger import jsonlogger
from app.config import LOG_LEVEL

def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        fmt = jsonlogger.JsonFormatter("%(asctime)s %(name)s %(levelname)s %(message)s")
        handler.setFormatter(fmt)
        logger.addHandler(handler)
    return logger

class PerfTimer:
    def __init__(self, logger: logging.Logger, label: str):
        self.log = logger; self.label = label; self.t = 0.0
    def __enter__(self):
        self.t = time.perf_counter(); return self
    def __exit__(self, *_):
        ms = (time.perf_counter() - self.t) * 1000
        self.log.info(f"{self.label} completed", extra={"duration_ms": round(ms, 2)})
