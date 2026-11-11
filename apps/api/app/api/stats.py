from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.index.sqlite_engine import SQLiteIndexEngine
from app.api.deps import get_index_engine

router = APIRouter(prefix="/stats", tags=["Stats"])

PRICE_PER_IN_TOKEN = 0.075 / 1_000_000
PRICE_PER_OUT_TOKEN = 0.30 / 1_000_000

@router.get("", response_model=Dict[str, Any])
def get_stats(index_engine: SQLiteIndexEngine = Depends(get_index_engine)):
    conn = index_engine.get_connection()
    try:
        total_objects = conn.execute("SELECT count(*) as c FROM objects").fetchone()["c"]
        total_sources = conn.execute("SELECT count(*) as c FROM objects WHERE type = 'source'").fetchone()["c"]
        total_bugs = conn.execute("SELECT count(*) as c FROM objects WHERE type = 'bug'").fetchone()["c"]
        total_tests = conn.execute("SELECT count(*) as c FROM objects WHERE type = 'test'").fetchone()["c"]
        total_playbooks = conn.execute("SELECT count(*) as c FROM objects WHERE type = 'debug_playbook'").fetchone()["c"]
        total_decisions = conn.execute("SELECT count(*) as c FROM objects WHERE type = 'decision'").fetchone()["c"]
        total_loops = conn.execute("SELECT count(*) as c FROM objects WHERE type = 'engineering_loop'").fetchone()["c"]

        # Type breakdown
        type_cursor = conn.execute("SELECT type, count(*) as count FROM objects GROUP BY type")
        by_type = {row["type"]: row["count"] for row in type_cursor.fetchall()}

        # Domain breakdown
        domain_cursor = conn.execute("SELECT domain, count(*) as count FROM domains GROUP BY domain ORDER BY count DESC LIMIT 10")
        by_domain = {row["domain"]: row["count"] for row in domain_cursor.fetchall()}

        # Recent updates
        recent_cursor = conn.execute("SELECT id, type, title, updated_at FROM objects ORDER BY rowid DESC LIMIT 5")
        recent = [dict(row) for row in recent_cursor.fetchall()]

        # Database file size in bytes & formatted string
        db_size_bytes = 0
        db_size_formatted = "0 KB"
        if index_engine.db_path.exists():
            db_size_bytes = index_engine.db_path.stat().st_size
            if db_size_bytes < 1024:
                db_size_formatted = f"{db_size_bytes} B"
            elif db_size_bytes < 1024 * 1024:
                db_size_formatted = f"{db_size_bytes / 1024:.1f} KB"
            elif db_size_bytes < 1024 * 1024 * 1024:
                db_size_formatted = f"{db_size_bytes / (1024 * 1024):.2f} MB"
            else:
                db_size_formatted = f"{db_size_bytes / (1024 * 1024 * 1024):.2f} GB"

        return {
            "total_objects": total_objects,
            "total_sources": total_sources,
            "total_bugs": total_bugs,
            "total_tests": total_tests,
            "total_playbooks": total_playbooks,
            "total_decisions": total_decisions,
            "total_loops": total_loops,
            "by_type": by_type,
            "by_domain": by_domain,
            "recent": recent,
            "db_size_bytes": db_size_bytes,
            "db_size_formatted": db_size_formatted,
        }
    finally:
        conn.close()

@router.get("/usage", response_model=Dict[str, Any])
def get_usage_metrics(
    period: Optional[str] = Query("all", description="Period filter: all, today, 7d, 30d"),
    limit: int = Query(200, ge=1, le=500, description="Max history records to return"),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    conn = index_engine.get_connection()
    try:
        where_clause = ""
        params: List[Any] = []

        now = datetime.utcnow()
        if period == "today":
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M:%S")
            where_clause = "WHERE timestamp >= ?"
            params.append(start_dt)
        elif period == "7d":
            start_dt = (now - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
            where_clause = "WHERE timestamp >= ?"
            params.append(start_dt)
        elif period == "30d":
            start_dt = (now - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
            where_clause = "WHERE timestamp >= ?"
            params.append(start_dt)

        totals_sql = f"""
            SELECT 
                COUNT(*) as total_requests,
                COALESCE(SUM(input_tokens), 0) as total_input_tokens,
                COALESCE(SUM(output_tokens), 0) as total_output_tokens,
                COALESCE(AVG(latency_ms), 0.0) as avg_latency_ms
            FROM llm_usage
            {where_clause}
        """
        totals_row = conn.execute(totals_sql, params).fetchone()

        total_reqs = totals_row["total_requests"]
        total_in = totals_row["total_input_tokens"]
        total_out = totals_row["total_output_tokens"]
        avg_lat = round(float(totals_row["avg_latency_ms"]), 2)

        est_cost_usd = round((total_in * PRICE_PER_IN_TOKEN) + (total_out * PRICE_PER_OUT_TOKEN), 6)

        # By operation
        op_sql = f"SELECT operation_type, COUNT(*) as count, SUM(input_tokens + output_tokens) as tokens FROM llm_usage {where_clause} GROUP BY operation_type"
        op_cursor = conn.execute(op_sql, params)
        by_operation = {row["operation_type"]: {"count": row["count"], "tokens": row["tokens"]} for row in op_cursor.fetchall()}

        # By model
        model_sql = f"SELECT model, COUNT(*) as count, SUM(input_tokens + output_tokens) as tokens FROM llm_usage {where_clause} GROUP BY model"
        model_cursor = conn.execute(model_sql, params)
        by_model = {row["model"]: {"count": row["count"], "tokens": row["tokens"]} for row in model_cursor.fetchall()}

        # Recent records with previews
        history_sql = f"""
            SELECT id, provider, model, operation_type, input_tokens, output_tokens, latency_ms, 
                   prompt_preview, response_preview, timestamp
            FROM llm_usage
            {where_clause}
            ORDER BY id DESC
            LIMIT ?
        """
        history_cursor = conn.execute(history_sql, params + [limit])
        history = []
        for r in history_cursor.fetchall():
            row_dict = dict(r)
            r_in = row_dict["input_tokens"] or 0
            r_out = row_dict["output_tokens"] or 0
            cost = round((r_in * PRICE_PER_IN_TOKEN) + (r_out * PRICE_PER_OUT_TOKEN), 6)
            row_dict["cost_usd"] = cost
            row_dict["latency_ms"] = round(row_dict["latency_ms"] or 0.0, 1)
            row_dict["prompt_preview"] = row_dict.get("prompt_preview") or "Ask Question query"
            row_dict["response_preview"] = row_dict.get("response_preview") or "Generated response from canonical objects"
            history.append(row_dict)

        return {
            "period": period,
            "total_requests": total_reqs,
            "total_input_tokens": total_in,
            "total_output_tokens": total_out,
            "total_tokens": total_in + total_out,
            "avg_latency_ms": avg_lat,
            "estimated_cost_usd": est_cost_usd,
            "price_rates": {
                "input_per_1m": 0.075,
                "output_per_1m": 0.30
            },
            "by_operation": by_operation,
            "by_model": by_model,
            "history": history
        }
    finally:
        conn.close()
