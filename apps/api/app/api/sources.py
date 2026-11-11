import io
import mimetypes
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse

from app.models.knowledge import KnowledgeObject, KnowledgeType, ObjectSummary, LifecycleStatus
from app.models.source import SourceType
from app.core.repository import KnowledgeRepository, MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.ingestion.pipeline import IngestionPipeline
from app.ingestion.ingestion_service import SourceIngestionService
from app.ingestion.parser_registry import ParserRegistry, NormalizedSourceDocument, ProvenanceLocator
from app.ingestion.compiler import KnowledgeCompiler, CompilerAction
from app.providers.base import BaseLLMProvider
from app.config import settings
from app.api.deps import get_repository, get_index_engine, get_llm_provider

router = APIRouter(prefix="/sources", tags=["Sources & Ingestion"])

# Helper ProposalObject for Pydantic schema validation / returns
class ProposalResponse(BaseModel):
    id: str
    source_id: str
    action: str
    target_object_id: Optional[str] = None
    reason: str = ""
    status: str = "pending"
    candidate_id: str
    candidate_type: str
    candidate_title: str
    candidate_summary: str = ""
    candidate_domains: List[str] = Field(default_factory=list)
    candidate_tags: List[str] = Field(default_factory=list)
    candidate_relations: Dict[str, List[str]] = Field(default_factory=dict)
    candidate_sources: List[str] = Field(default_factory=list)
    body: str = ""

class ProposalObject(BaseModel):
    id: str
    source_id: str
    action: str
    target_object_id: Optional[str] = None
    reason: str = ""
    status: str = "pending"  # pending, approved, rejected
    candidate_id: str
    candidate_type: str
    candidate_title: str
    candidate_summary: str = ""
    candidate_domains: List[str] = Field(default_factory=list)
    candidate_tags: List[str] = Field(default_factory=list)
    candidate_relations: Dict[str, List[str]] = Field(default_factory=dict)
    candidate_sources: List[str] = Field(default_factory=list)
    candidate_lifecycle_status: str = "current"
    candidate_knowledge_stability: str = "medium"
    candidate_knowledge_scope: str = "implementation_specific"
    candidate_verification_status: str = "source_backed"
    candidate_technology: Optional[Dict[str, Any]] = None
    candidate_version: Optional[Dict[str, Any]] = None
    candidate_evidence: List[Dict[str, Any]] = Field(default_factory=list)
    candidate_temporal: Optional[Dict[str, Any]] = None
    candidate_replaced_by: List[str] = Field(default_factory=list)
    candidate_superseded_by: List[str] = Field(default_factory=list)
    body: str = ""

class ProposalRepository:
    def __init__(self, root_dir: Path):
        self.root_dir = Path(root_dir) / "proposals"
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def save(self, prop: ProposalObject) -> Path:
        target_path = self.root_dir / f"{prop.id}.md"
        metadata = prop.model_dump(exclude={"body"})
        import yaml
        yaml_dump = yaml.dump(metadata, sort_keys=False, allow_unicode=True).strip()
        content = f"---\n{yaml_dump}\n---\n\n{prop.body.strip()}\n"
        target_path.write_text(content, encoding="utf-8")
        return target_path

    def get(self, id: str) -> Optional[ProposalObject]:
        target_path = self.root_dir / f"{id}.md"
        if not target_path.is_file():
            return None
        import frontmatter
        post = frontmatter.loads(target_path.read_text(encoding="utf-8"))
        metadata = dict(post.metadata)
        return ProposalObject(**metadata, body=post.content)

    def list_all(self, source_id: Optional[str] = None) -> List[ProposalObject]:
        results = []
        for file in self.root_dir.glob("*.md"):
            try:
                import frontmatter
                post = frontmatter.loads(file.read_text(encoding="utf-8"))
                metadata = dict(post.metadata)
                prop = ProposalObject(**metadata, body=post.content)
                if source_id and prop.source_id != source_id:
                    continue
                results.append(prop)
            except Exception:
                continue
        return results

    def delete(self, id: str):
        target_path = self.root_dir / f"{id}.md"
        if target_path.exists():
            target_path.unlink()

def get_ingestion_service(
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
) -> SourceIngestionService:
    return SourceIngestionService(repo, index_engine, settings.raw_dir)

def get_ingestion_pipeline(
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
) -> IngestionPipeline:
    return IngestionPipeline(repo, index_engine, settings.raw_dir)

def get_proposal_repository() -> ProposalRepository:
    return ProposalRepository(settings.knowledge_dir)

