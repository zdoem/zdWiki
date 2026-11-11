import pytest
import shutil
from pathlib import Path
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.engine import SQLiteFTSSearchEngine
from app.models.knowledge import KnowledgeObject, KnowledgeType

@pytest.fixture
def search_fixture(tmp_path):
    repo_dir = tmp_path / "knowledge"
    db_path = tmp_path / "var" / "zdwiki.db"
    repo = MarkdownKnowledgeRepository(repo_dir)
    index_engine = SQLiteIndexEngine(db_path)
    search_engine = SQLiteFTSSearchEngine(index_engine)

    # Fixture objects as required by spec Section 18
    fixtures = [
        KnowledgeObject(
            id="tech-fastapi",
            type=KnowledgeType.TECHNOLOGY,
            title="FastAPI",
            domains=["software-engineering", "backend"],
            tags=["python", "framework"],
            summary="Modern high performance web framework for building APIs with Python.",
            body="FastAPI provides automatic OpenAPI documentation and high developer productivity."
        ),
        KnowledgeObject(
            id="concept-jwt-auth",
            type=KnowledgeType.CONCEPT,
            title="JWT Authentication",
            domains=["software-engineering", "security"],
            tags=["jwt", "auth", "token"],
            summary="JSON Web Token based authentication mechanism for stateless APIs.",
            body="JWT tokens encode claims and signature to verify token authenticity and handle expiry."
        ),
        KnowledgeObject(
            id="concept-refresh-token",
            type=KnowledgeType.CONCEPT,
            title="Refresh Token",
            domains=["security", "backend"],
            tags=["auth", "oauth2"],
            summary="Long-lived credential used to obtain new access tokens upon expiry.",
            body="Refresh token rotation helps mitigate token theft and replay attacks."
        ),
        KnowledgeObject(
            id="concept-replay-attack",
            type=KnowledgeType.CONCEPT,
            title="Replay Attack",
            domains=["security"],
            tags=["vulnerability", "network"],
            summary="Network attack where valid data transmission is fraudulently repeated.",
            body="Mitigated by nonces, timestamps, and single-use refresh tokens."
        ),
        KnowledgeObject(
            id="test-jwt-expiry",
            type=KnowledgeType.TEST,
            title="JWT Expiry Test",
            domains=["security", "backend"],
            tags=["test", "jwt", "expiry"],
            summary="Automated test suite verifying expired JWT rejection and token lifecycle.",
            body="Verifies that expired access tokens return HTTP 401 Unauthorized during authentication."
        ),
        KnowledgeObject(
            id="playbook-jwt-debug",
            type=KnowledgeType.DEBUG_PLAYBOOK,
            title="JWT Debug Playbook",
            domains=["security", "backend"],
            tags=["debug", "jwt", "playbook", "expiry"],
            summary="Step-by-step debug guide for diagnosing JWT signature mismatches and token expiry errors.",
            body="How to debug jwt expiry issues: check system clock drift, verify secret key consistency, inspect exp claims."
        )
    ]

    for obj in fixtures:
        repo.save(obj)

    index_engine.rebuild_index(repo)
    return repo_dir, db_path, repo, index_engine, search_engine

def test_regression_search_jwt_expiry(search_fixture):
    repo_dir, db_path, repo, index_engine, search_engine = search_fixture

    # Section 18 query: "debug jwt expiry"
    response = search_engine.search("debug jwt expiry", limit=5)
    
    assert response.total >= 3
    result_ids = [r.id for r in response.results]
    
    # Must rank JWT Debug Playbook, JWT Authentication, and JWT Expiry Test
    assert "playbook-jwt-debug" in result_ids
    assert "test-jwt-expiry" in result_ids
    assert "concept-jwt-auth" in result_ids
    
    # Top result should be the debug playbook
    assert response.results[0].id == "playbook-jwt-debug"

def test_disposable_database_rebuild(search_fixture):
    repo_dir, db_path, repo, index_engine, search_engine = search_fixture

    # 1. Search before deletion
    initial_res = search_engine.search("FastAPI")
    assert initial_res.total > 0
    assert initial_res.results[0].id == "tech-fastapi"

    # 2. Simulate deleting var/zdwiki.db
    if db_path.exists():
        db_path.unlink()

    # 3. Create fresh index engine and rebuild from markdown
    fresh_index_engine = SQLiteIndexEngine(db_path)
    fresh_index_engine.rebuild_index(repo)
    fresh_search_engine = SQLiteFTSSearchEngine(fresh_index_engine)

    # 4. Search after rebuild
    rebuilt_res = fresh_search_engine.search("FastAPI")
    assert rebuilt_res.total > 0
    assert rebuilt_res.results[0].id == "tech-fastapi"

def test_search_with_domain_filter(search_fixture):
    repo_dir, db_path, repo, index_engine, search_engine = search_fixture

    # Search with domain filter "security"
    res = search_engine.search("token", domain_filter="security")
    assert res.total > 0
    for item in res.results:
        assert "security" in item.domains
