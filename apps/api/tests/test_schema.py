import pytest
from pydantic import ValidationError as PydanticValidationError
from app.models.knowledge import KnowledgeObject, KnowledgeType
from app.models.source import SourceObject, SourceType
from app.models.loop import EngineeringLoop, LoopStage

def test_valid_knowledge_object():
    obj = KnowledgeObject(
        id="tech-fastapi",
        type=KnowledgeType.TECHNOLOGY,
        title="FastAPI",
        aliases=["fast-api"],
        domains=["software-engineering", "backend"],
        tags=["python", "web", "rest"],
        summary="High performance Python web framework",
        relations={"uses": ["tech-python"], "related_to": ["concept-rest-api"]},
        sources=["source-fastapi-docs"],
        status="active",
        body="## Overview\nFastAPI is modern and fast."
    )
    assert obj.id == "tech-fastapi"
    assert obj.type == KnowledgeType.TECHNOLOGY
    assert len(obj.get_all_relations()) == 2
    assert ("uses", "tech-python") in obj.get_all_relations()

def test_invalid_id_format():
    with pytest.raises(PydanticValidationError):
        KnowledgeObject(
            id="INVALID_ID_WITH_CAPS",
            type=KnowledgeType.CONCEPT,
            title="Invalid",
            summary="Bad ID"
        )

def test_source_object():
    source = SourceObject(
        id="source-rfc-7519",
        title="JSON Web Token (JWT) RFC 7519",
        source_type=SourceType.MARKDOWN,
        raw_path="raw/docs/rfc7519.md",
        url="https://tools.ietf.org/html/rfc7519",
        authors=["IETF"],
        summary="Standard specification for JSON Web Tokens"
    )
    assert source.id == "source-rfc-7519"
    assert source.source_type == SourceType.MARKDOWN

def test_engineering_loop_model():
    loop = EngineeringLoop(
        id="loop-2026-0001",
        title="JWT refresh token fix",
        goal="Prevent refresh token race condition",
        current_stage=LoopStage.PLAN,
        related=["bug-refresh-token-race", "test-refresh-token-reuse"]
    )
    assert loop.id == "loop-2026-0001"
    assert loop.current_stage == LoopStage.PLAN
    assert "bug-refresh-token-race" in loop.related
