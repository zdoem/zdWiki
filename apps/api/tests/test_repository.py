import pytest
import shutil
from pathlib import Path
from app.core.repository import MarkdownKnowledgeRepository
from app.models.knowledge import KnowledgeObject, KnowledgeType

@pytest.fixture
def temp_repo(tmp_path):
    repo_dir = tmp_path / "knowledge"
    repo = MarkdownKnowledgeRepository(repo_dir)
    return repo

def test_repo_save_and_get(temp_repo):
    obj = KnowledgeObject(
        id="concept-rest-api",
        type=KnowledgeType.CONCEPT,
        title="REST API",
        domains=["software-engineering", "backend"],
        summary="Representational State Transfer architecture for web APIs.",
        status="active",
        body="## Principles\nStateless, Client-Server, Cacheable."
    )
    saved_path = temp_repo.save(obj)
    assert saved_path.exists()
    assert temp_repo.exists("concept-rest-api")
    
    fetched = temp_repo.get("concept-rest-api")
    assert fetched is not None
    assert fetched.title == "REST API"
    assert fetched.summary == obj.summary
    assert "Stateless" in fetched.body

def test_repo_list_and_filter(temp_repo):
    obj1 = KnowledgeObject(
        id="tech-python",
        type=KnowledgeType.TECHNOLOGY,
        title="Python",
        domains=["software-engineering"],
        summary="Programming language"
    )
    obj2 = KnowledgeObject(
        id="concept-jwt",
        type=KnowledgeType.CONCEPT,
        title="JWT",
        domains=["security", "backend"],
        summary="JSON Web Token"
    )
    temp_repo.save(obj1)
    temp_repo.save(obj2)
    
    all_objs = temp_repo.list_all()
    assert len(all_objs) == 2
    
    tech_objs = temp_repo.list_all(type_filter=KnowledgeType.TECHNOLOGY)
    assert len(tech_objs) == 1
    assert tech_objs[0].id == "tech-python"
    
    sec_objs = temp_repo.list_all(domain_filter="security")
    assert len(sec_objs) == 1
    assert sec_objs[0].id == "concept-jwt"

def test_repo_delete(temp_repo):
    obj = KnowledgeObject(
        id="bug-sample",
        type=KnowledgeType.BUG,
        title="Sample Bug",
        summary="Testing deletion"
    )
    temp_repo.save(obj)
    assert temp_repo.exists("bug-sample")
    
    deleted = temp_repo.delete("bug-sample")
    assert deleted is True
    assert not temp_repo.exists("bug-sample")

def test_repo_find_relations_and_backlinks(temp_repo):
    obj_jwt = KnowledgeObject(
        id="concept-jwt-auth",
        type=KnowledgeType.CONCEPT,
        title="JWT Authentication",
        summary="Stateless auth",
        relations={"uses": ["tech-python"], "related_to": ["concept-refresh-token"]}
    )
    obj_playbook = KnowledgeObject(
        id="playbook-jwt-debug",
        type=KnowledgeType.DEBUG_PLAYBOOK,
        title="JWT Debug Playbook",
        summary="Debug playbook",
        relations={"troubleshoots": ["concept-jwt-auth"]}
    )
    temp_repo.save(obj_jwt)
    temp_repo.save(obj_playbook)

    # Test find_relations
    relations = temp_repo.find_relations("concept-jwt-auth")
    assert "uses" in relations
    assert "tech-python" in relations["uses"]
    assert "concept-refresh-token" in relations["related_to"]

    # Test find_backlinks
    backlinks = temp_repo.find_backlinks("concept-jwt-auth")
    assert len(backlinks) == 1
    assert backlinks[0]["source_id"] == "playbook-jwt-debug"
    assert backlinks[0]["relation_type"] == "troubleshoots"
