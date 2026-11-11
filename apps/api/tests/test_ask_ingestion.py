import pytest
import io
from fastapi.testclient import TestClient
from pathlib import Path

from app.main import app
from app.api.deps import get_repository, get_index_engine, get_search_engine, get_linter, get_llm_provider
from app.api.sources import get_ingestion_pipeline
from app.ingestion.pipeline import IngestionPipeline
from app.providers import MockLLMProvider
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.engine import SQLiteFTSSearchEngine
from app.core.linter import KnowledgeLinter
from app.models.knowledge import KnowledgeObject, KnowledgeType

@pytest.fixture
def test_client_full(tmp_path):
    repo_dir = tmp_path / "knowledge"
    db_path = tmp_path / "var" / "zdwiki.db"
    raw_dir = tmp_path / "knowledge" / "raw"
    
    repo = MarkdownKnowledgeRepository(repo_dir)
    index_engine = SQLiteIndexEngine(db_path)
    search_engine = SQLiteFTSSearchEngine(index_engine)
    linter = KnowledgeLinter(repo_dir)
    mock_llm = MockLLMProvider()
    pipeline = IngestionPipeline(repo, index_engine, raw_dir)

    # Seed knowledge
    obj = KnowledgeObject(
        id="tech-fastapi",
        type=KnowledgeType.TECHNOLOGY,
        title="FastAPI",
        domains=["backend"],
        tags=["python", "rest"],
        summary="High performance web framework for Python",
        body="## Overview\nFastAPI is built on Starlette and Pydantic."
    )
    repo.save(obj)
    index_engine.rebuild_index(repo)

    app.dependency_overrides[get_repository] = lambda: repo
    app.dependency_overrides[get_index_engine] = lambda: index_engine
    app.dependency_overrides[get_search_engine] = lambda: search_engine
    app.dependency_overrides[get_linter] = lambda: linter
    app.dependency_overrides[get_llm_provider] = lambda: mock_llm
    app.dependency_overrides[get_ingestion_pipeline] = lambda: pipeline

    with TestClient(app) as client:
        yield client, repo_dir, raw_dir, repo, index_engine

    app.dependency_overrides.clear()

def test_ask_zdwiki_endpoint(test_client_full):
    client, repo_dir, raw_dir, repo, index_engine = test_client_full

    req_payload = {
        "question": "What is FastAPI built on?",
        "max_context_tokens": 4000
    }
    res = client.post("/api/ask", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "knowledge_objects_used" in data
    assert "tech-fastapi" in data["knowledge_objects_used"]
    assert data["provider"] == "mock"

def test_ingest_markdown_source(test_client_full):
    client, repo_dir, raw_dir, repo, index_engine = test_client_full

    file_content = b"# Docker Architecture Guide\nDocker provides OS-level virtualization via containers."
    file_bytes = io.BytesIO(file_content)

    res = client.post(
        "/api/sources/ingest",
        files={"file": ("docker_guide.md", file_bytes, "text/markdown")},
        data={"title": "Docker Architecture Guide", "source_url": "https://docs.docker.com"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["source_id"].startswith("source-")
    assert "sha256" in data

    # Verify raw file exists and was not modified
    raw_files = list(raw_dir.glob("**/docker_guide.md")) + list(raw_dir.glob("**/*_docker_guide.md"))
    assert len(raw_files) >= 1
    assert raw_files[0].read_bytes() == file_content
