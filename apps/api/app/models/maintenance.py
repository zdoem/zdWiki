from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum

class MaintenanceSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class MaintenanceCategory(str, Enum):
    BROKEN_RELATION = "broken_relation"
    ORPHAN = "orphan"
    STALE = "stale"
    DEPRECATED = "deprecated"
    SUPERSEDED = "superseded"
    MISSING_VERSION = "missing_version"
    MISSING_PROVENANCE = "missing_provenance"
    OVERSIZED = "oversized"
    DUPLICATE = "duplicate"
    SCHEMA_ERROR = "schema_error"

class MaintenanceItem(BaseModel):
    id: str
    category: MaintenanceCategory
    severity: MaintenanceSeverity
    message: str
    file_path: Optional[str] = None
    recommendation: Optional[str] = None
    suggested_action: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)

class MaintenanceReport(BaseModel):
    total_scanned: int
    total_issues: int
    by_category: Dict[str, int]
    by_severity: Dict[str, int]
    items: List[MaintenanceItem]
    is_healthy: bool
