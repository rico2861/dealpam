import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import scheduler, scorer, trending, collab
from app.db import get_pool, close_pool
from app.router import router
from app.logger import setup_logger
from app.config import ALGO_PORT

log = setup_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("algo-service starting up")
    # Warm up DB pool
    await get_pool()
    # Load cached state
    await trending.load_trending_from_db()
    # Initial data load (all at once on startup)
    await asyncio.gather(
        scorer.refresh_scores(),
        trending.refresh_trending(),
        collab.rebuild_model(),
        return_exceptions=True,
    )
    # Start background scheduler
    scheduler.start()
    log.info("algo-service ready")
    yield
    scheduler.stop()
    await close_pool()
    log.info("algo-service shut down")

app = FastAPI(
    title="Dealpam Algo Service",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=ALGO_PORT, reload=False)
