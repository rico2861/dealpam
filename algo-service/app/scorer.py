"""
Product relevance scorer.
score = views*W_VIEW + likes*W_LIKE + clicks*W_CLICK + purchases*W_PURCHASE + freshness*W_FRESH
freshness = max(0, 1 - days_since_created/30) * 10
"""
import json
from datetime import datetime, timezone
from app.config import W_VIEW, W_LIKE, W_CLICK, W_PURCHASE, W_FRESH
from app.db import get_pool
from app.logger import setup_logger, PerfTimer

log = setup_logger("scorer")

# In-memory cache: product_id -> score
_scores: dict[str, float] = {}

def get_score(product_id: str) -> float:
    return _scores.get(product_id, 0.0)

def get_all_scores() -> dict[str, float]:
    return dict(_scores)

def _freshness(created_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    days = (now - created_at).total_seconds() / 86400
    return max(0.0, 1.0 - days / 30.0) * 10.0

async def refresh_scores():
    """Recalculate relevance scores for all active products."""
    pool = await get_pool()
    with PerfTimer(log, "score_refresh"):
        async with pool.acquire() as conn:
            # Aggregate events per product
            rows = await conn.fetch("""
                SELECT
                    p.id              AS product_id,
                    p.created_at      AS created_at,
                    COALESCE(SUM(CASE WHEN e.event_type = 'VIEW'     THEN 1 ELSE 0 END), 0) AS views,
                    COALESCE(SUM(CASE WHEN e.event_type = 'LIKE'     THEN 1 ELSE 0 END), 0) AS likes,
                    COALESCE(SUM(CASE WHEN e.event_type = 'CLICK'    THEN 1 ELSE 0 END), 0) AS clicks,
                    COALESCE(SUM(CASE WHEN e.event_type = 'PURCHASE' THEN 1 ELSE 0 END), 0) AS purchases
                FROM products p
                LEFT JOIN user_events e ON e.product_id = p.id
                    AND e.created_at >= NOW() - INTERVAL '30 days'
                WHERE p.status = 'PUBLISHED'
                GROUP BY p.id, p.created_at
            """)
            new_scores: dict[str, float] = {}
            for r in rows:
                fresh = _freshness(r["created_at"])
                score = (
                    r["views"]     * W_VIEW     +
                    r["likes"]     * W_LIKE     +
                    r["clicks"]    * W_CLICK    +
                    r["purchases"] * W_PURCHASE +
                    fresh          * W_FRESH
                )
                new_scores[r["product_id"]] = round(score, 4)
            _scores.clear()
            _scores.update(new_scores)
            log.info("Scores refreshed", extra={"product_count": len(_scores)})
