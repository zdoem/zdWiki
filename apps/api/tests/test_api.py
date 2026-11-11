import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import shutil

from app.main import app
from app.api.deps import get_repository, get_index_engine, get_search_engine, get_linter
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.engine import SQLiteFTSSearchEngine
from app.core.linter import KnowledgeLinter
from app.models.knowledge import KnowledgeObject, KnowledgeType

@pytest.fixture
def test_client(tmp_path):
    repo_dir = tmp_path / "knowledge"
    db_path = tmp_path / "var" / "zdwiki.db"
    
    repo = MarkdownKnowledgeRepository(repo_dir)
    index_engine = SQLiteIndexEngine(db_path)
    search_engine = SQLiteFTSSearchEngine(index_engine)
    linter = KnowledgeLinter(repo_dir)

    # Seed sample knowledge
    obj = KnowledgeObject(
        id="tech-fastapi",
        type=KnowledgeType.TECHNOLOGY,
        title="FastAPI",
        domains=["backend"],
        tags=["python", "rest"],
        summary="High performance web framework",
        body="## Overview\nFastAPI details..."
    )
    repo.save(obj)
    index_engine.rebuild_index(repo)

    # Override dependencies
    app.dependency_overrides[get_repository] = lambda: repo
    app.dependency_overrides[get_index_engine] = lambda: index_engine
    app.dependency_overrides[get_search_engine] = lambda: search_engine
    app.dependency_overrides[get_linter] = lambda: linter

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()

def test_health_endpoints(test_client):
    res = test_client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_k = test_client.get("/api/health/knowledge")
    assert res_k.status_code == 200
    assert "total_objects" in res_k.json()

def test_stats_endpoint(test_client):
    res = test_client.get("/api/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["total_objects"] >= 1
    assert "by_type" in data

def test_knowledge_crud_endpoints(test_client):
    # 1. List
    res = test_client.get("/api/knowledge")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert items[0]["id"] == "tech-fastapi"

    # 2. Get by ID
    res_get = test_client.get("/api/knowledge/tech-fastapi")
    assert res_get.status_code == 200
    assert res_get.json()["title"] == "FastAPI"

    # 3. Create new object
    new_obj = {
        "id": "concept-oauth2",
        "type": "concept",
        "title": "OAuth 2.0",
        "summary": "Authorization framework",
        "domains": ["security"],
        "tags": ["auth"],
        "status": "active",
        "body": "OAuth 2.0 specification"
    }
    res_post = test_client.post("/api/knowledge", json=new_obj)
    assert res_post.status_code == 200
    assert res_post.json()["id"] == "concept-oauth2"

    # 4. Search for newly created object
    res_search = test_client.get("/api/search?q=OAuth")
    assert res_search.status_code == 200
    assert res_search.json()["total"] >= 1

    # 5. Delete object
    res_del = test_client.delete("/api/knowledge/concept-oauth2")
    assert res_del.status_code == 200

def test_graph_endpoint(test_client):
    res = test_client.get("/api/graph")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data

def test_loops_api(test_client):
    # 1. Create loop
    loop_data = {
        "id": "loop-2026-0001",
        "title": "Fix token expiration",
        "goal": "Ensure refresh tokens expire properly",
        "current_stage": "goal"
    }
    res_create = test_client.post("/api/loops", json=loop_data)
    assert res_create.status_code == 200

    # 2. Update loop stage
    stage_update = {
        "stage": "plan",
        "status": "completed",
        "notes": "Plan agreed and outlined"
    }
    res_patch = test_client.patch("/api/loops/loop-2026-0001/stage", json=stage_update)
    assert res_patch.status_code == 200
    assert res_patch.json()["stage"] == "plan"
