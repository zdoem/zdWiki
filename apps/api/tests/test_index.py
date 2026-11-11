import pytest
import sqlite3
from pathlib import Path
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.models.knowledge import KnowledgeObject, KnowledgeType

@pytest.fixture
def temp_index_setup(tmp_path):
    repo_dir = tmp_path / "knowledge"
    db_path = tmp_path / "var" / "zdwiki.db"
    repo = MarkdownKnowledgeRepository(repo_dir)
    engine = SQLiteIndexEngine(db_path)
    return repo_dir, db_path, repo, engine

def test_index_and_retrieve_object(temp_index_setup):
    repo_dir, db_path, repo, engine = temp_index_setup
    
    obj = KnowledgeObject(
        id="tech-fastapi",
        type=KnowledgeType.TECHNOLOGY,
        title="FastAPI",
        aliases=["fast-api"],
        domains=["backend", "python"],
        tags=["rest", "async"],
        summary="High speed python framework",
        relations={"uses": ["tech-python"]},
        sources=["source-fastapi-docs"],
        body="FastAPI documentation body"
    )
    repo.save(obj)
    engine.index_object(obj)
    
    with engine.get_connection() as conn:
        row = conn.execute("SELECT * FROM objects WHERE id = ?", ("tech-fastapi",)).fetchone()
        assert row is not None
        assert row["title"] == "FastAPI"
        
        alias_row = conn.execute("SELECT alias FROM aliases WHERE object_id = ?", ("tech-fastapi",)).fetchone()
        assert alias_row["alias"] == "fast-api"
        
        rel_row = conn.execute("SELECT * FROM relations WHERE source_id = ?", ("tech-fastapi",)).fetchone()
        assert rel_row["target_id"] == "tech-python"
        assert rel_row["relation_type"] == "uses"

def test_rebuild_index_from_markdown(temp_index_setup):
    repo_dir, db_path, repo, engine = temp_index_setup
    
    obj1 = KnowledgeObject(
        id="concept-auth",
        type=KnowledgeType.CONCEPT,
        title="Authentication",
        summary="Verifying user identity"
    )
    obj2 = KnowledgeObject(
        id="tech-jwt",
        type=KnowledgeType.TECHNOLOGY,
        title="JWT",
        summary="JSON Web Token standard"
    )
    repo.save(obj1)
    repo.save(obj2)
    
    res = engine.rebuild_index(repo)
    assert res["status"] == "success"
    assert res["indexed_count"] == 2
    
    with engine.get_connection() as conn:
        count = conn.execute("SELECT count(*) as c FROM objects").fetchone()["c"]
        assert count == 2
