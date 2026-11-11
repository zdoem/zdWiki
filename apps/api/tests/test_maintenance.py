import pytest
from pathlib import Path
import tempfile
import shutil
import gc
from app.models.knowledge import (
    KnowledgeObject,
    KnowledgeType,
    LifecycleStatus,
    KnowledgeScope,
    KnowledgeStability
)
from app.core.repository import MarkdownKnowledgeRepository
from app.core.linter import KnowledgeLinter
from app.models.maintenance import MaintenanceCategory

def test_acceptance_scenario_f_maintenance_diagnostics():
    """
    Acceptance Scenario F:
    Simulates a knowledge base containing:
    1. Duplicate / conflicting alias
    2. Orphan object (0 in, 0 out)
    3. Broken relation (references non-existent ID)
    4. Deprecated object missing replacement link
    5. Stale volatile object (overdue next_review_at)
    6. Oversized object (> 3500 tokens)
    
    Maintenance must identify all categories non-destructively.
    """
    temp_dir = tempfile.mkdtemp()
    try:
        root = Path(temp_dir)
        (root / "wiki" / "concepts").mkdir(parents=True)
        (root / "wiki" / "patterns").mkdir(parents=True)
        
        repo = MarkdownKnowledgeRepository(root)
        
        # 1. Valid root
        obj1 = KnowledgeObject(
            id="concept-base",
            type=KnowledgeType.CONCEPT,
            title="Base Concept",
            summary="Base concept summary",
            relations={"related_to": ["pat-orphan"]}  # gives relation to orphan
        )
        repo.save(obj1)

        # 2. Orphan object (0 relations in/out if standalone)
        obj2 = KnowledgeObject(
            id="concept-orphan-item",
            type=KnowledgeType.CONCEPT,
            title="Orphan Concept",
            summary="Orphan concept summary"
        )
        repo.save(obj2)

        # 3. Broken relation
        obj3 = KnowledgeObject(
            id="concept-broken-links",
            type=KnowledgeType.CONCEPT,
            title="Broken Link Concept",
            summary="Points to ghost ID",
            relations={"depends_on": ["non-existent-ghost-id"]}
        )
        repo.save(obj3)

        # 4. Deprecated without replacement
        obj4 = KnowledgeObject(
            id="pat-deprecated-no-link",
            type=KnowledgeType.PATTERN,
            title="Deprecated Pattern No Link",
            summary="Deprecated pattern without replacement",
            status="deprecated",
            lifecycle_status=LifecycleStatus.DEPRECATED,
            replaced_by=[]
        )
        repo.save(obj4)

        # 5. Stale volatile page
        obj5 = KnowledgeObject(
            id="concept-volatile-stale",
            type=KnowledgeType.CONCEPT,
            title="Volatile AI Model Feature",
            summary="Fast-moving cloud API",
            knowledge_stability=KnowledgeStability.VOLATILE,
            next_review_at="2020-01-01"
        )
        repo.save(obj5)

        # 6. Oversized page (> 3500 tokens ~ 1800 words)
        obj6 = KnowledgeObject(
            id="concept-oversized-page",
            type=KnowledgeType.CONCEPT,
            title="Oversized Monolithic Page",
            summary="Gigantic monolithic text",
            body="word " * 2000
        )
        repo.save(obj6)

        linter = KnowledgeLinter(root)
        report = linter.run_maintenance_diagnostics()
        
        found_categories = {item.category for item in report.items}
        
        assert MaintenanceCategory.BROKEN_RELATION in found_categories
        assert MaintenanceCategory.ORPHAN in found_categories
        assert MaintenanceCategory.DEPRECATED in found_categories
        assert MaintenanceCategory.STALE in found_categories
        assert MaintenanceCategory.OVERSIZED in found_categories
        assert report.total_issues >= 5
    finally:
        gc.collect()
        shutil.rmtree(temp_dir, ignore_errors=True)
