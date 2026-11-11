import sqlite3
from pathlib import Path
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from app.models.knowledge import (
    KnowledgeObject,
    KnowledgeType,
    LifecycleStatus,
    KnowledgeScope,
    KnowledgeStability,
    VerificationStatus
)
from app.core.repository import KnowledgeRepository
from app.index.schema import DDL_STATEMENTS

logger = logging.getLogger("zdwiki.index")

class SQLiteIndexEngine:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_db(self):
        with self.get_connection() as conn:
            # First create base tables if not exist
            conn.executescript(DDL_STATEMENTS)
            # Ensure columns on existing tables
            self._ensure_columns(conn)
            # Create indexes on possibly new columns
            conn.execute("CREATE INDEX IF NOT EXISTS idx_objects_lifecycle ON objects(lifecycle_status);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_objects_scope ON objects(knowledge_scope);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_objects_verification ON objects(verification_status);")

    def _ensure_columns(self, conn: sqlite3.Connection):
        """Adds missing columns dynamically if migrating an existing database instance."""
        cursor = conn.execute("PRAGMA table_info(objects)")
        existing_cols = {row["name"] for row in cursor.fetchall()}
        
        new_columns = [
            ("lifecycle_status", "TEXT DEFAULT 'current'"),
            ("knowledge_scope", "TEXT DEFAULT 'implementation_specific'"),
            ("knowledge_stability", "TEXT DEFAULT 'medium'"),
            ("verification_status", "TEXT DEFAULT 'source_backed'"),
            ("technology_name", "TEXT"),
            ("version_introduced", "TEXT"),
            ("version_deprecated", "TEXT"),
            ("version_removed", "TEXT"),
            ("version_min", "TEXT"),
            ("version_max", "TEXT"),
            ("last_reviewed_at", "TEXT"),
            ("next_review_at", "TEXT"),
            ("retrieval_count", "INTEGER DEFAULT 0"),
            ("last_retrieved_at", "TEXT"),
            ("verified_use_count", "INTEGER DEFAULT 0"),
            ("failure_use_count", "INTEGER DEFAULT 0"),
        ]
        for col_name, col_type in new_columns:
            if col_name not in existing_cols:
                try:
                    conn.execute(f"ALTER TABLE objects ADD COLUMN {col_name} {col_type}")
                except Exception as e:
                    logger.debug(f"Column {col_name} could not be added: {e}")

        # Check llm_usage table columns
        u_cursor = conn.execute("PRAGMA table_info(llm_usage)")
        u_cols = {row["name"] for row in u_cursor.fetchall()}
        for u_col in ["prompt_preview", "response_preview"]:
            if u_col not in u_cols:
                try:
                    conn.execute(f"ALTER TABLE llm_usage ADD COLUMN {u_col} TEXT")
                except Exception as e:
                    logger.debug(f"Column {u_col} could not be added to llm_usage: {e}")

    def index_object(self, obj: KnowledgeObject, conn: Optional[sqlite3.Connection] = None):
        should_close = False
        if conn is None:
            conn = self.get_connection()
            should_close = True

        try:
            with conn:
                # Extract extended fields
                lifecycle_val = obj.lifecycle_status.value if isinstance(obj.lifecycle_status, LifecycleStatus) else str(obj.lifecycle_status)
                scope_val = obj.knowledge_scope.value if isinstance(obj.knowledge_scope, KnowledgeScope) else str(obj.knowledge_scope)
                stability_val = obj.knowledge_stability.value if isinstance(obj.knowledge_stability, KnowledgeStability) else str(obj.knowledge_stability)
                verification_val = obj.verification_status.value if isinstance(obj.verification_status, VerificationStatus) else str(obj.verification_status)
                
                tech_name = None
                if obj.technology and isinstance(obj.technology, dict):
                    tech_name = obj.technology.get("name")
                
                v_intro, v_dep, v_rem, v_min, v_max = None, None, None, None, None
                if obj.version and isinstance(obj.version, dict):
                    v_intro = obj.version.get("introduced_in")
                    v_dep = obj.version.get("deprecated_in")
                    v_rem = obj.version.get("removed_in")
                    v_min = obj.version.get("min")
                    v_max = obj.version.get("max")

                # 1. Upsert objects table
                conn.execute(
                    """
                    INSERT INTO objects (
                        id, type, title, summary, status, lifecycle_status,
                        knowledge_scope, knowledge_stability, verification_status,
                        technology_name, version_introduced, version_deprecated, version_removed,
                        version_min, version_max, last_reviewed_at, next_review_at,
                        file_path, created_at, updated_at, raw_content
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        type=excluded.type,
                        title=excluded.title,
                        summary=excluded.summary,
                        status=excluded.status,
                        lifecycle_status=excluded.lifecycle_status,
                        knowledge_scope=excluded.knowledge_scope,
                        knowledge_stability=excluded.knowledge_stability,
                        verification_status=excluded.verification_status,
                        technology_name=excluded.technology_name,
                        version_introduced=excluded.version_introduced,
                        version_deprecated=excluded.version_deprecated,
                        version_removed=excluded.version_removed,
                        version_min=excluded.version_min,
                        version_max=excluded.version_max,
                        last_reviewed_at=excluded.last_reviewed_at,
                        next_review_at=excluded.next_review_at,
                        file_path=excluded.file_path,
                        created_at=excluded.created_at,
                        updated_at=excluded.updated_at,
                        raw_content=excluded.raw_content
                    """,
                    (
                        obj.id,
                        obj.type.value if isinstance(obj.type, KnowledgeType) else obj.type,
                        obj.title,
                        obj.summary,
                        obj.status,
                        lifecycle_val,
                        scope_val,
                        stability_val,
                        verification_val,
                        tech_name,
                        v_intro,
                        v_dep,
                        v_rem,
                        v_min,
                        v_max,
                        obj.last_reviewed_at,
                        obj.next_review_at,
                        obj.file_path,
                        obj.created_at,
                        obj.updated_at,
                        obj.body
                    )
                )

                # 2. Clear old relational records
                conn.execute("DELETE FROM aliases WHERE object_id = ?", (obj.id,))
                conn.execute("DELETE FROM relations WHERE source_id = ?", (obj.id,))
                conn.execute("DELETE FROM tags WHERE object_id = ?", (obj.id,))
                conn.execute("DELETE FROM domains WHERE object_id = ?", (obj.id,))
                conn.execute("DELETE FROM sources WHERE object_id = ?", (obj.id,))

                # 3. Insert aliases
                for alias in obj.aliases:
                    conn.execute("INSERT OR IGNORE INTO aliases (object_id, alias) VALUES (?, ?)", (obj.id, alias))

                # 4. Insert relations
                for rel_type, target in obj.get_all_relations():
                    conn.execute(
                        "INSERT OR IGNORE INTO relations (source_id, target_id, relation_type) VALUES (?, ?, ?)",
                        (obj.id, target, rel_type)
                    )

                # 5. Insert tags
                for tag in obj.tags:
                    conn.execute("INSERT OR IGNORE INTO tags (object_id, tag) VALUES (?, ?)", (obj.id, tag))

                # 6. Insert domains
                for domain in obj.domains:
                    conn.execute("INSERT OR IGNORE INTO domains (object_id, domain) VALUES (?, ?)", (obj.id, domain))

                # 7. Insert sources
                for source in obj.sources:
                    conn.execute("INSERT OR IGNORE INTO sources (object_id, source_id) VALUES (?, ?)", (obj.id, source))

                # 8. Rebuild FTS entry (include tech and version metadata in FTS for rich searchability)
                conn.execute("DELETE FROM objects_fts WHERE id = ?", (obj.id,))
                aliases_str = " ".join(obj.aliases)
                tags_str = " ".join(obj.tags)
                domains_str = " ".join(obj.domains)
                extra_fts = f"{tech_name or ''} {v_intro or ''} {v_dep or ''} {v_rem or ''} {lifecycle_val} {verification_val}"
                body_fts = f"{obj.body} {extra_fts}".strip()
                
                conn.execute(
                    """
                    INSERT INTO objects_fts (id, title, aliases, summary, body, tags, domains)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (obj.id, obj.title, aliases_str, obj.summary, body_fts, tags_str, domains_str)
                )

        finally:
            if should_close:
                conn.close()

    def record_retrieval(self, object_id: str):
        """Records runtime usage telemetry for an object"""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            conn.execute(
                """
                UPDATE objects
                SET retrieval_count = retrieval_count + 1, last_retrieved_at = ?
                WHERE id = ?
                """,
                (now, object_id)
            )

    def record_verification_feedback(self, object_id: str, success: bool = True):
        """Records feedback when knowledge is used in an engineering loop"""
        col = "verified_use_count" if success else "failure_use_count"
        with self.get_connection() as conn:
            conn.execute(
                f"UPDATE objects SET {col} = {col} + 1 WHERE id = ?",
                (object_id,)
            )

    def remove_object(self, object_id: str):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM objects WHERE id = ?", (object_id,))
            conn.execute("DELETE FROM objects_fts WHERE id = ?", (object_id,))

    def rebuild_index(self, repo: KnowledgeRepository) -> Dict[str, Any]:
        """
        Full rebuild of SQLite and FTS5 from Markdown files.
        Deletes all existing object index data and repopulates.
        """
        all_objects = repo.list_all()
        with self.get_connection() as conn:
            conn.execute("DELETE FROM objects")
            conn.execute("DELETE FROM objects_fts")
            conn.execute("DELETE FROM aliases")
            conn.execute("DELETE FROM relations")
            conn.execute("DELETE FROM tags")
            conn.execute("DELETE FROM domains")
            conn.execute("DELETE FROM sources")

            for obj in all_objects:
                self.index_object(obj, conn=conn)

            conn.execute(
                "INSERT INTO activities (activity_type, details) VALUES (?, ?)",
                ("rebuild_index", f"Rebuilt index for {len(all_objects)} knowledge objects")
            )

        return {
            "status": "success",
            "indexed_count": len(all_objects)
        }

    def log_activity(self, activity_type: str, target_id: Optional[str] = None, details: Optional[str] = None):
        with self.get_connection() as conn:
            conn.execute(
                "INSERT INTO activities (activity_type, target_id, details) VALUES (?, ?, ?)",
                (activity_type, target_id, details)
            )

    def log_llm_usage(
        self,
        provider: str,
        model: str,
        operation_type: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
        prompt_preview: Optional[str] = None,
        response_preview: Optional[str] = None
    ):
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO llm_usage (provider, model, operation_type, input_tokens, output_tokens, latency_ms, prompt_preview, response_preview)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (provider, model, operation_type, input_tokens, output_tokens, latency_ms, prompt_preview, response_preview)
            )
