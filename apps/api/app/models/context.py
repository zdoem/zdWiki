from typing import Dict, Optional, Any
from pydantic import BaseModel, Field

class ProjectContext(BaseModel):
    """
    Structured context of a project or query environment used for version-aware retrieval.
    """
    language: Dict[str, str] = Field(default_factory=dict, description="Language versions e.g. {'java': '21', 'python': '3.10'}")
    framework: Dict[str, str] = Field(default_factory=dict, description="Framework versions e.g. {'spring_boot': '3.2', 'fastapi': '0.115'}")
    database: Dict[str, str] = Field(default_factory=dict, description="Database versions e.g. {'postgresql': '16', 'sqlite': '3.45'}")
    environment: Optional[str] = Field(default=None, description="e.g. 'production', 'legacy-maintenance'")
    custom: Dict[str, Any] = Field(default_factory=dict, description="Custom domain flags or tags")
