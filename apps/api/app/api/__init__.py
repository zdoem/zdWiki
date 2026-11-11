from app.api.health import router as health_router
from app.api.stats import router as stats_router
from app.api.knowledge import router as knowledge_router
from app.api.search import router as search_router
from app.api.graph import router as graph_router
from app.api.loops import router as loops_router
from app.api.ask import router as ask_router
from app.api.sources import router as sources_router
from app.api.maintenance import router as maintenance_router

__all__ = [
    "health_router",
    "stats_router",
    "knowledge_router",
    "search_router",
    "graph_router",
    "loops_router",
    "ask_router",
    "sources_router",
    "maintenance_router"
]
