import os
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
ALGO_SECRET  = os.getenv("ALGO_SECRET", "changeme")
ALGO_PORT    = int(os.getenv("ALGO_PORT", "8001"))
LOG_LEVEL    = os.getenv("LOG_LEVEL", "INFO")

# Scoring weights
W_VIEW     = 0.1
W_LIKE     = 0.5
W_CLICK    = 0.3
W_PURCHASE = 2.0
W_FRESH    = 0.2   # per day of recency (decays over 30d)

TRENDING_REFRESH_SEC  = 300   # 5 min
SCORE_REFRESH_SEC     = 60    # 1 min
MODEL_SAVE_SEC        = 600   # 10 min
GEO_RADIUS_KM         = 50
