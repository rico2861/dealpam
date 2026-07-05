from fastapi import APIRouter, HTTPException, Header, Body, Query
from pydantic import BaseModel
from typing import Optional
import math
from app.config import ALGO_SECRET
from app import scorer, trending, collab
from app.db import get_pool
from app.logger import setup_logger

log = setup_logger("router")
router = APIRouter()

def _check_secret(x_algo_secret: str | None):
    if x_algo_secret != ALGO_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

# Colonnes produit sans lat/lng (non présents dans le schéma Prisma)
PRODUCT_COLS = """
    p.id, p.name, p.slug, p.price, p.sale_price,
    p.city, p.department, p.avg_rating,
    s.name AS store_name, s.city AS store_city, s.department AS store_dept,
    s.delivery_zones AS delivery_zones,
    img.url_full AS image_url
"""

# ─── GET /trending ────────────────────────────────────────────────────────────
@router.get("/trending")
async def get_trending():
    return trending.get_trending()

# ─── GET /score/{product_id} ─────────────────────────────────────────────────
@router.get("/score/{product_id}")
async def get_score(product_id: str):
    return {"product_id": product_id, "score": scorer.get_score(product_id)}

# ─── GET /scores (batch) ────────────────────────────────────────────────────
@router.get("/scores")
async def get_all_scores():
    return scorer.get_all_scores()

# ─── GET /recommendations/{user_id} ─────────────────────────────────────────
@router.get("/recommendations/{user_id}")
async def get_recommendations(
    user_id: str,
    department: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    pool = await get_pool()

    # 1. Try collaborative filtering
    collab_ids = collab.recommend_for_user(user_id, limit=limit * 2)

    if collab_ids:
        async with pool.acquire() as conn:
            placeholders = ",".join(f"${i+1}" for i in range(len(collab_ids)))
            rows = await conn.fetch(f"""
                SELECT {PRODUCT_COLS}
                FROM products p
                LEFT JOIN stores s ON s.id = p.store_id
                LEFT JOIN product_images img ON img.product_id = p.id AND img.sort_order = 0
                WHERE p.id IN ({placeholders}) AND p.status = 'PUBLISHED'
            """, *collab_ids)
        products = [dict(r) for r in rows]
        source = "collab"
    else:
        # 2. Fall back to score-based
        all_scores = scorer.get_all_scores()
        sorted_ids = sorted(all_scores, key=all_scores.get, reverse=True)[:limit * 3]

        if not sorted_ids:
            return {"source": "empty", "products": []}

        async with pool.acquire() as conn:
            placeholders = ",".join(f"${i+1}" for i in range(len(sorted_ids)))
            rows = await conn.fetch(f"""
                SELECT {PRODUCT_COLS}
                FROM products p
                LEFT JOIN stores s ON s.id = p.store_id
                LEFT JOIN product_images img ON img.product_id = p.id AND img.sort_order = 0
                WHERE p.id IN ({placeholders}) AND p.status = 'PUBLISHED'
            """, *sorted_ids)
        products = [dict(r) for r in rows]
        source = "score"

    # 3. Geo filter: garder produits disponibles dans le département/ville
    if department:
        dept_lower = department.lower()
        city_lower = city.lower() if city else None
        def is_available(p):
            # Le produit est dans ce dept
            if (p.get("department") or "").lower() == dept_lower:
                return True
            if (p.get("store_dept") or "").lower() == dept_lower:
                return True
            # Le vendeur livre dans ce dept (delivery_zones JSON)
            try:
                import json
                zones = json.loads(p.get("delivery_zones") or "[]")
                if any(z.lower() == dept_lower for z in zones):
                    return True
            except Exception:
                pass
            return False
        products = [p for p in products if is_available(p)]

    return {
        "source": source,
        "user_id": user_id,
        "products": products[:limit],
    }

# ─── GET /recommendations/session/{session_id} ────────────────────────────────
@router.get("/recommendations/session/{session_id}")
async def get_recommendations_session(
    session_id: str,
    department: Optional[str] = Query(None),
    limit: int = Query(12, ge=1, le=50),
):
    """Recommandations pour visiteurs anonymes basées sur la session + géolocalisation."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        cat_rows = await conn.fetch("""
            SELECT category_slug, COUNT(*) AS cnt
            FROM user_events
            WHERE session_id = $1 AND category_slug IS NOT NULL
              AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY category_slug ORDER BY cnt DESC LIMIT 3
        """, session_id)
        cat_slugs = [r["category_slug"] for r in cat_rows]

        if cat_slugs:
            placeholders = ",".join(f"${i+1}" for i in range(len(cat_slugs)))
            dept_filter = f"AND (p.department ILIKE ${len(cat_slugs)+1} OR s.department ILIKE ${len(cat_slugs)+1})" if department else ""
            params = [*cat_slugs, department] if department else cat_slugs
            rows = await conn.fetch(f"""
                SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.city, p.department,
                       s.delivery_zones,
                       img.url_full AS image_url
                FROM products p
                JOIN categories c ON c.id = p.category_id
                LEFT JOIN stores s ON s.id = p.store_id
                LEFT JOIN product_images img ON img.product_id = p.id AND img.sort_order = 0
                WHERE c.slug IN ({placeholders}) AND p.status = 'PUBLISHED'
                {dept_filter}
                ORDER BY p.view_count DESC, p.avg_rating DESC
                LIMIT ${len(params)+1}
            """, *params, limit)
        else:
            dept_filter = "AND (p.department ILIKE $1 OR s.department ILIKE $1)" if department else ""
            if department:
                rows = await conn.fetch(f"""
                    SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.city, p.department,
                           s.delivery_zones, img.url_full AS image_url
                    FROM products p
                    LEFT JOIN stores s ON s.id = p.store_id
                    LEFT JOIN product_images img ON img.product_id = p.id AND img.sort_order = 0
                    WHERE p.status = 'PUBLISHED' {dept_filter}
                    ORDER BY p.view_count DESC LIMIT $2
                """, department, limit)
            else:
                rows = await conn.fetch("""
                    SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.city, p.department,
                           img.url_full AS image_url
                    FROM products p
                    LEFT JOIN product_images img ON img.product_id = p.id AND img.sort_order = 0
                    WHERE p.status = 'PUBLISHED'
                    ORDER BY p.view_count DESC LIMIT $1
                """, limit)

    return {"source": "session", "products": [dict(r) for r in rows]}

# ─── POST /event ──────────────────────────────────────────────────────────────
class EventIn(BaseModel):
    session_id:    str
    event_type:    str   # VIEW, CLICK, LIKE, ADD_CART, PURCHASE, SEARCH
    user_id:       Optional[str] = None
    product_id:    Optional[str] = None
    category_slug: Optional[str] = None
    search_query:  Optional[str] = None
    lat:           Optional[float] = None
    lng:           Optional[float] = None

@router.post("/event", status_code=202)
async def receive_event(ev: EventIn):
    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_events
                  (id, user_id, session_id, event_type, product_id, category_slug, search_query, lat, lng, created_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
            """, ev.user_id, ev.session_id, ev.event_type,
                ev.product_id, ev.category_slug, ev.search_query, ev.lat, ev.lng)
        log.info("Event ingested", extra={"type": ev.event_type, "product": ev.product_id})
    except Exception as e:
        log.error(f"Event ingest error: {e}")
    return {"ok": True}

