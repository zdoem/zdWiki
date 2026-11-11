import pytest
from app.core.parser import parse_markdown, parse_knowledge_object, serialize_knowledge_object, ParseError, ValidationError
from app.models.knowledge import KnowledgeType

SAMPLE_MARKDOWN = """---
id: tech-fastapi
type: technology
title: FastAPI
aliases:
  - fast-api
domains:
  - software-engineering
  - backend
tags:
  - python
  - rest
summary: Fast, modern web framework for Python.
relations:
  uses:
    - tech-python
  related_to:
    - concept-rest-api
sources:
  - source-fastapi-docs
status: active
---

# FastAPI

## Mental Model
FastAPI is built on Starlette and Pydantic.
"""

def test_parse_markdown_basic():
    meta, body = parse_markdown(SAMPLE_MARKDOWN)
    assert meta["id"] == "tech-fastapi"
    assert meta["type"] == "technology"
    assert meta["title"] == "FastAPI"
    assert "FastAPI is built on Starlette" in body

def test_parse_knowledge_object():
    obj = parse_knowledge_object(SAMPLE_MARKDOWN, file_path="wiki/technologies/tech-fastapi.md")
    assert obj.id == "tech-fastapi"
    assert obj.type == KnowledgeType.TECHNOLOGY
    assert obj.title == "FastAPI"
    assert "software-engineering" in obj.domains
    assert ("uses", "tech-python") in obj.get_all_relations()

def test_roundtrip_serialization():
    obj = parse_knowledge_object(SAMPLE_MARKDOWN)
    serialized = serialize_knowledge_object(obj)
    re_parsed = parse_knowledge_object(serialized)
    
    assert re_parsed.id == obj.id
    assert re_parsed.type == obj.type
    assert re_parsed.title == obj.title
    assert re_parsed.summary == obj.summary
    assert re_parsed.domains == obj.domains
    assert re_parsed.relations == obj.relations
    assert "FastAPI is built on Starlette" in re_parsed.body

def test_missing_required_fields_fails():
    invalid_md = """---
type: concept
summary: missing id and title
---
# Invalid
"""
    with pytest.raises(ValidationError):
        parse_knowledge_object(invalid_md)
