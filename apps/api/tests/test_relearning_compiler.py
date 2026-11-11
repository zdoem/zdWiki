import pytest
from pathlib import Path
from app.models.knowledge import (
    KnowledgeObject,
    KnowledgeType,
    LifecycleStatus,
    VerificationStatus
)
from app.core.repository import MarkdownKnowledgeRepository
from app.ingestion.compiler import KnowledgeCompiler, CompilerAction
from app.config import settings

@pytest.fixture
def compiler():
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    return KnowledgeCompiler(repo)

def test_acceptance_scenario_d_relearning_supersede(compiler):
    """
    Acceptance Scenario D:
    Existing pattern updated by a new source stating it is deprecated/superseded.
    Compiler must generate SUPERSEDE action, preserve history, and link replacement.
    """
    candidate_deprecation = KnowledgeObject(
        id="pat-spring-security-adapter",
        type=KnowledgeType.PATTERN,
        title="WebSecurityConfigurerAdapter Pattern (Legacy Spring Security)",
        summary="Deprecation confirmed in Spring Security 5.7.",
        lifecycle_status=LifecycleStatus.DEPRECATED,
        replaced_by=["pat-spring-security-filter-chain"],
        sources=["source-spring-security-5-migration"]
    )
    
    proposal = compiler.evaluate_candidate(
        candidate=candidate_deprecation,
        source_id="source-spring-security-5-migration",
        source_tier="Tier A"
    )
    
    assert proposal.action in [CompilerAction.MARK_LEGACY, CompilerAction.SUPERSEDE]
    assert proposal.updated_object is not None
    assert proposal.updated_object.lifecycle_status == LifecycleStatus.DEPRECATED
    assert "pat-spring-security-filter-chain" in proposal.updated_object.replaced_by
    assert len(proposal.updated_object.evidence) > 0

def test_relearning_conflict_preservation(compiler):
    """
    When conflicting claims arrive, both claims are preserved and verification_status is set to disputed.
    """
    candidate_conflict = KnowledgeObject(
        id="concept-acid-transactions",
        type=KnowledgeType.CONCEPT,
        title="ACID Transaction Principles",
        summary="Conflicting performance benchmark for isolation levels.",
        verification_status=VerificationStatus.DISPUTED,
        tags=["conflict", "benchmark"],
        body="Contradicting claim regarding Serializable throughput."
    )
    
    proposal = compiler.evaluate_candidate(
        candidate=candidate_conflict,
        source_id="source-benchmark-disputed-001",
        source_tier="Tier C"
    )
    
    assert proposal.action == CompilerAction.CREATE_CONFLICT
    assert proposal.updated_object.verification_status == VerificationStatus.DISPUTED
    assert "Disputed Claim" in proposal.updated_object.body
