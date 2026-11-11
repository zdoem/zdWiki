import os
import re
import mimetypes
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

from app.models.knowledge import KnowledgeObject, KnowledgeType
from app.models.source import SourceType
from app.core.repository import KnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.ingestion.storage import RawStorage
from app.ingestion.parser_registry import ParserRegistry, NormalizedSourceDocument, NormalizedSection, ProvenanceLocator

# Slugify implementation
def slugify(text: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", cleaned)

SUSPICIOUS_KEYS = {
    "password", "passwd", "pwd", "secret", "api_key", "apikey",
    "access_token", "refresh_token", "token", "client_secret",
    "private_key", "authorization", "credential", "conn_str", "connection_string"
}

# Regexes for high confidence secrets
SECRET_PATTERNS = [
    re.compile(r"-----BEGIN[A-Z ]+PRIVATE KEY-----"),
    re.compile(r"eyJhbGciOi[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+=]*"),  # JWT
    re.compile(r"sk-[A-Za-z0-9]{32,}")  # API key patterns
]

class SourceIngestionService:
    def __init__(self, repo: KnowledgeRepository, index_engine: SQLiteIndexEngine, raw_dir: Path):
        self.repo = repo
        self.index_engine = index_engine
        self.raw_dir = Path(raw_dir)
        self.storage = RawStorage(raw_dir)
        self.registry = ParserRegistry()

    def detect_secrets(self, document: NormalizedSourceDocument) -> Tuple[str, List[str]]:
        """
        Scans document sections for potential secrets.
        Returns (secret_scan_status, warnings) and redacts secrets in sections in-place.
        """
        warnings = []
        secret_found = False
        redacted_values = set()

        # Key-based scanning for JSON/YAML paths and value scanning for unstructured text
        for section in document.sections:
            locator_path = section.locator.path or ""
            # 1. Key check
            is_suspicious_key = False
            for key in SUSPICIOUS_KEYS:
                # check if path ends with key or contains key as segment
                if f".{key}" in locator_path.lower() or f"[{key}]" in locator_path.lower() or locator_path.lower() == f"$.{key}":
                    is_suspicious_key = True
                    break
            
            # If it is a leaf node and not a serialized dictionary/array containing structured format
            if is_suspicious_key and not (section.text.strip().startswith("{") or section.text.strip().startswith("[")):
                val = section.text.strip()
                if len(val) > 3 and val.lower() not in ("true", "false", "null", "none"):
                    redacted_values.add(val)
                    secret_found = True

            # 2. Pattern check
            for pattern in SECRET_PATTERNS:
                for match in pattern.finditer(section.text):
                    val = match.group()
                    redacted_values.add(val)
                    secret_found = True

        # Redact the actual secrets globally from all nodes
        if redacted_values:
            for val in redacted_values:
                for section in document.sections:
                    if val in section.text:
                        section.text = section.text.replace(val, "[REDACTED]")
                        loc_desc = section.locator.path or f"section {section.locator.type}:{section.locator.page or section.locator.heading or ''}"
                        warnings.append(f"Potential secret redacted at: {loc_desc}")

        warnings = list(dict.fromkeys(warnings))
        status = "review_required" if secret_found else "clean"
        return status, warnings

    def ingest_bytes(
        self,
        filename: str,
        content_bytes: bytes,
        title: Optional[str] = None,
        source_url: Optional[str] = None,
        tags: Optional[list] = None
    ) -> Dict[str, Any]:
        # Path traversal prevention
        if ".." in filename or "/" in filename or "\\" in filename:
            raise ValueError("Invalid filename")

        clean_filename = Path(filename).name
        if clean_filename in (".", "..", ""):
            raise ValueError("Invalid filename")

        ext = Path(clean_filename).suffix.lower()
        sha = hashlib.sha256(content_bytes).hexdigest()

        # 1. Duplicate check
        for obj in self.repo.list_all(type_filter=KnowledgeType.SOURCE):
            if obj.sha256 == sha:
                return {
                    "status": "duplicate",
                    "source_id": obj.id,
                    "title": obj.title,
                    "raw_path": obj.file_path,
                    "sha256": obj.sha256,
                    "parse_status": "completed",
                    "secret_scan_status": obj.security.get("secret_scan_status") if obj.security else "clean"
                }

        # 2. Content signature checks where practical
        mime_type, _ = mimetypes.guess_type(clean_filename)
        mime_type = mime_type or "application/octet-stream"

        if ext == ".pdf" and not content_bytes.startswith(b"%PDF-"):
            raise ValueError("Invalid PDF file signature.")

        # 3. Store raw immutable artifact safely
        category = "pdf" if ext == ".pdf" else ("web" if source_url else "docs")
        target_file, sha_calc, rel_raw_path = self.storage.store_raw(clean_filename, content_bytes, category=category)

        # 4. Parse document
        base_title = title or Path(clean_filename).stem.replace("_", " ").replace("-", " ").title()
        source_id = f"source-{slugify(base_title)}"

        # If ID already exists in repo, add hash suffix to avoid collision
        if self.repo.exists(source_id):
            source_id = f"source-{slugify(base_title)}-{sha[:6]}"

        parser = self.registry.get_parser(ext, mime_type)
        metadata = {
            "title": base_title,
            "original_filename": clean_filename,
            "mime_type": mime_type,
            "size_bytes": len(content_bytes),
            "sha256": sha
        }

        parsed_doc = parser.parse(content_bytes, source_id, metadata)

        # 5. Secret scanner
        secret_status, secret_warnings = self.detect_secrets(parsed_doc)
        parsed_doc.warnings.extend(secret_warnings)

        # Compute derived searchable text representation
        body_text = ""
        for sec in parsed_doc.sections:
            locator_desc = f"{sec.locator.type}: {sec.locator.page or sec.locator.heading or sec.locator.path or sec.locator.start_line or ''}"
            body_text += f"\n### Section ({locator_desc})\n{sec.text}\n"

        now_str = datetime.utcnow().isoformat()

        # Update parser metadata
        parser_info = parsed_doc.parser_metadata
        parser_status = parser_info.get("status", "completed")
        if parsed_doc.warnings and parser_status == "completed":
            # If warnings contain structural issues, mark parser status
            for w in parsed_doc.warnings:
                if "INVALID_" in w or "CORRUPT_" in w or "EXCEEDED" in w:
                    parser_status = "failed"
                elif "OCR_REQUIRED" in w:
                    parser_status = "ocr_required"

        source_obj = KnowledgeObject(
            id=source_id,
            type=KnowledgeType.SOURCE,
            title=base_title,
            tags=tags or [ext.lstrip("."), "source"],
            summary=f"Ingested {clean_filename} source",
            created_at=now_str,
            updated_at=now_str,
            status="active",
            source_type=category,
            original_filename=clean_filename,
            mime_type=mime_type,
            size_bytes=len(content_bytes),
            sha256=sha,
            ingested_at=now_str,
            parser={
                "name": parser_info.get("name", "Unknown"),
                "version": parser_info.get("version", "1.0.0"),
                "status": parser_status
            },
            security={
                "secret_scan_status": secret_status
            },
            compilation={
                "status": "not_started"
            },
            knowledge_objects=[],
            body=(
                f"## Source Metadata\n"
                f"- **Raw Path**: `{rel_raw_path}`\n"
                f"- **SHA256**: `{sha}`\n"
                f"- **URL**: {source_url or 'N/A'}\n"
                f"- **Ingested At**: {now_str}\n\n"
                f"## Extracted Content\n"
                f"{body_text}"
            )
        )

        # Save and index
        self.repo.save(source_obj)
        self.index_engine.index_object(source_obj)
        self.index_engine.log_activity("ingest_source", target_id=source_id, details=f"Ingested {clean_filename} as {source_id}")

        return {
            "status": "success",
            "source_id": source_id,
            "title": base_title,
            "raw_path": rel_raw_path,
            "sha256": sha,
            "file_path": source_obj.file_path,
            "parse_status": parser_status,
            "secret_scan_status": secret_status,
            "warnings": parsed_doc.warnings
        }
