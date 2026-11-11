from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SourceType(str, Enum):
    MARKDOWN = "markdown"
    TEXT = "text"
    PDF = "pdf"
    WEB = "web"
    CODE = "code"
    JSON = "json"
    YAML = "yaml"

class SourceObject(BaseModel):
    id: str
    type: str = "source"
    title: str
    source_type: SourceType
    raw_path: str
    sha256: Optional[str] = None
    url: Optional[str] = None
    authors: List[str] = Field(default_factory=list)
    published_date: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    summary: str = ""
    created_at: Optional[str] = None
    body: str = ""
    file_path: Optional[str] = None
    original_filename: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    ingested_at: Optional[str] = None
    parser: Optional[Dict[str, Any]] = None
    security: Optional[Dict[str, Any]] = None
    compilation: Optional[Dict[str, Any]] = None
    knowledge_objects: List[str] = Field(default_factory=list)
