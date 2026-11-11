from enum import Enum
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import logging

from app.models.knowledge import (
    KnowledgeObject,
    KnowledgeType,
    LifecycleStatus,
    VerificationStatus,
    KnowledgeStability,
    KnowledgeScope
)
from app.core.repository import KnowledgeRepository

logger = logging.getLogger("zdwiki.compiler")

class CompilerAction(str, Enum):
    NO_CHANGE = "NO_CHANGE"
    UPDATE = "UPDATE"
    ADD_EVIDENCE = "ADD_EVIDENCE"
    CREATE_NEW_VERSION = "CREATE_NEW_VERSION"
    MARK_LEGACY = "MARK_LEGACY"
    SUPERSEDE = "SUPERSEDE"
    CREATE_CONFLICT = "CREATE_CONFLICT"
    REQUIRE_REVIEW = "REQUIRE_REVIEW"

class CompilationProposal:
    def __init__(
        self,
        action: CompilerAction,
        target_object_id: Optional[str] = None,
        new_object: Optional[KnowledgeObject] = None,
        updated_object: Optional[KnowledgeObject] = None,
        reason: str = "",
        conflict_details: Optional[Dict[str, Any]] = None
    ):
        self.action = action
        self.target_object_id = target_object_id
        self.new_object = new_object
        self.updated_object = updated_object
        self.reason = reason
        self.conflict_details = conflict_details or {}

class KnowledgeCompiler:
    """
    Relearning Engine: Compares incoming candidate knowledge with existing canonical knowledge
    and generates non-destructive proposals.
    """
    def __init__(self, repo: KnowledgeRepository):
        self.repo = repo

    def evaluate_candidate(
        self,
        candidate: KnowledgeObject,
        source_id: str,
        source_tier: str = "Tier A",
        version_context: Optional[str] = None
    ) -> CompilationProposal:
        existing = self.repo.get(candidate.id)

        # 1. New knowledge object
        if not existing:
            # Check if there's an alias or title collision
            all_objs = self.repo.list_all()
            for obj in all_objs:
                if candidate.title.lower() == obj.title.lower() or candidate.id in obj.aliases:
                    return self._compare_with_existing(obj, candidate, source_id, source_tier, version_context)
            
            # Brand new object
            candidate.sources = list(set(candidate.sources + [source_id]))
            candidate.evidence.append({
                "source_id": source_id,
                "tier": source_tier,
                "verification": "source_backed",
                "version_context": version_context
            })
            return CompilationProposal(
                action=CompilerAction.UPDATE,
                target_object_id=candidate.id,
                new_object=candidate,
                reason="New knowledge object candidate."
            )

        # 2. Existing object found -> Relearning comparison
        return self._compare_with_existing(existing, candidate, source_id, source_tier, version_context)

    def _compare_with_existing(
        self,
        existing: KnowledgeObject,
        candidate: KnowledgeObject,
        source_id: str,
        source_tier: str,
        version_context: Optional[str]
    ) -> CompilationProposal:
        # Check for deprecation / superseding evidence in candidate
        if candidate.lifecycle_status in [LifecycleStatus.DEPRECATED, LifecycleStatus.SUPERSEDED]:
            updated = existing.model_copy(deep=True)
            updated.lifecycle_status = candidate.lifecycle_status
            if candidate.replaced_by:
                updated.replaced_by = list(set(updated.replaced_by + candidate.replaced_by))
            if candidate.superseded_by:
                updated.superseded_by = list(set(updated.superseded_by + candidate.superseded_by))
            if source_id not in updated.sources:
                updated.sources.append(source_id)
            updated.evidence.append({
                "source_id": source_id,
                "tier": source_tier,
                "verification": "source_backed",
                "version_context": version_context,
                "note": f"Marked {candidate.lifecycle_status.value} via source {source_id}"
            })
            return CompilationProposal(
                action=CompilerAction.SUPERSEDE if candidate.lifecycle_status == LifecycleStatus.SUPERSEDED else CompilerAction.MARK_LEGACY,
                target_object_id=existing.id,
                updated_object=updated,
                reason=f"Candidate source indicates deprecation or replacement: {candidate.summary}"
            )

        # Check for conflicting claims
        if candidate.verification_status == VerificationStatus.DISPUTED or "conflict" in candidate.tags:
            updated = existing.model_copy(deep=True)
            updated.verification_status = VerificationStatus.DISPUTED
            if source_id not in updated.sources:
                updated.sources.append(source_id)
            updated.evidence.append({
                "source_id": source_id,
                "tier": source_tier,
                "verification": "disputed",
                "version_context": version_context,
                "note": f"Conflicting claim: {candidate.summary}"
            })
            # Append conflicting analysis note rather than overwriting
            if candidate.body and candidate.body not in updated.body:
                updated.body += f"\n\n### Disputed Claim ({source_tier} Source: `{source_id}`)\n{candidate.body}\n"
            return CompilationProposal(
                action=CompilerAction.CREATE_CONFLICT,
                target_object_id=existing.id,
                updated_object=updated,
                reason="Diverging or conflicting evidence detected; preserved both claims."
            )

        # Check if identical
        if existing.body.strip() == candidate.body.strip() and set(existing.sources) >= {source_id}:
            return CompilationProposal(
                action=CompilerAction.NO_CHANGE,
                target_object_id=existing.id,
                reason="Exact match with existing verified object."
            )

        # Add new evidence to existing object
        updated = existing.model_copy(deep=True)
        if source_id not in updated.sources:
            updated.sources.append(source_id)
        updated.evidence.append({
            "source_id": source_id,
            "tier": source_tier,
            "verification": "source_backed",
            "version_context": version_context
        })
        
        # Merge tags & domains
        updated.tags = list(set(updated.tags + candidate.tags))
        updated.domains = list(set(updated.domains + candidate.domains))
        
        return CompilationProposal(
            action=CompilerAction.ADD_EVIDENCE,
            target_object_id=existing.id,
            updated_object=updated,
            reason="Added new source provenance and evidence link to existing knowledge."
        )