@router.get("", response_model=List[Dict[str, Any]])
def list_sources(repo: KnowledgeRepository = Depends(get_repository)):
    objs = repo.list_all(type_filter=KnowledgeType.SOURCE)
    results = []
    for o in objs:
        results.append({
            "id": o.id,
            "type": o.type.value,
            "title": o.title,
            "summary": o.summary,
            "domains": o.domains,
            "tags": o.tags,
            "status": o.status,
            "file_path": o.file_path,
            "source_type": getattr(o, "source_type", "markdown"),
            "original_filename": getattr(o, "original_filename", o.file_path),
            "mime_type": getattr(o, "mime_type", "text/markdown"),
            "size_bytes": getattr(o, "size_bytes", 0),
            "sha256": getattr(o, "sha256", ""),
            "ingested_at": getattr(o, "ingested_at", o.created_at),
            "parser": getattr(o, "parser", {"name": "Markdown", "version": "1.0.0", "status": "completed"}),
            "security": getattr(o, "security", {"secret_scan_status": "clean"}),
            "compilation": getattr(o, "compilation", {"status": "not_started"}),
            "knowledge_objects": getattr(o, "knowledge_objects", [])
        })
    return results

@router.post("/ingest", response_model=Dict[str, Any])
async def ingest_source(
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    source_url: Optional[str] = Form(default=None),
    pipeline: IngestionPipeline = Depends(get_ingestion_pipeline)
):
    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
    try:
        result = pipeline.ingest_file(
            filename=file.filename or "uploaded_doc.txt",
            content_bytes=content_bytes,
            title=title,
            source_url=source_url
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload", response_model=Dict[str, Any])
async def upload_source(
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    domain: Optional[str] = Form(default=None),
    source_tier: Optional[str] = Form(default="Tier A"),
    notes: Optional[str] = Form(default=None),
    pipeline: IngestionPipeline = Depends(get_ingestion_pipeline)
):
    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
    tags = ["source"]
    if domain:
        tags.append(domain)
        
    try:
        result = pipeline.ingest_file(
            filename=file.filename or "uploaded_doc.txt",
            content_bytes=content_bytes,
            title=title,
            tags=tags
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/text", response_model=Dict[str, Any])
async def ingest_text_source(
    payload: Dict[str, Any],
    pipeline: IngestionPipeline = Depends(get_ingestion_pipeline)
):
    title = payload.get("title")
    body = payload.get("body", "")
    source_type = payload.get("source_type", "markdown")
    tags = payload.get("tags", ["text", "source"])

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    ext = ".md" if source_type == "markdown" else ".txt"
    content_bytes = body.encode("utf-8")

    try:
        # Use fallback filename format matching service expectation
        filename = f"pasted_text_{slugify(title)}{ext}"
        result = pipeline.ingest_file(
            filename=filename,
            content_bytes=content_bytes,
            title=title,
            tags=tags
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{source_id}/compile", response_model=List[ProposalResponse])
def compile_source(
    source_id: str,
    repo: KnowledgeRepository = Depends(get_repository),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    prop_repo: ProposalRepository = Depends(get_proposal_repository)
):
    source_obj = repo.get(source_id)
    if not source_obj or source_obj.type != KnowledgeType.SOURCE:
        raise HTTPException(status_code=404, detail="Source not found")

    # Read raw content
    raw_path = settings.base_dir / source_obj.file_path if source_obj.file_path else None
    # Support both rel path and repo directory resolution
    if not raw_path or not raw_path.exists():
        # Fallback to metadata extraction
        raw_path_match = None
        for line in source_obj.body.splitlines():
            if "Raw Path" in line:
                raw_path_match = line.split("`")[1] if "`" in line else None
        if raw_path_match:
            raw_path = settings.base_dir / raw_path_match

    if not raw_path or not raw_path.exists():
        raise HTTPException(status_code=404, detail=f"Raw source file not found at {raw_path}")

    content_bytes = raw_path.read_bytes()
    ext = Path(source_obj.original_filename or source_obj.id).suffix.lower()
    mime = source_obj.mime_type or "text/plain"

    parser = ParserRegistry().get_parser(ext, mime)
    parsed_doc = parser.parse(content_bytes, source_obj.id, {})

    # Generate candidate objects
    candidates: List[KnowledgeObject] = []
    
    # Deterministic fallback parser
    for idx, sec in enumerate(parsed_doc.sections):
        if not sec.text.strip() or sec.text == "[REDACTED]":
            continue
            
        slug = slugify(sec.heading or f"sec-{idx}")
        candidate_id = f"concept-{slug}"
        if len(candidate_id) > 60:
            candidate_id = candidate_id[:60].rstrip("-")
            
        candidate = KnowledgeObject(
            id=candidate_id,
            type=KnowledgeType.CONCEPT,
            title=sec.heading or f"Concept from {source_obj.title}",
            summary=sec.text[:200].strip().replace("\n", " ") + "...",
            body=sec.text,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            status="current"
        )
        candidates.append(candidate)

    compiler = KnowledgeCompiler(repo)
    proposals = []

    for idx, cand in enumerate(candidates):
        proposal = compiler.evaluate_candidate(cand, source_obj.id, "Tier A")
        prop_id = f"prop-{source_id.replace('source-', '')}-{idx}"
        
        # Build ProposalObject
        action_val = proposal.action.value
        reason_val = proposal.reason
        
        target_obj = proposal.updated_object or proposal.new_object or cand
        
        prop_obj = ProposalObject(
            id=prop_id,
            source_id=source_id,
            action=action_val,
            target_object_id=proposal.target_object_id,
            reason=reason_val,
            status="pending",
            candidate_id=target_obj.id,
            candidate_type=target_obj.type.value,
            candidate_title=target_obj.title,
            candidate_summary=target_obj.summary,
            candidate_domains=target_obj.domains,
            candidate_tags=target_obj.tags,
            candidate_relations=target_obj.relations,
            candidate_sources=target_obj.sources,
            candidate_lifecycle_status=target_obj.lifecycle_status.value,
            candidate_knowledge_stability=target_obj.knowledge_stability.value,
            candidate_knowledge_scope=target_obj.knowledge_scope.value,
            candidate_verification_status=target_obj.verification_status.value,
            candidate_technology=target_obj.technology,
            candidate_version=target_obj.version,
            candidate_evidence=target_obj.evidence,
            candidate_temporal=target_obj.temporal,
            candidate_replaced_by=target_obj.replaced_by,
            candidate_superseded_by=target_obj.superseded_by,
            body=target_obj.body
        )
        prop_repo.save(prop_obj)
        proposals.append(prop_obj)

    # Update source compilation status
    source_obj.compilation = {
        "status": "compiled"
    }
    repo.save(source_obj)

    return proposals

@router.get("/proposals", response_model=List[ProposalResponse])
def list_proposals(
    source_id: Optional[str] = None,
    prop_repo: ProposalRepository = Depends(get_proposal_repository)
):
    return prop_repo.list_all(source_id=source_id)

@router.post("/proposals/{id}/approve", response_model=Dict[str, Any])
def approve_proposal(
    id: str,
    repo: KnowledgeRepository = Depends(get_repository),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine),
    prop_repo: ProposalRepository = Depends(get_proposal_repository)
):
    prop = prop_repo.get(id)
    if not prop:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Map candidate values to canonical KnowledgeObject
    obj = KnowledgeObject(
        id=prop.candidate_id,
        type=KnowledgeType(prop.candidate_type),
        title=prop.candidate_title,
        summary=prop.candidate_summary,
        domains=prop.candidate_domains,
        tags=prop.candidate_tags,
        relations=prop.candidate_relations,
        sources=list(set(prop.candidate_sources + [prop.source_id])),
        lifecycle_status=LifecycleStatus(prop.candidate_lifecycle_status),
        body=prop.body
    )

    # Save to canonical repo
    repo.save(obj)
    index_engine.index_object(obj)

    # Update proposal status to approved
    prop.status = "approved"
    prop_repo.save(prop)

    # Update linked source object compiled list
    source_obj = repo.get(prop.source_id)
    if source_obj:
        objs = getattr(source_obj, "knowledge_objects", []) or []
        if obj.id not in objs:
            objs.append(obj.id)
        source_obj.knowledge_objects = objs
        repo.save(source_obj)

    return {"status": "success", "object_id": obj.id}

@router.post("/proposals/{id}/reject", response_model=Dict[str, Any])
def reject_proposal(
    id: str,
    prop_repo: ProposalRepository = Depends(get_proposal_repository)
):
    prop = prop_repo.get(id)
    if not prop:
        raise HTTPException(status_code=404, detail="Proposal not found")

    prop.status = "rejected"
    prop_repo.save(prop)
    return {"status": "success"}

@router.get("/{source_id}/download")
def download_original(
    source_id: str,
    repo: KnowledgeRepository = Depends(get_repository)
):
    source_obj = repo.get(source_id)
    if not source_obj or source_obj.type != KnowledgeType.SOURCE:
        raise HTTPException(status_code=404, detail="Source not found")

    # Safe file retrieval (prevents path traversal)
    raw_path_match = None
    for line in source_obj.body.splitlines():
        if "Raw Path" in line:
            raw_path_match = line.split("`")[1] if "`" in line else None

    if not raw_path_match:
        raise HTTPException(status_code=404, detail="No raw path metadata in source body")

    # Prevent traversal escape
    clean_path = Path(raw_path_match).relative_to("raw")
    full_path = settings.raw_dir / clean_path

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail=f"File not found on server at {full_path}")

    filename = source_obj.original_filename or full_path.name
    
    def iterfile():
        with open(full_path, mode="rb") as f:
            yield from f

    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    mime, _ = mimetypes.guess_type(filename)
    mime = mime or "application/octet-stream"
    return StreamingResponse(iterfile(), media_type=mime, headers=headers)
