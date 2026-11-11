from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.models.knowledge import KnowledgeObject, KnowledgeType, ObjectSummary
from app.core.repository import KnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.api.deps import get_repository, get_index_engine

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])

@router.get("", response_model=List[ObjectSummary])
def list_knowledge_objects(
    type: Optional[KnowledgeType] = None,
    domain: Optional[str] = None,
    tag: Optional[str] = None,
    repo: KnowledgeRepository = Depends(get_repository)
):
    objs = repo.list_all(type_filter=type, domain_filter=domain)
    summaries = []
    for o in objs:
        if tag and tag not in o.tags:
            continue
        summaries.append(
            ObjectSummary(
                id=o.id,
                type=o.type,
                title=o.title,
                summary=o.summary,
                domains=o.domains,
                tags=o.tags,
                status=o.status,
                file_path=o.file_path
            )
        )
    return summaries

@router.get("/{id}", response_model=Dict[str, Any])
def get_knowledge_object(
    id: str,
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    obj = repo.get(id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Knowledge object '{id}' not found")
    
    # Enrich with inbound relations (backlinks)
    conn = index_engine.get_connection()
    try:
        inbound_cursor = conn.execute(
            "SELECT source_id, relation_type FROM relations WHERE target_id = ?", (id,)
        )
        backlinks = [{"source_id": r["source_id"], "relation_type": r["relation_type"]} for r in inbound_cursor.fetchall()]
    finally:
        conn.close()

    result = obj.model_dump()
    result["backlinks"] = backlinks
    return result

@router.post("", response_model=Dict[str, Any])
def create_or_update_knowledge_object(
    obj: KnowledgeObject,
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    saved_path = repo.save(obj)
    index_engine.index_object(obj)
    index_engine.log_activity(
        activity_type="save_knowledge",
        target_id=obj.id,
        details=f"Saved object '{obj.title}' ({obj.id})"
    )
    return {
        "status": "success",
        "id": obj.id,
        "file_path": str(saved_path)
    }

@router.delete("/{id}", response_model=Dict[str, Any])
def delete_knowledge_object(
    id: str,
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    if not repo.exists(id):
        raise HTTPException(status_code=404, detail=f"Knowledge object '{id}' not found")
    
    deleted = repo.delete(id)
    if deleted:
        index_engine.remove_object(id)
        index_engine.log_activity(
            activity_type="delete_knowledge",
            target_id=id,
            details=f"Deleted object '{id}'"
        )
        return {"status": "success", "message": f"Deleted object '{id}'"}
    
    raise HTTPException(status_code=500, detail=f"Failed to delete '{id}'")
