from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.linter import KnowledgeLinter, LintReport
from app.api.deps import get_linter

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", response_model=Dict[str, Any])
def health_check():
    return {
        "status": "healthy",
        "service": "zdWiki API",
        "version": "1.0.0"
    }

@router.get("/knowledge", response_model=LintReport)
def knowledge_health(linter: KnowledgeLinter = Depends(get_linter)):
    return linter.lint_all()
