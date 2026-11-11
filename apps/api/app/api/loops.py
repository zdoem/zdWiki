from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.loop import EngineeringLoop, LoopStage, StageRecord
from app.models.knowledge import KnowledgeObject, KnowledgeType
from app.core.repository import KnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.api.deps import get_repository, get_index_engine

router = APIRouter(prefix="/loops", tags=["Engineering Loops"])

@router.get("", response_model=List[Dict[str, Any]])
def list_loops(repo: KnowledgeRepository = Depends(get_repository)):
    objs = repo.list_all(type_filter=KnowledgeType.ENGINEERING_LOOP)
    results = []
    for o in objs:
        results.append({
            "id": o.id,
            "title": o.title,
            "summary": o.summary,
            "status": o.status,
            "file_path": o.file_path,
            "updated_at": o.updated_at
        })
    return results

@router.get("/{id}", response_model=Dict[str, Any])
def get_loop(id: str, repo: KnowledgeRepository = Depends(get_repository)):
    obj = repo.get(id)
    if not obj or obj.type != KnowledgeType.ENGINEERING_LOOP:
        raise HTTPException(status_code=404, detail=f"Engineering loop '{id}' not found")
    return obj.model_dump()

@router.post("", response_model=Dict[str, Any])
def create_loop(
    loop: EngineeringLoop,
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    now_str = datetime.utcnow().isoformat()
    loop_obj = KnowledgeObject(
        id=loop.id,
        type=KnowledgeType.ENGINEERING_LOOP,
        title=loop.title,
        summary=loop.goal,
        status=loop.status,
        created_at=now_str,
        updated_at=now_str,
        relations={"related_to": loop.related} if loop.related else {},
        body=f"## Goal\n{loop.goal}\n\n## Stages\nCurrent: {loop.current_stage.value}\n\n## Lessons Learned\n{loop.lessons or 'None yet.'}"
    )
    repo.save(loop_obj)
    index_engine.index_object(loop_obj)
    index_engine.log_activity("loop_started", target_id=loop.id, details=f"Started loop {loop.title}")
    return {"status": "success", "id": loop.id}

@router.patch("/{id}/stage", response_model=Dict[str, Any])
def update_loop_stage(
    id: str,
    stage: LoopStage = Body(..., embed=True),
    status: str = Body(default="in_progress", embed=True),
    notes: Optional[str] = Body(default="", embed=True),
    evidence: Optional[str] = Body(default="", embed=True),
    lessons: Optional[str] = Body(default="", embed=True),
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    obj = repo.get(id)
    if not obj or obj.type != KnowledgeType.ENGINEERING_LOOP:
        raise HTTPException(status_code=404, detail=f"Engineering loop '{id}' not found")

    now_str = datetime.utcnow().isoformat()
    obj.status = status
    obj.updated_at = now_str
    
    # Append stage record to body
    stage_header = f"\n\n### Stage: {stage.value.upper()} [{status}] ({now_str})\n"
    if notes:
        stage_header += f"- **Notes**: {notes}\n"
    if evidence:
        stage_header += f"- **Evidence**: {evidence}\n"
    if lessons:
        stage_header += f"- **Lessons**: {lessons}\n"
        
    obj.body += stage_header
    repo.save(obj)
    index_engine.index_object(obj)
    index_engine.log_activity("loop_updated", target_id=id, details=f"Loop stage updated to {stage.value}")
    
    return {"status": "success", "id": id, "stage": stage.value, "loop_status": status}
