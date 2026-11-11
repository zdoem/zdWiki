from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from app.models.knowledge import KnowledgeType
from app.models.context import ProjectContext
from app.search.engine import SearchEngine, SearchResponse
from app.index.sqlite_engine import SQLiteIndexEngine
from app.core.repository import KnowledgeRepository
from app.api.deps import get_search_engine, get_index_engine, get_repository

router = APIRouter(tags=["Search & Index"])

class SearchRequestBody(BaseModel):
    query: str = Field(..., description="Search query string")
    type: Optional[KnowledgeType] = None
    domain: Optional[str] = None
    tag: Optional[str] = None
    limit: int = 20
    project_context: Optional[ProjectContext] = None

@router.get("/search", response_model=SearchResponse)
def search_knowledge(
    q: str = Query(default="", description="Search query string"),
    type: Optional[KnowledgeType] = Query(default=None, description="Filter by Knowledge Type"),
    domain: Optional[str] = Query(default=None, description="Filter by domain"),
    tag: Optional[str] = Query(default=None, description="Filter by tag"),
    limit: int = Query(default=20, ge=1, le=100),
    search_engine: SearchEngine = Depends(get_search_engine)
):
    return search_engine.search(
        query=q,
        type_filter=type,
        domain_filter=domain,
        tag_filter=tag,
        limit=limit
    )

@router.post("/search", response_model=SearchResponse)
def search_knowledge_post(
    req: SearchRequestBody,
    search_engine: SearchEngine = Depends(get_search_engine)
):
    return search_engine.search(
        query=req.query,
        type_filter=req.type,
        domain_filter=req.domain,
        tag_filter=req.tag,
        project_context=req.project_context,
        limit=req.limit
    )

@router.post("/index/rebuild", response_model=Dict[str, Any])
def rebuild_index(
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    return index_engine.rebuild_index(repo)
