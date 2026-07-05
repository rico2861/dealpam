"""
Lightweight collaborative filtering using cosine similarity on user-product interaction matrix.
No ML library required — pure numpy/scipy.
"""
import json
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import norm as sparse_norm
from app.db import get_pool
from app.logger import setup_logger, PerfTimer

log = setup_logger("collab")

# State
_user_index: dict[str, int]    = {}   # user_id -> row
_item_index: dict[str, int]    = {}   # product_id -> col
_matrix: csr_matrix | None    = None  # users x products
_item_list: list[str]          = []   # col index -> product_id

EVENT_WEIGHTS = {"VIEW": 0.1, "LIKE": 1.0, "CLICK": 0.3, "ADD_CART": 0.8, "PURCHASE": 2.0}

async def rebuild_model():
    """Rebuild interaction matrix from user_events (last 30 days)."""
    pool = await get_pool()
    with PerfTimer(log, "collab_rebuild"):
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT user_id, product_id, event_type, COUNT(*) AS cnt
                FROM user_events
                WHERE user_id IS NOT NULL
                  AND product_id IS NOT NULL
                  AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY user_id, product_id, event_type
            """)

        if not rows:
            log.info("No interaction data — collab model empty")
            return

        # Build index
        users    = list({r["user_id"]    for r in rows})
        products = list({r["product_id"] for r in rows})
        uid2i = {u: i for i, u in enumerate(users)}
        pid2j = {p: j for j, p in enumerate(products)}

        row_idx, col_idx, data = [], [], []
        for r in rows:
            w = EVENT_WEIGHTS.get(r["event_type"], 0.0) * float(r["cnt"])
            if w > 0:
                row_idx.append(uid2i[r["user_id"]])
                col_idx.append(pid2j[r["product_id"]])
                data.append(w)

        mat = csr_matrix(
            (data, (row_idx, col_idx)),
            shape=(len(users), len(products)),
            dtype=np.float32,
        )
        # L2-normalize rows
        norms = np.array(mat.power(2).sum(axis=1)).flatten() ** 0.5
        norms[norms == 0] = 1.0
        from scipy.sparse import diags
        mat = diags(1.0 / norms) @ mat

        global _user_index, _item_index, _matrix, _item_list
        _user_index = uid2i
        _item_index = pid2j
        _matrix     = mat
        _item_list  = products
        log.info("Collab model rebuilt",
                 extra={"users": len(users), "products": len(products), "interactions": len(data)})

async def save_model_state():
    """Persist model metadata to DB for warm restart."""
    if _matrix is None:
        return
    pool = await get_pool()
    state = {
        "user_count": len(_user_index),
        "item_count": len(_item_index),
        "nnz": int(_matrix.nnz),
    }
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO ml_model_state (id, state_json, updated_at)
            VALUES (1, $1::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = NOW()
        """, json.dumps(state))
    log.info("Model state saved", extra=state)

def recommend_for_user(user_id: str, exclude_seen: bool = True, limit: int = 20, lat: float | None = None, lng: float | None = None) -> list[str]:
    """
    Return top product_ids for a user using cosine similarity to neighbours.
    Falls back to top scored products if user not in matrix.
    """
    if _matrix is None or user_id not in _user_index:
        return []  # caller should fall back to score-based

    idx = _user_index[user_id]
    user_vec = _matrix[idx]  # sparse row

    # Cosine similarities with all users (matrix already L2-normalized)
    sims = (_matrix @ user_vec.T).toarray().flatten()
    sims[idx] = 0.0  # exclude self

    # Top-K similar users
    k = min(30, len(sims))
    top_user_indices = np.argpartition(sims, -k)[-k:]
    top_user_indices = top_user_indices[np.argsort(sims[top_user_indices])[::-1]]

    # Aggregate their interaction scores on unseen products
    seen_cols = set(user_vec.indices.tolist())
    scores: dict[int, float] = {}
    for ui in top_user_indices:
        sim = float(sims[ui])
        if sim <= 0:
            continue
        neighbour_vec = _matrix[ui]
        for j, v in zip(neighbour_vec.indices, neighbour_vec.data):
            if exclude_seen and j in seen_cols:
                continue
            scores[j] = scores.get(j, 0.0) + sim * float(v)

    top_cols = sorted(scores, key=scores.__getitem__, reverse=True)[:limit]
    return [_item_list[j] for j in top_cols]
