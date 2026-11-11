import io
from pathlib import Path
from typing import Tuple
from app.models.source import SourceType

class ContentExtractor:
    @staticmethod
    def extract_text(content_bytes: bytes, file_extension: str) -> str:
        ext = file_extension.lower().lstrip(".")
        if ext in ("md", "markdown", "txt", "log", "json", "yaml", "yml", "py", "ts", "js", "html"):
            try:
                return content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                return content_bytes.decode("latin-1", errors="replace")
        elif ext == "pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(content_bytes))
                text_pages = []
                for page in reader.pages:
                    text_pages.append(page.extract_text() or "")
                return "\n\n".join(text_pages)
            except Exception as e:
                return f"[Failed to extract PDF text: {e}]"
        else:
            return content_bytes.decode("utf-8", errors="replace")
