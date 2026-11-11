import io
import json
import yaml
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field

class ProvenanceLocator(BaseModel):
    type: str  # "page", "heading", "line_range", "json_path", "yaml_path", "row_range", "selector"
    page: Optional[int] = None
    heading: Optional[str] = None
    section_path: List[str] = Field(default_factory=list)
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    path: Optional[str] = None  # JSONPath or YAMLPath
    start_row: Optional[int] = None
    end_row: Optional[int] = None
    selector: Optional[str] = None

class NormalizedSection(BaseModel):
    locator: ProvenanceLocator
    heading: Optional[str] = None
    text: str

class NormalizedSourceDocument(BaseModel):
    source_id: str
    source_type: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    sections: List[NormalizedSection] = Field(default_factory=list)
    parser_metadata: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)

class SourceParser(ABC):
    @abstractmethod
    def supports(self, extension: str, mime_type: str) -> bool:
        pass

    @abstractmethod
    def parse(self, content_bytes: bytes, source_id: str, metadata: Dict[str, Any]) -> NormalizedSourceDocument:
        pass

# -----------------------------------------------------------------
# Concrete Parsers
# -----------------------------------------------------------------

class MarkdownParser(SourceParser):
    def supports(self, extension: str, mime_type: str) -> bool:
        ext = extension.lower().lstrip(".")
        return ext in ("md", "markdown") or mime_type == "text/markdown"

    def parse(self, content_bytes: bytes, source_id: str, metadata: Dict[str, Any]) -> NormalizedSourceDocument:
        text = content_bytes.decode("utf-8", errors="replace")
        sections: List[NormalizedSection] = []
        
        # Simple heading-based chunker
        lines = text.splitlines()
        current_heading_path: List[str] = []
        current_section_lines: List[str] = []
        current_heading = None
        
        for line_num, line in enumerate(lines, 1):
            if line.startswith("#"):
                # Save previous section if it had content
                if current_section_lines:
                    heading_str = current_heading or "Header Content"
                    sections.append(NormalizedSection(
                        locator=ProvenanceLocator(
                            type="heading",
                            heading=heading_str,
                            section_path=list(current_heading_path)
                        ),
                        heading=heading_str,
                        text="\n".join(current_section_lines)
                    ))
                    current_section_lines = []
                
                # Parse new heading
                parts = line.split(None, 1)
                level = len(parts[0]) if parts else 1
                heading_text = parts[1].strip() if len(parts) > 1 else ""
                
                # Update path hierarchy
                if level <= len(current_heading_path):
                    current_heading_path = current_heading_path[:level - 1]
                current_heading_path.append(heading_text)
                current_heading = heading_text
            else:
                current_section_lines.append(line)
        
        # Save last section
        if current_section_lines:
            heading_str = current_heading or "Content"
            sections.append(NormalizedSection(
                locator=ProvenanceLocator(
                    type="heading",
                    heading=heading_str,
                    section_path=list(current_heading_path)
                ),
                heading=heading_str,
                text="\n".join(current_section_lines)
            ))
            
        # Fallback if no headings found
        if not sections:
            sections.append(NormalizedSection(
                locator=ProvenanceLocator(type="heading", heading="Document Body"),
                heading="Document Body",
                text=text
            ))

        return NormalizedSourceDocument(
            source_id=source_id,
            source_type="markdown",
            metadata=metadata,
            sections=sections,
            parser_metadata={"name": "MarkdownParser", "version": "1.0.0"}
        )

class TextParser(SourceParser):
    def supports(self, extension: str, mime_type: str) -> bool:
        ext = extension.lower().lstrip(".")
        return ext == "txt" or mime_type == "text/plain"

    def parse(self, content_bytes: bytes, source_id: str, metadata: Dict[str, Any]) -> NormalizedSourceDocument:
        try:
            text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = content_bytes.decode("latin-1", errors="replace")
            
        lines = text.splitlines()
        # Create line range section
        sections = [
            NormalizedSection(
                locator=ProvenanceLocator(
                    type="line_range",
                    start_line=1,
                    end_line=max(1, len(lines))
                ),
                heading=None,
                text=text
            )
        ]
        return NormalizedSourceDocument(
            source_id=source_id,
            source_type="text",
            metadata=metadata,
            sections=sections,
            parser_metadata={"name": "TextParser", "version": "1.0.0"}
        )

