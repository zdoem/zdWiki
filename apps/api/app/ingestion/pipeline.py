import re
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

from app.models.knowledge import KnowledgeObject, KnowledgeType
from app.models.source import SourceObject, SourceType
from app.core.repository import KnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.ingestion.storage import RawStorage
from app.ingestion.extractor import ContentExtractor

def slugify(text: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", cleaned)

from app.ingestion.ingestion_service import SourceIngestionService

class IngestionPipeline:
    def __init__(self, repo: KnowledgeRepository, index_engine: SQLiteIndexEngine, raw_dir: Path):
        self.repo = repo
        self.index_engine = index_engine
        self.service = SourceIngestionService(repo, index_engine, raw_dir)

    def ingest_file(
        self,
        filename: str,
        content_bytes: bytes,
        title: Optional[str] = None,
        source_url: Optional[str] = None,
        tags: Optional[list] = None
    ) -> Dict[str, Any]:
        return self.service.ingest_bytes(
            filename=filename,
            content_bytes=content_bytes,
            title=title,
            source_url=source_url,
            tags=tags
        )
