from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import re
import sqlite3
from pathlib import Path

from app.models.knowledge import (
    KnowledgeType,
    LifecycleStatus,
    KnowledgeScope,
    KnowledgeStability,
    VerificationStatus
)
from app.models.context import ProjectContext
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.ranker import ContextAwareRanker

class SearchResultItem(BaseModel):
    id: str
    type: KnowledgeType
    title: str
    summary: str
    domains: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    score: float = 0.0
    bm25_score: float = 0.0
    ranking_multiplier: float = 1.0
    lifecycle_status: LifecycleStatus = LifecycleStatus.CURRENT
    knowledge_scope: KnowledgeScope = KnowledgeScope.IMPLEMENTATION_SPECIFIC
    verification_status: VerificationStatus = VerificationStatus.SOURCE_BACKED
    matched_fields: List[str] = Field(default_factory=list)
    file_path: Optional[str] = None
    related_ids: List[str] = Field(default_factory=list)

class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResultItem]

class SearchEngine(ABC):
    @abstractmethod
    def search(
        self,
        query: str,
        type_filter: Optional[KnowledgeType] = None,
        domain_filter: Optional[str] = None,
        tag_filter: Optional[str] = None,
        project_context: Optional[ProjectContext] = None,
        limit: int = 20,
        expand_relations: bool = True
    ) -> SearchResponse:
        pass

def sanitize_fts_query(query: str) -> str:
    """Sanitizes user input into valid SQLite FTS5 query terms"""
    cleaned = re.sub(r"[^\w\s-]", " ", query).strip()
    tokens = cleaned.split()
    if not tokens:
        return ""
    # Search each token with prefix match
    fts_tokens = [f'"{tok}"*' if not tok.endswith("*") else f'"{tok}"' for tok in tokens]
    return " OR ".join(fts_tokens)