class PdfParser(SourceParser):
    def supports(self, extension: str, mime_type: str) -> bool:
        return extension.lower().lstrip(".") == "pdf" or mime_type == "application/pdf"

    def parse(self, content_bytes: bytes, source_id: str, metadata: Dict[str, Any]) -> NormalizedSourceDocument:
        sections: List[NormalizedSection] = []
        warnings: List[str] = []
        
        # Verify signature: must start with %PDF-
        if not content_bytes.startswith(b"%PDF-"):
            return NormalizedSourceDocument(
                source_id=source_id,
                source_type="pdf",
                metadata=metadata,
                warnings=["Invalid PDF signature. The file may be corrupt."],
                parser_metadata={"name": "PdfParser", "version": "1.0.0", "status": "failed"}
            )
            
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content_bytes))
            
            # Check encryption
            if reader.is_encrypted:
                return NormalizedSourceDocument(
                    source_id=source_id,
                    source_type="pdf",
                    metadata=metadata,
                    warnings=["ENCRYPTED_PDF_UNSUPPORTED"],
                    parser_metadata={"name": "PdfParser", "version": "1.0.0", "status": "failed"}
                )
                
            total_pages = len(reader.pages)
            has_text = False
            
            for page_idx, page in enumerate(reader.pages, 1):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    has_text = True
                sections.append(NormalizedSection(
                    locator=ProvenanceLocator(type="page", page=page_idx),
                    heading=f"Page {page_idx}",
                    text=page_text
                ))
                
            if not has_text:
                warnings.append("OCR_REQUIRED")
                
            return NormalizedSourceDocument(
                source_id=source_id,
                source_type="pdf",
                metadata=metadata,
                sections=sections,
                warnings=warnings,
                parser_metadata={
                    "name": "PdfParser",
                    "version": "1.0.0",
                    "page_count": total_pages,
                    "status": "completed"
                }
            )
        except Exception as e:
            return NormalizedSourceDocument(
                source_id=source_id,
                source_type="pdf",
                metadata=metadata,
                warnings=[f"CORRUPT_PDF: {e}"],
                parser_metadata={"name": "PdfParser", "version": "1.0.0", "status": "failed"}
            )

class JsonParser(SourceParser):
    def supports(self, extension: str, mime_type: str) -> bool:
        return extension.lower().lstrip(".") == "json" or mime_type == "application/json"

    def parse(self, content_bytes: bytes, source_id: str, metadata: Dict[str, Any]) -> NormalizedSourceDocument:
        try:
            text = content_bytes.decode("utf-8")
            data = json.loads(text)
        except Exception as e:
            return NormalizedSourceDocument(
                source_id=source_id,
                source_type="json",
                metadata=metadata,
                warnings=[f"INVALID_JSON: {e}"],
                parser_metadata={"name": "JsonParser", "version": "1.0.0", "status": "failed"}
            )
            
        warnings = []
        try:
            self._validate_limits(data, current_depth=1)
        except ValueError as limit_err:
            return NormalizedSourceDocument(
                source_id=source_id,
                source_type="json",
                metadata=metadata,
                warnings=[str(limit_err)],
                parser_metadata={"name": "JsonParser", "version": "1.0.0", "status": "failed"}
            )
            
        sections = self._flatten(data, "$")
        return NormalizedSourceDocument(
            source_id=source_id,
            source_type="json",
            metadata=metadata,
            sections=sections,
            warnings=warnings,
            parser_metadata={"name": "JsonParser", "version": "1.0.0", "status": "completed"}
        )

    def _validate_limits(self, val: Any, current_depth: int, max_depth: int = 20, max_items: int = 10000):
        if current_depth > max_depth:
            raise ValueError(f"NESTING_DEPTH_EXCEEDED: Nesting depth exceeded maximum of {max_depth}")
            
        if isinstance(val, dict):
            if len(val) > max_items:
                raise ValueError("MAX_ITEMS_EXCEEDED")
            for k, v in val.items():
                self._validate_limits(v, current_depth + 1, max_depth, max_items)
        elif isinstance(val, list):
            if len(val) > max_items:
                raise ValueError("MAX_ITEMS_EXCEEDED")
            for item in val:
                self._validate_limits(item, current_depth + 1, max_depth, max_items)

    def _flatten(self, val: Any, path: str) -> List[NormalizedSection]:
        sections: List[NormalizedSection] = []
        if isinstance(val, dict):
            for k, v in val.items():
                sections.extend(self._flatten(v, f"{path}.{k}"))
            sections.append(NormalizedSection(
                locator=ProvenanceLocator(type="json_path", path=path),
                heading=path,
                text=json.dumps(val, indent=2)
            ))
        elif isinstance(val, list):
            for idx, item in enumerate(val):
                sections.extend(self._flatten(item, f"{path}[{idx}]"))
            sections.append(NormalizedSection(
                locator=ProvenanceLocator(type="json_path", path=path),
                heading=path,
                text=json.dumps(val, indent=2)
            ))
        else:
            sections.append(NormalizedSection(
                locator=ProvenanceLocator(type="json_path", path=path),
                heading=path,
                text=str(val)
            ))
        return sections

