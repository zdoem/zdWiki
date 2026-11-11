from app.config import settings
from app.core.repository import MarkdownKnowledgeRepository, KnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.engine import SQLiteFTSSearchEngine, SearchEngine
from app.core.linter import KnowledgeLinter
from app.providers.gemini import GeminiProvider
from app.providers.base import BaseLLMProvider

# Singletons for FastAPI app
_repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
_index_engine = SQLiteIndexEngine(settings.db_path)
_search_engine = SQLiteFTSSearchEngine(_index_engine)
_linter = KnowledgeLinter(settings.knowledge_dir)
_llm_provider = GeminiProvider()

def get_repository() -> KnowledgeRepository:
    return _repo

def get_index_engine() -> SQLiteIndexEngine:
    return _index_engine

def get_search_engine() -> SearchEngine:
    return _search_engine

def get_linter() -> KnowledgeLinter:
    return _linter

def get_llm_provider() -> BaseLLMProvider:
    return _llm_provider
