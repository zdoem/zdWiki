import yaml
from pathlib import Path
from typing import Dict, Any, Optional
import logging
from app.models.context import ProjectContext

logger = logging.getLogger("zdwiki.ranker")

DEFAULT_RANKING_CONFIG = {
    "verified_boost": 1.30,
    "tested_boost": 1.20,
    "source_backed_boost": 1.10,
    "unverified_factor": 1.00,
    "disputed_penalty": 0.70,
    "invalidated_penalty": 0.10,
    
    "current_boost": 1.20,
    "legacy_factor": 0.85,
    "deprecated_penalty": 0.60,
    "superseded_penalty": 0.35,
    "archived_penalty": 0.15,
    "experimental_factor": 0.90,
    
    "fundamental_boost": 1.15,
    "version_specific_factor": 1.00,
    
    "version_match_boost": 1.40,
    "version_mismatch_penalty": 0.25,
    
    "telemetry_verified_boost_max": 1.25,
    "telemetry_failure_penalty_max": 0.50,
}

class ContextAwareRanker:
    def __init__(self, config_path: Optional[Path] = None):
        self.config = DEFAULT_RANKING_CONFIG.copy()
        if config_path and config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f) or {}
                    if "ranking" in data:
                        self.config.update(data["ranking"])
            except Exception as e:
                logger.warning(f"Could not load retrieval config from {config_path}: {e}")

    def compute_multiplier(
        self,
        row: Dict[str, Any],
        project_context: Optional[ProjectContext] = None
    ) -> float:
        multiplier = 1.0
        
        # 1. Verification Status Boost / Penalty
        v_status = (row.get("verification_status") or "source_backed").lower()
        if v_status == "verified":
            multiplier *= self.config.get("verified_boost", 1.30)
        elif v_status == "tested":
            multiplier *= self.config.get("tested_boost", 1.20)
        elif v_status == "source_backed":
            multiplier *= self.config.get("source_backed_boost", 1.10)
        elif v_status == "disputed":
            multiplier *= self.config.get("disputed_penalty", 0.70)
        elif v_status == "invalidated":
            multiplier *= self.config.get("invalidated_penalty", 0.10)

        # 2. Lifecycle Status Boost / Penalty
        l_status = (row.get("lifecycle_status") or row.get("status") or "current").lower()
        if l_status == "current" or l_status == "active":
            multiplier *= self.config.get("current_boost", 1.20)
        elif l_status == "legacy":
            multiplier *= self.config.get("legacy_factor", 0.85)
        elif l_status == "deprecated":
            multiplier *= self.config.get("deprecated_penalty", 0.60)
        elif l_status == "superseded":
            multiplier *= self.config.get("superseded_penalty", 0.35)
        elif l_status == "archived":
            multiplier *= self.config.get("archived_penalty", 0.15)
        elif l_status == "experimental":
            multiplier *= self.config.get("experimental_factor", 0.90)

        # 3. Knowledge Scope Boost (Fundamentals are prioritized and never penalized for file age)
        scope = (row.get("knowledge_scope") or "").lower()
        if scope == "fundamental":
            multiplier *= self.config.get("fundamental_boost", 1.15)

        # 4. Project Context / Version Compatibility Matching
        if project_context:
            v_match_factor = self._evaluate_version_match(row, project_context)
            multiplier *= v_match_factor

        # 5. Feedback Telemetry Adjustment (if verified_use_count > 0)
        verified_uses = row.get("verified_use_count") or 0
        failure_uses = row.get("failure_use_count") or 0
        if verified_uses > 0:
            boost = min(1.0 + (verified_uses * 0.05), self.config.get("telemetry_verified_boost_max", 1.25))
            multiplier *= boost
        if failure_uses > 0:
            penalty = max(1.0 - (failure_uses * 0.10), self.config.get("telemetry_failure_penalty_max", 0.50))
            multiplier *= penalty

        return round(multiplier, 4)

    def _evaluate_version_match(self, row: Dict[str, Any], ctx: ProjectContext) -> float:
        """
        Determines whether the knowledge object is compatible or mismatched with the project context.
        """
        tech_name = (row.get("technology_name") or "").lower()
        v_intro = row.get("version_introduced")
        v_dep = row.get("version_deprecated")
        v_rem = row.get("version_removed")
        v_min = row.get("version_min")
        v_max = row.get("version_max")
        title = (row.get("title") or "").lower()
        summary = (row.get("summary") or "").lower()

        # Check languages & frameworks in context
        context_versions = {}
        if ctx.language:
            for k, v in ctx.language.items():
                context_versions[k.lower()] = str(v)
        if ctx.framework:
            for k, v in ctx.framework.items():
                context_versions[k.lower()] = str(v)
        if ctx.database:
            for k, v in ctx.database.items():
                context_versions[k.lower()] = str(v)

        for target_tech, target_ver in context_versions.items():
            # Check if this object belongs to target technology
            tech_match = (
                target_tech in tech_name or
                target_tech in title or
                target_tech in summary
            )
            if not tech_match:
                continue

            target_num = self._extract_major_version(target_ver)
            if target_num is None:
                continue

            # Check if removed in or before target version
            if v_rem:
                rem_num = self._extract_major_version(v_rem)
                if rem_num is not None and target_num >= rem_num:
                    return self.config.get("version_mismatch_penalty", 0.25)

            # Check if max version exceeded
            if v_max:
                max_num = self._extract_major_version(v_max)
                if max_num is not None and target_num > max_num:
                    return self.config.get("version_mismatch_penalty", 0.25)

            # Check if introduced after target version
            if v_intro:
                intro_num = self._extract_major_version(v_intro)
                if intro_num is not None and target_num < intro_num:
                    return self.config.get("version_mismatch_penalty", 0.25)

            # Check min version requirement
            if v_min:
                min_num = self._extract_major_version(v_min)
                if min_num is not None and target_num < min_num:
                    return self.config.get("version_mismatch_penalty", 0.25)

            # Check for direct introduced_in version match
            if v_intro and self._extract_major_version(v_intro) == target_num:
                return self.config.get("version_match_boost", 1.40)

            # If target version is legacy (e.g. Java 8 / Spring 5) and object is marked legacy for it
            l_status = (row.get("lifecycle_status") or "").lower()
            if l_status == "legacy" and v_max and self._extract_major_version(v_max) >= target_num:
                return self.config.get("version_match_boost", 1.40)

            # If current and target is modern (e.g. Java 21 / Spring 6)
            if l_status == "current":
                return self.config.get("version_match_boost", 1.40)

        return 1.0

    def _extract_major_version(self, ver_str: Optional[str]) -> Optional[float]:
        if not ver_str:
            return None
        import re
        match = re.search(r"(\d+(\.\d+)?)", str(ver_str))
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return None
        return None