class YamlParser(SourceParser):
    def supports(self, extension: str, mime_type: str) -> bool:
        ext = extension.lower().lstrip(".")
        return ext in ("yaml", "yml") or mime_type in ("application/yaml", "text/yaml")

    def parse(self, content_bytes: bytes, source_id: str, metadata: Dict[str, Any]) -> NormalizedSourceDocument:
        try:
            text = content_bytes.decode("utf-8")
            docs = list(yaml.safe_load_all(text))
        except Exception as e:
            return NormalizedSourceDocument(
                source_id=source_id,
                source_type="yaml",
                metadata=metadata,
                warnings=[f"INVALID_YAML: {e}"],
                parser_metadata={"name": "YamlParser", "version": "1.0.0", "status": "failed"}
            )
            
        warnings = []
        sections: List[NormalizedSection] = []
        
        try:
            for d in docs:
                self._validate_limits(d, current_depth=1)
        except ValueError as limit_err:
            return NormalizedSourceDocument(
                source_id=source_id,
                source_type="yaml",
                metadata=metadata,
                warnings=[str(limit_err)],
                parser_metadata={"name": "YamlParser", "version": "1.0.0", "status": "failed"}
            )
            
        for doc_idx, doc in enumerate(docs):
            prefix = f"$[{doc_idx}]" if len(docs) > 1 else "$"
            sections.extend(self._flatten(doc, prefix))
            
        return NormalizedSourceDocument(
            source_id=source_id,
            source_type="yaml",
            metadata=metadata,
            sections=sections,
            warnings=warnings,
            parser_metadata={"name": "YamlParser", "version": "1.0.0", "status": "completed"}
        )

    def _validate_limits(self, val: Any, current_depth: int, max_depth: int = 20, max_items: int = 10000):
        if current_depth > max_depth:
            raise ValueError(f"NESTING_DEPTH_EXCEEDED: Nesting depth exceeded maximum of {max_depth}")
            
        if isinstance(val, dict):
            if len(val) > max_items:
                raise ValueError("MAX_ITEMS_EXCEEDED")
            for k, v in val.items():
                self._validate_limits(v, current_depth + 1, max_depth, max_items)
        elif isinstance(val, list):
            if len(val) > max_items:
                raise ValueError("MAX_ITEMS_EXCEEDED")
            for item in val:
                self._validate_limits(item, current_depth + 1, max_depth, max_items)

    def _flatten(self, val: Any, path: str) -> List[NormalizedSection]:
        sections: List[NormalizedSection] = []
        if isinstance(val, dict):
            for k, v in val.items():
                sections.extend(self._flatten(v, f"{path}.{k}"))
            sections.append(NormalizedSection(
                locator=ProvenanceLocator(type="yaml_path", path=path),
                heading=path,
                text=yaml.dump(val, sort_keys=False, allow_unicode=True)
            ))
        elif isinstance(val, list):
            for idx, item in enumerate(val):
                sections.extend(self._flatten(item, f"{path}[{idx}]"))
            sections.append(NormalizedSection(
                locator=ProvenanceLocator(type="yaml_path", path=path),
                heading=path,
                text=yaml.dump(val, sort_keys=False, allow_unicode=True)
            ))
        else:
            sections.append(NormalizedSection(
                locator=ProvenanceLocator(type="yaml_path", path=path),
                heading=path,
                text=str(val)
            ))
        return sections

# -----------------------------------------------------------------
# Registry Manager
# -----------------------------------------------------------------

class ParserRegistry:
    def __init__(self):
        self._parsers: List[SourceParser] = []
        self.register(MarkdownParser())
        self.register(TextParser())
        self.register(PdfParser())
        self.register(JsonParser())
        self.register(YamlParser())

    def register(self, parser: SourceParser):
        self._parsers.append(parser)

    def get_parser(self, extension: str, mime_type: str) -> SourceParser:
        for parser in self._parsers:
            if parser.supports(extension, mime_type):
                return parser
        return TextParser()
