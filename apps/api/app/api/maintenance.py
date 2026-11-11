from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.config import settings
from app.core.linter import KnowledgeLinter
from app.models.maintenance import MaintenanceReport

router = APIRouter(prefix="/maintenance", tags=["Knowledge Maintenance"])

@router.get("/analyze", response_model=MaintenanceReport)
def analyze_knowledge_base():
    """
    Runs diagnostic maintenance checks across the entire knowledge base.
    Identifies stale, duplicate, orphan, oversized, and deprecated knowledge.
    """
    linter = KnowledgeLinter(settings.knowledge_dir)
    return linter.run_maintenance_diagnostics()