class SQLiteFTSSearchEngine(SearchEngine):
    def __init__(self, index_engine: SQLiteIndexEngine, config_path: Optional[Path] = None):
        self.index_engine = index_engine
        self.ranker = ContextAwareRanker(config_path or Path("config/retrieval.yaml"))

    def search(
        self,
        query: str,
        type_filter: Optional[KnowledgeType] = None,
        domain_filter: Optional[str] = None,
        tag_filter: Optional[str] = None,
        project_context: Optional[ProjectContext] = None,
        limit: int = 20,
        expand_relations: bool = True
    ) -> SearchResponse:
        conn = self.index_engine.get_connection()
        try:
            fts_query = sanitize_fts_query(query)
            
            # If query is empty, list recent / filtered objects
            if not fts_query:
                return self._fallback_list(conn, type_filter, domain_filter, tag_filter, project_context, limit)

            # Columns in objects_fts: title(0), aliases(1), summary(2), body(3), tags(4), domains(5)
            # Weights: title (10.0), summary (5.0), tags (4.0), aliases (4.0), body (2.0), domains (2.0)
            base_sql = """
                SELECT 
                    o.id,
                    o.type,
                    o.title,
                    o.summary,
                    o.status,
                    o.lifecycle_status,
                    o.knowledge_scope,
                    o.knowledge_stability,
                    o.verification_status,
                    o.technology_name,
                    o.version_introduced,
                    o.version_deprecated,
                    o.version_removed,
                    o.version_min,
                    o.version_max,
                    o.verified_use_count,
                    o.failure_use_count,
                    o.file_path,
                    bm25(objects_fts, 10.0, 4.0, 5.0, 2.0, 4.0, 2.0) as rank
                FROM objects_fts
                JOIN objects o ON objects_fts.id = o.id
                WHERE objects_fts MATCH ?
            """
            params: List[Any] = [fts_query]

            if type_filter:
                base_sql += " AND o.type = ?"
                params.append(type_filter.value if isinstance(type_filter, KnowledgeType) else type_filter)
            if domain_filter:
                base_sql += " AND EXISTS (SELECT 1 FROM domains d WHERE d.object_id = o.id AND d.domain = ?)"
                params.append(domain_filter)
            if tag_filter:
                base_sql += " AND EXISTS (SELECT 1 FROM tags t WHERE t.object_id = o.id AND t.tag = ?)"
                params.append(tag_filter)

            # Fetch candidate pool (up to 40 candidates for context-aware re-ranking)
            candidate_limit = max(limit * 2, 40)
            base_sql += " ORDER BY rank ASC LIMIT ?"
            params.append(candidate_limit)

            cursor = conn.execute(base_sql, params)
            rows = cursor.fetchall()

            # 2. Enrich results and compute context-aware composite score
            scored_candidates = []
            for row in rows:
                row_dict = dict(row)
                obj_id = row_dict["id"]
                
                # Fetch domains
                dom_cursor = conn.execute("SELECT domain FROM domains WHERE object_id = ?", (obj_id,))
                domains = [r["domain"] for r in dom_cursor.fetchall()]
                
                # Fetch tags
                tag_cursor = conn.execute("SELECT tag FROM tags WHERE object_id = ?", (obj_id,))
                tags = [r["tag"] for r in tag_cursor.fetchall()]

                # Fetch relations (outbound + inbound)
                related_ids = []
                if expand_relations:
                    rel_cursor = conn.execute(
                        "SELECT target_id FROM relations WHERE source_id = ? UNION SELECT source_id FROM relations WHERE target_id = ?",
                        (obj_id, obj_id)
                    )
                    related_ids = [r[0] for r in rel_cursor.fetchall()]

                # Convert BM25 rank (negative float) to positive score
                raw_rank = float(row["rank"])
                bm25_score = round(max(-raw_rank, 0.1), 3)

                # Compute ranking multiplier from lifecycle, verification, scope, project context
                multiplier = self.ranker.compute_multiplier(row_dict, project_context)
                composite_score = round(bm25_score * multiplier, 3)

                # Safe normalization of enum fields
                l_status = LifecycleStatus.CURRENT
                try:
                    l_status = LifecycleStatus(row_dict.get("lifecycle_status") or "current")
                except ValueError:
                    pass

                k_scope = KnowledgeScope.IMPLEMENTATION_SPECIFIC
                try:
                    k_scope = KnowledgeScope(row_dict.get("knowledge_scope") or "implementation_specific")
                except ValueError:
                    pass

                v_status = VerificationStatus.SOURCE_BACKED
                try:
                    v_status = VerificationStatus(row_dict.get("verification_status") or "source_backed")
                except ValueError:
                    pass

                item = SearchResultItem(
                    id=obj_id,
                    type=KnowledgeType(row_dict["type"]),
                    title=row_dict["title"],
                    summary=row_dict["summary"] or "",
                    domains=domains,
                    tags=tags,
                    score=composite_score,
                    bm25_score=bm25_score,
                    ranking_multiplier=multiplier,
                    lifecycle_status=l_status,
                    knowledge_scope=k_scope,
                    verification_status=v_status,
                    matched_fields=["fts_match"],
                    file_path=row_dict["file_path"],
                    related_ids=related_ids
                )
                scored_candidates.append(item)

            # Re-rank by composite score descending
            scored_candidates.sort(key=lambda x: x.score, reverse=True)
            top_results = scored_candidates[:limit]

            # Record telemetry for retrieved objects
            for r in top_results:
                self.index_engine.record_retrieval(r.id)

            return SearchResponse(
                query=query,
                total=len(top_results),
                results=top_results
            )
        finally:
            conn.close()

    def _fallback_list(
        self,
        conn: sqlite3.Connection,
        type_filter: Optional[KnowledgeType],
        domain_filter: Optional[str],
        tag_filter: Optional[str],
        project_context: Optional[ProjectContext],
        limit: int
    ) -> SearchResponse:
        sql = """
            SELECT 
                id, type, title, summary, status, lifecycle_status,
                knowledge_scope, knowledge_stability, verification_status,
                technology_name, version_introduced, version_deprecated,
                version_removed, version_min, version_max,
                verified_use_count, failure_use_count, file_path 
            FROM objects WHERE 1=1
        """
        params: List[Any] = []

        if type_filter:
            sql += " AND type = ?"
            params.append(type_filter.value if isinstance(type_filter, KnowledgeType) else type_filter)
        if domain_filter:
            sql += " AND EXISTS (SELECT 1 FROM domains d WHERE d.object_id = objects.id AND d.domain = ?)"
            params.append(domain_filter)
        if tag_filter:
            sql += " AND EXISTS (SELECT 1 FROM tags t WHERE t.object_id = objects.id AND t.tag = ?)"
            params.append(tag_filter)

        sql += " ORDER BY id ASC LIMIT ?"
        params.append(limit)

        rows = conn.execute(sql, params).fetchall()
        results: List[SearchResultItem] = []
        for row in rows:
            row_dict = dict(row)
            obj_id = row_dict["id"]
            dom_cursor = conn.execute("SELECT domain FROM domains WHERE object_id = ?", (obj_id,))
            domains = [r["domain"] for r in dom_cursor.fetchall()]
            tag_cursor = conn.execute("SELECT tag FROM tags WHERE object_id = ?", (obj_id,))
            tags = [r["tag"] for r in tag_cursor.fetchall()]

            multiplier = self.ranker.compute_multiplier(row_dict, project_context)

            l_status = LifecycleStatus.CURRENT
            try:
                l_status = LifecycleStatus(row_dict.get("lifecycle_status") or "current")
            except ValueError:
                pass

            k_scope = KnowledgeScope.IMPLEMENTATION_SPECIFIC
            try:
                k_scope = KnowledgeScope(row_dict.get("knowledge_scope") or "implementation_specific")
            except ValueError:
                pass

            v_status = VerificationStatus.SOURCE_BACKED
            try:
                v_status = VerificationStatus(row_dict.get("verification_status") or "source_backed")
            except ValueError:
                pass

            results.append(
                SearchResultItem(
                    id=obj_id,
                    type=KnowledgeType(row_dict["type"]),
                    title=row_dict["title"],
                    summary=row_dict["summary"] or "",
                    domains=domains,
                    tags=tags,
                    score=multiplier,
                    bm25_score=1.0,
                    ranking_multiplier=multiplier,
                    lifecycle_status=l_status,
                    knowledge_scope=k_scope,
                    verification_status=v_status,
                    matched_fields=["all"],
                    file_path=row_dict["file_path"],
                    related_ids=[]
                )
            )

        results.sort(key=lambda x: x.score, reverse=True)
        return SearchResponse(query="", total=len(results), results=results)
