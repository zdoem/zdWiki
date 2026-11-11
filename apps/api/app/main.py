from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.api import (
    health_router,
    stats_router,
    knowledge_router,
    search_router,
    graph_router,
    loops_router,
    ask_router,
    sources_router,
    maintenance_router
)
from app.api.deps import get_repository, get_index_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("zdwiki")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing zdWiki backend...")
    repo = get_repository()
    index_engine = get_index_engine()
    res = index_engine.rebuild_index(repo)
    logger.info(f"Startup complete: indexed {res.get('indexed_count', 0)} knowledge objects.")
    yield
    logger.info("zdWiki backend shutting down.")

app = FastAPI(
    title="zdWiki API",
    description="Engineering Knowledge Operating System",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(graph_router, prefix="/api")
app.include_router(loops_router, prefix="/api")
app.include_router(ask_router, prefix="/api")
app.include_router(sources_router, prefix="/api")
app.include_router(maintenance_router, prefix="/api")

@app.get("/")
def root():
    return {
        "app": "zdWiki v1",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def root_health():
    return {
        "status": "healthy",
        "service": "zdWiki API",
        "version": "1.0.0"
    }

