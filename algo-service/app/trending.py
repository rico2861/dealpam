"""
Trending: top 20 searches + top 10 categories from last 24h events.
Stored in trending_cache table and in-memory.
"""
import json
from app.db import get_pool
from app.logger import setup_logger, PerfTimer

log = setup_logger("trending")

_cache: dict = {"searches": [], "categories": [], "products": [], "updated_at": None}

def get_trending() -> dict:
    return _cache

async def refresh_trending():
    pool = await get_pool()
    with PerfTimer(log, "trending_refresh"):
        async with pool.acquire() as conn:
            # Top searches
            searches = await conn.fetch("""
                SELECT search_query AS term, COUNT(*) AS cnt
                FROM user_events
                WHERE event_type = 'SEARCH'
                  AND search_query IS NOT NULL
                  AND created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY search_query
                ORDER BY cnt DESC
                LIMIT 20
            """)
            # Top categories
            cats = await conn.fetch("""
                SELECT category_slug AS slug, COUNT(*) AS cnt
                FROM user_events
                WHERE category_slug IS NOT NULL
                  AND created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY category_slug
                ORDER BY cnt DESC
                LIMIT 10
            """)
            # Trending products (most views+likes in 24h)
            products = await conn.fetch("""
                SELECT e.product_id,
                       p.name, p.slug, p.price, p.sale_price,
                       COUNT(*) AS interactions
                FROM user_events e
                JOIN products p ON p.id = e.product_id
                WHERE e.product_id IS NOT NULL
                  AND e.created_at >= NOW() - INTERVAL '24 hours'
                  AND p.status = 'PUBLISHED'
                GROUP BY e.product_id, p.name, p.slug, p.price, p.sale_price
                ORDER BY interactions DESC
                LIMIT 20
            """)

            from datetime import datetime, timezone
            now_str = datetime.now(timezone.utc).isoformat()

            _cache["searches"] = [
                {"term": r["term"], "count": r["cnt"]} for r in searches
            ]
            _cache["categories"] = [
                {"slug": r["slug"], "count": r["cnt"]} for r in cats
            ]
            _cache["products"] = [
                {
                    "productId": r["product_id"],
                    "name": r["name"],
                    "slug": r["slug"],
                    "price": float(r["price"]),
                    "salePrice": float(r["sale_price"]) if r["sale_price"] else None,
                    "interactions": r["interactions"],
                }
                for r in products
            ]
            _cache["updated_at"] = now_str

            # Persist to DB (upsert)
            await conn.execute("""
                INSERT INTO trending_cache (id, data, updated_at)
                VALUES (1, $1::jsonb, NOW())
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            """, json.dumps(_cache))

            log.info("Trending refreshed",
                     extra={"searches": len(searches), "products": len(products)})

async def load_trending_from_db():
    """Load last saved trending on startup."""
    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT data FROM trending_cache WHERE id = 1")
            if row:
                _cache.update(json.loads(row["data"]))
                log.info("Trending loaded from DB")
    except Exception as e:
        log.warning(f"Could not load trending from DB: {e}")
