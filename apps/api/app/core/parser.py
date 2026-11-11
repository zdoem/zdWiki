import yaml
import frontmatter
from typing import Tuple, Dict, Any, Union
from app.models.knowledge import (
    KnowledgeObject,
    KnowledgeType,
    LifecycleStatus,
    KnowledgeStability,
    KnowledgeScope,
    VerificationStatus
)
from app.models.source import SourceObject
from app.models.loop import EngineeringLoop

class ParseError(Exception):
    pass

class ValidationError(Exception):
    pass

def parse_markdown(content: str, file_path: str = "") -> Tuple[Dict[str, Any], str]:
    """
    Parses a markdown string containing YAML frontmatter.
    Returns (metadata_dict, body_markdown).
    """
    try:
        post = frontmatter.loads(content)
        return dict(post.metadata), post.content
    except Exception as e:
        raise ParseError(f"Failed to parse frontmatter in {file_path}: {e}") from e

def parse_knowledge_object(content: str, file_path: str = "") -> KnowledgeObject:
    """
    Parses markdown content into a validated KnowledgeObject with backward compatibility.
    """
    metadata, body = parse_markdown(content, file_path)
    if "id" not in metadata or "type" not in metadata or "title" not in metadata:
        raise ValidationError(f"Missing required fields (id, type, title) in {file_path}")
    
    try:
        obj = KnowledgeObject(**metadata, body=body, file_path=file_path)
        return obj
    except Exception as e:
        raise ValidationError(f"Validation failed for {file_path}: {e}") from e

def serialize_knowledge_object(obj: KnowledgeObject) -> str:
    """
    Serializes a KnowledgeObject back to Markdown with YAML frontmatter.
    """
    metadata: Dict[str, Any] = {
        "id": obj.id,
        "type": obj.type.value if isinstance(obj.type, KnowledgeType) else obj.type,
        "title": obj.title,
    }
    
    # Core Metadata
    if obj.aliases:
        metadata["aliases"] = obj.aliases
    if obj.domains:
        metadata["domains"] = obj.domains
    if obj.tags:
        metadata["tags"] = obj.tags
    if obj.summary:
        metadata["summary"] = obj.summary
    if obj.relations:
        metadata["relations"] = obj.relations
    if obj.sources:
        metadata["sources"] = obj.sources
    if obj.created_at:
        metadata["created_at"] = obj.created_at
    if obj.updated_at:
        metadata["updated_at"] = obj.updated_at
        
    # Memory & Learning Foundation Metadata
    status_val = obj.lifecycle_status.value if isinstance(obj.lifecycle_status, LifecycleStatus) else str(obj.lifecycle_status)
    metadata["status"] = status_val
    metadata["lifecycle_status"] = status_val
    
    if obj.knowledge_scope and obj.knowledge_scope != KnowledgeScope.IMPLEMENTATION_SPECIFIC:
        metadata["knowledge_scope"] = obj.knowledge_scope.value if isinstance(obj.knowledge_scope, KnowledgeScope) else str(obj.knowledge_scope)
    if obj.knowledge_stability and obj.knowledge_stability != KnowledgeStability.MEDIUM:
        metadata["knowledge_stability"] = obj.knowledge_stability.value if isinstance(obj.knowledge_stability, KnowledgeStability) else str(obj.knowledge_stability)
    if obj.verification_status and obj.verification_status != VerificationStatus.SOURCE_BACKED:
        metadata["verification_status"] = obj.verification_status.value if isinstance(obj.verification_status, VerificationStatus) else str(obj.verification_status)

    if obj.technology:
        metadata["technology"] = obj.technology
    if obj.version:
        metadata["version"] = obj.version
    if obj.evidence:
        metadata["evidence"] = obj.evidence
    if obj.temporal:
        metadata["temporal"] = obj.temporal
    if obj.replaced_by:
        metadata["replaced_by"] = obj.replaced_by
    if obj.superseded_by:
        metadata["superseded_by"] = obj.superseded_by
    if obj.last_reviewed_at:
        metadata["last_reviewed_at"] = obj.last_reviewed_at
    if obj.next_review_at:
        metadata["next_review_at"] = obj.next_review_at
    if obj.retrieval_priority is not None:
        metadata["retrieval_priority"] = obj.retrieval_priority

    # Source Ingestion Foundation v1 Fields
    if obj.source_type:
        metadata["source_type"] = obj.source_type
    if obj.original_filename:
        metadata["original_filename"] = obj.original_filename
    if obj.mime_type:
        metadata["mime_type"] = obj.mime_type
    if obj.size_bytes is not None:
        metadata["size_bytes"] = obj.size_bytes
    if obj.sha256:
        metadata["sha256"] = obj.sha256
    if obj.ingested_at:
        metadata["ingested_at"] = obj.ingested_at
    if obj.parser:
        metadata["parser"] = obj.parser
    if obj.security:
        metadata["security"] = obj.security
    if obj.compilation:
        metadata["compilation"] = obj.compilation
    if obj.knowledge_objects:
        metadata["knowledge_objects"] = obj.knowledge_objects

    yaml_dump = yaml.dump(metadata, sort_keys=False, allow_unicode=True).strip()
    body_clean = obj.body.strip()
    return f"---\n{yaml_dump}\n---\n\n{body_clean}\n"
