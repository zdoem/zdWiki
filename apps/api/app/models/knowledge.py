from enum import Enum
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field, field_validator
import re

class KnowledgeType(str, Enum):
    CONCEPT = "concept"
    TECHNOLOGY = "technology"
    PATTERN = "pattern"
    ARCHITECTURE = "architecture"
    SOURCE = "source"
    TEST = "test"
    BUG = "bug"
    DEBUG_PLAYBOOK = "debug_playbook"
    DECISION = "decision"
    ANALYSIS = "analysis"
    ENGINEERING_LOOP = "engineering_loop"

class LifecycleStatus(str, Enum):
    CURRENT = "current"
    LEGACY = "legacy"
    DEPRECATED = "deprecated"
    SUPERSEDED = "superseded"
    EXPERIMENTAL = "experimental"
    ARCHIVED = "archived"
    UNKNOWN = "unknown"

class KnowledgeStability(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    VOLATILE = "volatile"

class KnowledgeScope(str, Enum):
    FUNDAMENTAL = "fundamental"
    VERSION_SPECIFIC = "version_specific"
    IMPLEMENTATION_SPECIFIC = "implementation_specific"
    PROJECT_SPECIFIC = "project_specific"
    DOMAIN_SPECIFIC = "domain_specific"

class VerificationStatus(str, Enum):
    UNVERIFIED = "unverified"
    SOURCE_BACKED = "source_backed"
    TESTED = "tested"
    VERIFIED = "verified"
    DISPUTED = "disputed"
    INVALIDATED = "invalidated"

TYPE_PREFIX_MAP = {
    KnowledgeType.CONCEPT: "concept-",
    KnowledgeType.TECHNOLOGY: "tech-",
    KnowledgeType.PATTERN: "pat-",
    KnowledgeType.ARCHITECTURE: "arch-",
    KnowledgeType.SOURCE: "source-",
    KnowledgeType.TEST: "test-",
    KnowledgeType.BUG: "bug-",
    KnowledgeType.DEBUG_PLAYBOOK: "playbook-",
    KnowledgeType.DECISION: "decision-",
    KnowledgeType.ANALYSIS: "analysis-",
    KnowledgeType.ENGINEERING_LOOP: "loop-",
}

TYPE_DIR_MAP = {
    KnowledgeType.CONCEPT: "wiki/concepts",
    KnowledgeType.TECHNOLOGY: "wiki/technologies",
    KnowledgeType.PATTERN: "wiki/patterns",
    KnowledgeType.ARCHITECTURE: "wiki/architectures",
    KnowledgeType.SOURCE: "sources",
    KnowledgeType.TEST: "wiki/tests",
    KnowledgeType.BUG: "wiki/bugs",
    KnowledgeType.DEBUG_PLAYBOOK: "wiki/debug-playbooks",
    KnowledgeType.DECISION: "wiki/decisions",
    KnowledgeType.ANALYSIS: "wiki/analyses",
    KnowledgeType.ENGINEERING_LOOP: "wiki/loops",
}

ID_REGEX = re.compile(r"^[a-z0-9-]+$")

class VersionMetadata(BaseModel):
    introduced_in: Optional[str] = None
    deprecated_in: Optional[str] = None
    removed_in: Optional[str] = None
    min: Optional[str] = None
    max: Optional[str] = None
    compatible_with: Dict[str, Any] = Field(default_factory=dict)
    incompatible_with: Dict[str, Any] = Field(default_factory=dict)

class EvidenceItem(BaseModel):
    source_id: str
    tier: Optional[str] = "Tier A"
    verification: Optional[str] = "source_backed"
    captured_at: Optional[str] = None
    version_context: Optional[str] = None
    note: Optional[str] = None

class TemporalMetadata(BaseModel):
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    learned_at: Optional[str] = None

class TechnologyMetadata(BaseModel):
    name: Optional[str] = None
    ecosystem: Optional[str] = None

class KnowledgeObject(BaseModel):
    id: str = Field(..., description="Stable, language-neutral kebab-case ID")
    type: KnowledgeType = Field(..., description="Canonical Knowledge Object Type")
    title: str = Field(..., min_length=1, description="Object title")
    aliases: List[str] = Field(default_factory=list)
    domains: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    summary: str = Field(default="")
    relations: Dict[str, List[str]] = Field(default_factory=dict)
    sources: List[str] = Field(default_factory=list)
    created_at: Optional[str] = Field(default=None)
    updated_at: Optional[str] = Field(default=None)
    status: str = Field(default="current")
    
    # Extended Memory & Learning Foundation Fields
    lifecycle_status: LifecycleStatus = Field(default=LifecycleStatus.CURRENT)
    knowledge_stability: KnowledgeStability = Field(default=KnowledgeStability.MEDIUM)
    knowledge_scope: KnowledgeScope = Field(default=KnowledgeScope.IMPLEMENTATION_SPECIFIC)
    verification_status: VerificationStatus = Field(default=VerificationStatus.SOURCE_BACKED)
    
    technology: Optional[Dict[str, Any]] = Field(default=None)
    version: Optional[Dict[str, Any]] = Field(default=None)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    temporal: Optional[Dict[str, Any]] = Field(default=None)
    
    replaced_by: List[str] = Field(default_factory=list)
    superseded_by: List[str] = Field(default_factory=list)
    
    last_reviewed_at: Optional[str] = Field(default=None)
    next_review_at: Optional[str] = Field(default=None)
    retrieval_priority: Optional[float] = Field(default=None)
    
    # Body content (Markdown body below frontmatter)
    body: str = Field(default="", description="Markdown body")
    
    # Metadata for file location
    file_path: Optional[str] = Field(default=None, description="Relative path within knowledge base")

    # Source Ingestion Foundation v1 Fields
    source_type: Optional[str] = Field(default=None)
    original_filename: Optional[str] = Field(default=None)
    mime_type: Optional[str] = Field(default=None)
    size_bytes: Optional[int] = Field(default=None)
    sha256: Optional[str] = Field(default=None)
    ingested_at: Optional[str] = Field(default=None)
    parser: Optional[Dict[str, Any]] = Field(default=None) # name, version, status
    security: Optional[Dict[str, Any]] = Field(default=None) # secret_scan_status
    compilation: Optional[Dict[str, Any]] = Field(default=None) # status
    knowledge_objects: List[str] = Field(default_factory=list)

    @field_validator("id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        if not ID_REGEX.match(v):
            raise ValueError(f"ID '{v}' must be lowercase kebab-case alphanumeric")
        return v

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v: Any) -> str:
        if not v or v == "active":
            return "current"
        return str(v).lower()

    @field_validator("lifecycle_status", mode="before")
    @classmethod
    def normalize_lifecycle_status(cls, v: Any, info) -> LifecycleStatus:
        if (not v or v == "current" or v == "active") and info and hasattr(info, "data") and info.data:
            st = info.data.get("status")
            if st and st not in ["active", "current"]:
                v = st
        if not v or v == "active":
            return LifecycleStatus.CURRENT
        if isinstance(v, str):
            val_lower = v.lower()
            try:
                return LifecycleStatus(val_lower)
            except ValueError:
                return LifecycleStatus.UNKNOWN
        return v

    @field_validator("knowledge_stability", mode="before")
    @classmethod
    def normalize_stability(cls, v: Any) -> KnowledgeStability:
        if not v:
            return KnowledgeStability.MEDIUM
        if isinstance(v, str):
            try:
                return KnowledgeStability(v.lower())
            except ValueError:
                return KnowledgeStability.MEDIUM
        return v

    @field_validator("knowledge_scope", mode="before")
    @classmethod
    def normalize_scope(cls, v: Any) -> KnowledgeScope:
        if not v:
            return KnowledgeScope.IMPLEMENTATION_SPECIFIC
        if isinstance(v, str):
            try:
                return KnowledgeScope(v.lower())
            except ValueError:
                return KnowledgeScope.IMPLEMENTATION_SPECIFIC
        return v

    @field_validator("verification_status", mode="before")
    @classmethod
    def normalize_verification_status(cls, v: Any) -> VerificationStatus:
        if not v:
            return VerificationStatus.SOURCE_BACKED
        if isinstance(v, str):
            try:
                return VerificationStatus(v.lower())
            except ValueError:
                return VerificationStatus.UNVERIFIED
        return v

    @field_validator("created_at", "updated_at", "last_reviewed_at", "next_review_at", mode="before")
    @classmethod
    def convert_datetime_to_str(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if hasattr(v, "isoformat"):
            return v.isoformat()
        return str(v)

    def get_all_relations(self) -> List[tuple[str, str]]:
        """Returns list of (relation_type, target_id) pairs"""
        pairs = []
        for rel_type, targets in self.relations.items():
            if isinstance(targets, list):
                for target in targets:
                    pairs.append((rel_type, target))
            elif isinstance(targets, str):
                pairs.append((rel_type, targets))
        # Include replaced_by and superseded_by as typed relations if present
        for rep in self.replaced_by:
            pairs.append(("replaced_by", rep))
        for sup in self.superseded_by:
            pairs.append(("superseded_by", sup))
        return pairs

class ObjectSummary(BaseModel):
    id: str
    type: KnowledgeType
    title: str
    summary: str
    domains: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    status: str = "current"
    lifecycle_status: LifecycleStatus = LifecycleStatus.CURRENT
    knowledge_scope: KnowledgeScope = KnowledgeScope.IMPLEMENTATION_SPECIFIC
    knowledge_stability: KnowledgeStability = KnowledgeStability.MEDIUM
    verification_status: VerificationStatus = VerificationStatus.SOURCE_BACKED
    file_path: Optional[str] = None
