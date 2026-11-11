import os
from pathlib import Path
from pydantic import BaseModel, Field

# Automatically load .env if present in root
_env_file = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            _k = _k.strip()
            _v = _v.strip()
            if _k and _k not in os.environ:
                os.environ[_k] = _v

class Settings(BaseModel):
    host: str = Field(default_factory=lambda: os.getenv("ZDWIKI_HOST", "0.0.0.0"))
    port: int = Field(default_factory=lambda: int(os.getenv("ZDWIKI_PORT", "8000")))
    
    # Root directory resolution (default to repo root)
    base_dir: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent.parent.parent)
    
    knowledge_dir_rel: str = Field(default_factory=lambda: os.getenv("ZDWIKI_KNOWLEDGE_DIR", "knowledge"))
    db_path_rel: str = Field(default_factory=lambda: os.getenv("ZDWIKI_DB_PATH", "var/zdwiki.db"))
    raw_dir_rel: str = Field(default_factory=lambda: os.getenv("ZDWIKI_RAW_DIR", "knowledge/raw"))
    
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-flash-latest"))

    @property
    def knowledge_dir(self) -> Path:
        p = Path(self.knowledge_dir_rel)
        return p if p.is_absolute() else (self.base_dir / p).resolve()

    @property
    def db_path(self) -> Path:
        p = Path(self.db_path_rel)
        return p if p.is_absolute() else (self.base_dir / p).resolve()

    @property
    def raw_dir(self) -> Path:
        p = Path(self.raw_dir_rel)
        return p if p.is_absolute() else (self.base_dir / p).resolve()

settings = Settings()
