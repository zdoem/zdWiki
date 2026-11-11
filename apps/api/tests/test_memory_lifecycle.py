import pytest
from app.models.knowledge import (
    KnowledgeObject,
    KnowledgeType,
    LifecycleStatus,
    KnowledgeStability,
    KnowledgeScope,
    VerificationStatus
)
from app.core.parser import parse_knowledge_object, serialize_knowledge_object

def test_lifecycle_enum_values():
    assert LifecycleStatus.CURRENT.value == "current"
    assert LifecycleStatus.LEGACY.value == "legacy"
    assert LifecycleStatus.DEPRECATED.value == "deprecated"
    assert LifecycleStatus.SUPERSEDED.value == "superseded"
    assert LifecycleStatus.ARCHIVED.value == "archived"
    assert LifecycleStatus.EXPERIMENTAL.value == "experimental"

def test_knowledge_object_defaults_and_backward_compatibility():
    raw_md = """---
id: concept-test-legacy-v1
type: concept
title: Legacy V1 Concept
---

Legacy body content.
"""
    obj = parse_knowledge_object(raw_md, file_path="wiki/concepts/concept-test-legacy-v1.md")
    assert obj.id == "concept-test-legacy-v1"
    assert obj.lifecycle_status == LifecycleStatus.CURRENT
    assert obj.knowledge_scope == KnowledgeScope.IMPLEMENTATION_SPECIFIC
    assert obj.knowledge_stability == KnowledgeStability.MEDIUM
    assert obj.verification_status == VerificationStatus.SOURCE_BACKED

def test_extended_metadata_serialization_roundtrip():
    obj = KnowledgeObject(
        id="pat-spring-security-test",
        type=KnowledgeType.PATTERN,
        title="Spring Security Test Pattern",
        summary="Testing extended metadata serialization.",
        lifecycle_status=LifecycleStatus.DEPRECATED,
        knowledge_scope=KnowledgeScope.VERSION_SPECIFIC,
        knowledge_stability=KnowledgeStability.LOW,
        verification_status=VerificationStatus.TESTED,
        technology={"name": "spring_security"},
        version={"introduced_in": "3.1", "deprecated_in": "5.7", "removed_in": "6.0"},
        replaced_by=["pat-spring-security-filter-chain"],
        superseded_by=["pat-spring-security-filter-chain"],
        evidence=[{
            "source_id": "source-spring-security-5-migration",
            "tier": "Tier A",
            "verification": "tested"
        }],
        body="## Body\nTest body content."
    )
    
    serialized = serialize_knowledge_object(obj)
    parsed = parse_knowledge_object(serialized)
    
    assert parsed.id == "pat-spring-security-test"
    assert parsed.lifecycle_status == LifecycleStatus.DEPRECATED
    assert parsed.knowledge_scope == KnowledgeScope.VERSION_SPECIFIC
    assert parsed.knowledge_stability == KnowledgeStability.LOW
    assert parsed.verification_status == VerificationStatus.TESTED
    assert parsed.technology["name"] == "spring_security"
    assert parsed.version["removed_in"] == "6.0"
    assert "pat-spring-security-filter-chain" in parsed.replaced_by
    assert len(parsed.evidence) == 1
