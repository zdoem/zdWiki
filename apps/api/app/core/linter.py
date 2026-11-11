from pathlib import Path
from typing import List, Dict, Set, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.knowledge import (
    KnowledgeObject,
    KnowledgeType,
    LifecycleStatus,
    KnowledgeScope,
    KnowledgeStability,
    VerificationStatus,
    TYPE_DIR_MAP
)
from app.models.maintenance import (
    MaintenanceReport,
    MaintenanceItem,
    MaintenanceCategory,
    MaintenanceSeverity
)
from app.core.parser import parse_knowledge_object, ParseError, ValidationError

class LintIssue(BaseModel):
    severity: str  # "error", "warning"
    rule: str
    message: str
    file_path: str
    object_id: str = ""

class LintReport(BaseModel):
    total_files: int = 0
    total_objects: int = 0
    errors: List[LintIssue] = Field(default_factory=list)
    warnings: List[LintIssue] = Field(default_factory=list)
    is_healthy: bool = True

class KnowledgeLinter:
    def __init__(self, root_dir: Path):
        self.root_dir = Path(root_dir)

    def lint_all(self) -> LintReport:
        report = LintReport()
        files = list(self.root_dir.glob("**/*.md"))
        
        objects_by_id: Dict[str, KnowledgeObject] = {}
        files_by_id: Dict[str, List[str]] = {}
        parsed_objects: List[KnowledgeObject] = []
        
        # 1. Parse & Check Frontmatter
        for f in files:
            rel = str(f.relative_to(self.root_dir)).replace("\\", "/")
            if not (rel.startswith("wiki/") or rel.startswith("sources/")):
                continue
            
            report.total_files += 1
            content = f.read_text(encoding="utf-8")
            try:
                obj = parse_knowledge_object(content, file_path=rel)
                report.total_objects += 1
                parsed_objects.append(obj)
                
                # Check empty summary
                if not obj.summary or not obj.summary.strip():
                    report.warnings.append(LintIssue(
                        severity="warning",
                        rule="empty-summary",
                        message="Summary is empty or whitespace only",
                        file_path=rel,
                        object_id=obj.id
                    ))
                
                # Check duplicate IDs
                if obj.id in files_by_id:
                    files_by_id[obj.id].append(rel)
                    report.errors.append(LintIssue(
                        severity="error",
                        rule="duplicate-id",
                        message=f"Duplicate ID '{obj.id}' found in multiple files: {files_by_id[obj.id]}",
                        file_path=rel,
                        object_id=obj.id
                    ))
                else:
                    files_by_id[obj.id] = [rel]
                    objects_by_id[obj.id] = obj

            except (ParseError, ValidationError) as e:
                report.errors.append(LintIssue(
                    severity="error",
                    rule="invalid-frontmatter",
                    message=str(e),
                    file_path=rel
                ))
            except Exception as e:
                report.errors.append(LintIssue(
                    severity="error",
                    rule="parse-exception",
                    message=f"Unexpected error: {e}",
                    file_path=rel
                ))

        # 2. Check Relations & Orphans
        all_ids: Set[str] = set(objects_by_id.keys())
        inbound_relations: Dict[str, int] = {k: 0 for k in all_ids}

        for obj in parsed_objects:
            outbound_count = 0
            for rel_type, target in obj.get_all_relations():
                outbound_count += 1
                if target not in all_ids:
                    report.errors.append(LintIssue(
                        severity="error",
                        rule="broken-relation",
                        message=f"Relation '{rel_type}' references non-existent object ID '{target}'",
                        file_path=obj.file_path or "",
                        object_id=obj.id
                    ))
                else:
                    inbound_relations[target] = inbound_relations.get(target, 0) + 1

        # Check for orphan objects
        for obj in parsed_objects:
            if obj.type not in (KnowledgeType.SOURCE, KnowledgeType.ENGINEERING_LOOP):
                outbound_count = len(obj.get_all_relations())
                inbound_count = inbound_relations.get(obj.id, 0)
                if outbound_count == 0 and inbound_count == 0:
                    report.warnings.append(LintIssue(
                        severity="warning",
                        rule="orphan-object",
                        message=f"Orphan knowledge object: '{obj.id}' has no incoming or outgoing relations",
                        file_path=obj.file_path or "",
                        object_id=obj.id
                    ))

        report.is_healthy = len(report.errors) == 0
        return report

    def run_maintenance_diagnostics(self) -> MaintenanceReport:
        """
        Deep diagnostic analysis across the entire knowledge base for maintenance CLI/UI.
        """
        lint = self.lint_all()
        items: List[MaintenanceItem] = []
        
        parsed_objects: List[KnowledgeObject] = []
        files = list(self.root_dir.glob("**/*.md"))
        for f in files:
            rel = str(f.relative_to(self.root_dir)).replace("\\", "/")
            if not (rel.startswith("wiki/") or rel.startswith("sources/")):
                continue
            try:
                content = f.read_text(encoding="utf-8")
                obj = parse_knowledge_object(content, file_path=rel)
                parsed_objects.append(obj)
            except Exception:
                pass

        # 1. Convert lint issues to maintenance items
        for err in lint.errors:
            cat = MaintenanceCategory.SCHEMA_ERROR
            if err.rule == "broken-relation":
                cat = MaintenanceCategory.BROKEN_RELATION
            elif err.rule == "duplicate-id":
                cat = MaintenanceCategory.DUPLICATE
            items.append(MaintenanceItem(
                id=err.object_id or "unknown",
                category=cat,
                severity=MaintenanceSeverity.CRITICAL,
                message=err.message,
                file_path=err.file_path,
                recommendation="Fix schema or relation reference."
            ))

        for warn in lint.warnings:
            cat = MaintenanceCategory.ORPHAN if warn.rule == "orphan-object" else MaintenanceCategory.SCHEMA_ERROR
            items.append(MaintenanceItem(
                id=warn.object_id or "unknown",
                category=cat,
                severity=MaintenanceSeverity.WARNING,
                message=warn.message,
                file_path=warn.file_path,
                recommendation="Connect with typed relations or add summary."
            ))

        # 2. Check for Deprecated / Superseded without Replacement Link
        for obj in parsed_objects:
            if obj.lifecycle_status in [LifecycleStatus.DEPRECATED, LifecycleStatus.SUPERSEDED]:
                if not obj.replaced_by and not obj.superseded_by:
                    items.append(MaintenanceItem(
                        id=obj.id,
                        category=MaintenanceCategory.DEPRECATED,
                        severity=MaintenanceSeverity.WARNING,
                        message=f"Object '{obj.id}' is marked {obj.lifecycle_status.value} but lacks replaced_by/superseded_by links",
                        file_path=obj.file_path,
                        recommendation="Add 'replaced_by: [modern-object-id]' in frontmatter.",
                        suggested_action="LINK_REPLACEMENT"
                    ))

        # 3. Check for Missing Version Metadata on Version-Specific Objects
        for obj in parsed_objects:
            if obj.knowledge_scope == KnowledgeScope.VERSION_SPECIFIC and not obj.version:
                items.append(MaintenanceItem(
                    id=obj.id,
                    category=MaintenanceCategory.MISSING_VERSION,
                    severity=MaintenanceSeverity.WARNING,
                    message=f"Object '{obj.id}' has scope 'version_specific' but missing version metadata",
                    file_path=obj.file_path,
                    recommendation="Add 'version: {introduced_in: ...}' to specify applicability.",
                    suggested_action="ADD_VERSION_METADATA"
                ))

        # 4. Check for Oversized Pages (> 3500 tokens)
        for obj in parsed_objects:
            tokens_est = len(obj.body.split()) * 2
            if tokens_est > 3500:
                items.append(MaintenanceItem(
                    id=obj.id,
                    category=MaintenanceCategory.OVERSIZED,
                    severity=MaintenanceSeverity.WARNING,
                    message=f"Oversized page: '{obj.id}' has ~{tokens_est} tokens (threshold: 3,500)",
                    file_path=obj.file_path,
                    recommendation="Decompose into focused sub-concepts using relations.",
                    suggested_action="SPLIT_PAGE"
                ))

        # 5. Check for Stale Volatile Pages (past next_review_at)
        now_str = datetime.utcnow().strftime("%Y-%m-%d")
        for obj in parsed_objects:
            if obj.knowledge_stability == KnowledgeStability.VOLATILE:
                if obj.next_review_at and obj.next_review_at < now_str:
                    items.append(MaintenanceItem(
                        id=obj.id,
                        category=MaintenanceCategory.STALE,
                        severity=MaintenanceSeverity.WARNING,
                        message=f"Volatile knowledge '{obj.id}' overdue for review (next_review_at: {obj.next_review_at})",
                        file_path=obj.file_path,
                        recommendation="Re-verify against current vendor documentation.",
                        suggested_action="REVIEW_FRESHNESS"
                    ))

        # 6. Check for Missing Provenance on non-fundamental objects
        for obj in parsed_objects:
            if obj.type not in (KnowledgeType.SOURCE, KnowledgeType.ENGINEERING_LOOP):
                if obj.knowledge_scope != KnowledgeScope.FUNDAMENTAL and not obj.sources and not obj.evidence:
                    items.append(MaintenanceItem(
                        id=obj.id,
                        category=MaintenanceCategory.MISSING_PROVENANCE,
                        severity=MaintenanceSeverity.INFO,
                        message=f"Object '{obj.id}' has no linked source provenance or evidence items",
                        file_path=obj.file_path,
                        recommendation="Link raw immutable source in 'sources:' or 'evidence:'.",
                        suggested_action="ADD_PROVENANCE"
                    ))

        by_cat: Dict[str, int] = {}
        for it in items:
            by_cat[it.category.value] = by_cat.get(it.category.value, 0) + 1

        by_sev: Dict[str, int] = {}
        for it in items:
            by_sev[it.severity.value] = by_sev.get(it.severity.value, 0) + 1

        return MaintenanceReport(
            total_scanned=len(parsed_objects),
            total_issues=len(items),
            by_category=by_cat,
            by_severity=by_sev,
            items=items,
            is_healthy=(by_sev.get("critical", 0) == 0)
        )
