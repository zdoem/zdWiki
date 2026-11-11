import pytest
from pathlib import Path
from app.core.repository import MarkdownKnowledgeRepository
from app.core.linter import KnowledgeLinter
from app.models.knowledge import KnowledgeObject, KnowledgeType

@pytest.fixture
def temp_linter_repo(tmp_path):
    repo_dir = tmp_path / "knowledge"
    repo = MarkdownKnowledgeRepository(repo_dir)
    return repo_dir, repo

def test_linter_clean_repo(temp_linter_repo):
    repo_dir, repo = temp_linter_repo
    obj1 = KnowledgeObject(
        id="tech-python",
        type=KnowledgeType.TECHNOLOGY,
        title="Python",
        summary="Programming language",
        relations={"related_to": ["tech-fastapi"]}
    )
    obj2 = KnowledgeObject(
        id="tech-fastapi",
        type=KnowledgeType.TECHNOLOGY,
        title="FastAPI",
        summary="Web framework",
        relations={"uses": ["tech-python"]}
    )
    repo.save(obj1)
    repo.save(obj2)
    
    linter = KnowledgeLinter(repo_dir)
    report = linter.lint_all()
    
    assert report.is_healthy
    assert len(report.errors) == 0
    assert report.total_objects == 2

def test_linter_detects_broken_relation(temp_linter_repo):
    repo_dir, repo = temp_linter_repo
    obj = KnowledgeObject(
        id="tech-fastapi",
        type=KnowledgeType.TECHNOLOGY,
        title="FastAPI",
        summary="Web framework",
        relations={"uses": ["tech-non-existent-id"]}
    )
    repo.save(obj)
    
    linter = KnowledgeLinter(repo_dir)
    report = linter.lint_all()
    
    assert not report.is_healthy
    assert any(e.rule == "broken-relation" for e in report.errors)

def test_linter_detects_empty_summary(temp_linter_repo):
    repo_dir, repo = temp_linter_repo
    obj1 = KnowledgeObject(
        id="tech-python",
        type=KnowledgeType.TECHNOLOGY,
        title="Python",
        summary="",
        relations={"related_to": ["tech-fastapi"]}
    )
    obj2 = KnowledgeObject(
        id="tech-fastapi",
        type=KnowledgeType.TECHNOLOGY,
        title="FastAPI",
        summary="Web framework",
        relations={"uses": ["tech-python"]}
    )
    repo.save(obj1)
    repo.save(obj2)
    
    linter = KnowledgeLinter(repo_dir)
    report = linter.lint_all()
    
    assert any(w.rule == "empty-summary" for w in report.warnings)
