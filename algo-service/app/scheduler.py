from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import TRENDING_REFRESH_SEC, SCORE_REFRESH_SEC, MODEL_SAVE_SEC
from app import scorer, trending, collab
from app.logger import setup_logger

log = setup_logger("scheduler")
_scheduler: AsyncIOScheduler | None = None

async def _safe(coro_fn, name: str):
    try:
        await coro_fn()
    except Exception as e:
        log.error(f"{name} failed: {e}", exc_info=True)

def start():
    global _scheduler
    _scheduler = AsyncIOScheduler()

    _scheduler.add_job(lambda: __import__("asyncio").ensure_future(_safe(scorer.refresh_scores,   "score")),
                       "interval", seconds=SCORE_REFRESH_SEC,    id="score_refresh",    max_instances=1)
    _scheduler.add_job(lambda: __import__("asyncio").ensure_future(_safe(trending.refresh_trending, "trending")),
                       "interval", seconds=TRENDING_REFRESH_SEC, id="trending_refresh", max_instances=1)
    _scheduler.add_job(lambda: __import__("asyncio").ensure_future(_safe(collab.rebuild_model,    "collab")),
                       "interval", seconds=MODEL_SAVE_SEC,       id="collab_rebuild",   max_instances=1)
    _scheduler.add_job(lambda: __import__("asyncio").ensure_future(_safe(collab.save_model_state, "model_save")),
                       "interval", seconds=MODEL_SAVE_SEC + 30,  id="model_save",       max_instances=1)

    _scheduler.start()
    log.info("Scheduler started",
             extra={"score_interval": SCORE_REFRESH_SEC,
                    "trending_interval": TRENDING_REFRESH_SEC,
                    "model_interval": MODEL_SAVE_SEC})

def stop():
    if _scheduler:
        _scheduler.shutdown(wait=False)