# ─── GET /keywords/{seller_id} (Booster IA) ──────────────────────────────────
@router.get("/keywords/{seller_id}")
async def get_keywords(
    seller_id: str,
    category: str = Query(...),
    x_algo_secret: Optional[str] = Header(None),
):
    _check_secret(x_algo_secret)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT search_query, COUNT(*) AS cnt
            FROM user_events
            WHERE event_type = 'SEARCH'
              AND category_slug = $1
              AND search_query IS NOT NULL
              AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY search_query
            ORDER BY cnt DESC LIMIT 50
        """, category)

        prod_rows = await conn.fetch("""
            SELECT p.name, COUNT(*) AS cnt
            FROM user_events e
            JOIN products p ON p.id = e.product_id
            JOIN categories c ON c.id = p.category_id
            WHERE e.event_type IN ('VIEW','CLICK')
              AND c.slug = $1
              AND e.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY p.name
            ORDER BY cnt DESC LIMIT 20
        """, category)

    from collections import Counter
    import re
    word_counts: Counter = Counter()
    query_list = []
    for r in rows:
        q = r["search_query"].lower().strip()
        query_list.append({"term": q, "count": int(r["cnt"])})
        words = re.findall(r"[a-zàâéèêëîïôùûüç]{3,}", q)
        for w in words:
            word_counts[w] += int(r["cnt"])

    top_keywords = [{"word": w, "count": c} for w, c in word_counts.most_common(10)]
    kw_words = [kw["word"] for kw in top_keywords[:3]]
    suggested_title = " ".join(w.capitalize() for w in kw_words)[:80]

    tips = []
    if top_keywords:
        tips.append(f'Incluez « {top_keywords[0]["word"]} » dans votre titre — terme le plus cherché.')
    if len(top_keywords) > 1:
        tips.append(f'Combinez « {top_keywords[0]["word"]} » et « {top_keywords[1]["word"]} » pour plus de reach.')
    if prod_rows:
        tips.append(f'Inspirez-vous de « {prod_rows[0]["name"][:50]} » — produit le plus vu dans cette catégorie.')

    return {
        "category": category,
        "top_keywords": top_keywords,
        "top_queries": query_list[:10],
        "suggested_title": suggested_title,
        "suggested_description": f"{suggested_title} — état excellent, livraison rapide disponible.",
        "marketing_tips": tips,
    }

# ─── GET /health ─────────────────────────────────────────────────────────────
@router.get("/health")
async def health():
    scores = scorer.get_all_scores()
    t = trending.get_trending()
    return {
        "status": "ok",
        "scored_products": len(scores),
        "trending_searches": len(t.get("searches", [])),
        "trending_updated_at": t.get("updated_at"),
    }
