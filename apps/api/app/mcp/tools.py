import json
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.config import settings
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.engine import SQLiteFTSSearchEngine
from app.core.linter import KnowledgeLinter
from app.models.context import ProjectContext
from app.models.knowledge import KnowledgeObject, KnowledgeType, LifecycleStatus
from app.models.loop import EngineeringLoop, LoopStage, StageRecord
from app.cli.context_loader import load_project_context, find_project_file
from app.mcp.protocol import ToolDefinition, CallToolResult, ContentItem

def _create_text_result(data: Any, is_error: bool = False) -> CallToolResult:
    text_content = json.dumps(data, indent=2, default=str) if isinstance(data, (dict, list)) else str(data)
    return CallToolResult(
        content=[ContentItem(type="text", text=text_content)],
        isError=is_error
    )

# -------------------------------------------------------------
# Tool Definitions Catalog
# -------------------------------------------------------------
TOOL_DEFINITIONS: List[ToolDefinition] = [
    ToolDefinition(
        name="zdwiki_status",
        description="Returns concise system, index, and knowledge status for zdWiki. Never exposes secrets.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_file": {"type": "string", "description": "Optional explicit path to .zdwiki/project.yaml"}
            }
        }
    ),
    ToolDefinition(
        name="search_knowledge",
        description="Searches ranked knowledge objects using SQLite FTS5 BM25 with version-aware ranking without invoking an LLM.",
        inputSchema={
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Search terms or phrase"},
                "domain": {"type": "string", "description": "Optional domain filter (e.g. 'security', 'backend')"},
                "type": {"type": "string", "description": "Optional type filter (e.g. 'concept', 'pattern', 'test', 'bug')"},
                "status": {"type": "string", "description": "Lifecycle status (e.g. 'current', 'legacy')"},
                "java": {"type": "string", "description": "Target Java version constraint (e.g. '21')"},
                "spring": {"type": "string", "description": "Target Spring version constraint (e.g. '6')"},
                "project_file": {"type": "string", "description": "Optional path to .zdwiki/project.yaml"},
                "top": {"type": "integer", "description": "Max results to return", "default": 10},
                "explain_ranking": {"type": "boolean", "description": "Include BM25 score and ranking multiplier breakdown", "default": False}
            }
        }
    ),
    ToolDefinition(
        name="get_knowledge",
        description="Retrieves a canonical knowledge object by ID with structured metadata and Markdown body.",
        inputSchema={
            "type": "object",
            "required": ["id"],
            "properties": {
                "id": {"type": "string", "description": "Knowledge Object ID (e.g. 'concept-jwt-auth', 'pat-idempotency-key')"}
            }
        }
    ),
    ToolDefinition(
        name="get_context",
        description="CRITICAL AGENT TOOL: Retrieves a bounded knowledge context bundle strictly adhering to token budgets for AI coding agents.",
        inputSchema={
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Engineering task, implementation goal, or bug description"},
                "max_context_tokens": {"type": "integer", "description": "Maximum token budget for context bundle", "default": 6000},
                "project_file": {"type": "string", "description": "Optional path to .zdwiki/project.yaml"},
                "domains": {"type": "array", "items": {"type": "string"}, "description": "Optional domain filter list"},
                "types": {"type": "array", "items": {"type": "string"}, "description": "Optional type filter list"}
            }
        }
    ),
    ToolDefinition(
        name="get_graph",
        description="Explores the relationship graph neighborhood around a center knowledge entity.",
        inputSchema={
            "type": "object",
            "required": ["id"],
            "properties": {
                "id": {"type": "string", "description": "Center Knowledge Object ID"},
                "hops": {"type": "integer", "description": "Neighborhood expansion depth (1-3)", "default": 2},
                "relation": {"type": "string", "description": "Optional relation filter"}
            }
        }
    ),
    ToolDefinition(
        name="list_sources",
        description="Lists registered raw immutable sources in the knowledge base.",
        inputSchema={
            "type": "object",
            "properties": {}
        }
    ),
    ToolDefinition(
        name="get_source",
        description="Retrieves metadata, provenance, and content for a registered source object.",
        inputSchema={
            "type": "object",
            "required": ["id"],
            "properties": {
                "id": {"type": "string", "description": "Source ID (e.g. 'source-rfc-7519')"}
            }
        }
    ),
    ToolDefinition(
        name="find_tests",
        description="Finds verified test specifications and regression test cases for a query.",
        inputSchema={
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Search term for test cases"},
                "domain": {"type": "string", "description": "Optional domain filter"},
                "top": {"type": "integer", "description": "Max results", "default": 5}
            }
        }
    ),
    ToolDefinition(
        name="find_bugs",
        description="Finds documented bugs and known failure modes for a query.",
        inputSchema={
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Search term for bugs and failure modes"},
                "domain": {"type": "string", "description": "Optional domain filter"},
                "top": {"type": "integer", "description": "Max results", "default": 5}
            }
        }
    ),
    ToolDefinition(
        name="find_debug_playbooks",
        description="Finds step-by-step diagnostic and debugging playbooks.",
        inputSchema={
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Diagnostic topic or error description"},
                "domain": {"type": "string", "description": "Optional domain filter"},
                "top": {"type": "integer", "description": "Max results", "default": 5}
            }
        }
    ),
    ToolDefinition(
        name="list_loops",
        description="Lists all active and archived engineering loops.",
        inputSchema={
            "type": "object",
            "properties": {}
        }
    ),
    ToolDefinition(
        name="start_loop",
        description="Initializes a new Engineering Loop to track disciplined problem resolution.",
        inputSchema={
            "type": "object",
            "required": ["title", "goal"],
            "properties": {
                "title": {"type": "string", "description": "Title of the engineering task"},
                "goal": {"type": "string", "description": "Exact objective and boundaries"},
                "related": {"type": "array", "items": {"type": "string"}, "description": "Related bug, test, or playbook IDs"}
            }
        }
    ),
    ToolDefinition(
        name="get_loop",
        description="Retrieves current state and stage transition history of an engineering loop.",
        inputSchema={
            "type": "object",
            "required": ["id"],
            "properties": {
                "id": {"type": "string", "description": "Loop ID (e.g. 'loop-20260818-025117')"}
            }
        }
    ),
    ToolDefinition(
        name="update_loop",
        description="Records an engineering loop stage transition with verifiable evidence.",
        inputSchema={
            "type": "object",
            "required": ["id", "stage", "status"],
            "properties": {
                "id": {"type": "string", "description": "Loop ID"},
                "stage": {"type": "string", "description": "Stage (plan, implement, test, diagnose, fix, verify, learn)"},
                "status": {"type": "string", "description": "Stage status (completed, failed, in_progress)"},
                "note": {"type": "string", "description": "Stage explanation note"},
                "evidence": {"type": "string", "description": "Test command or verifiable log evidence"}
            }
        }
    ),
    ToolDefinition(
        name="record_test_result",
        description="Convenience tool to record test execution evidence on an engineering loop.",
        inputSchema={
            "type": "object",
            "required": ["loop_id", "result", "command"],
            "properties": {
                "loop_id": {"type": "string", "description": "Loop ID"},
                "result": {"type": "string", "description": "Test result ('passed', 'failed', 'error')"},
                "command": {"type": "string", "description": "Test command executed"},
                "summary": {"type": "string", "description": "Brief summary of test findings"},
                "evidence": {"type": "string", "description": "Log or assertion details"}
            }
        }
    ),
    ToolDefinition(
        name="record_verification",
        description="Records formal verification evidence confirming all acceptance criteria are met.",
        inputSchema={
            "type": "object",
            "required": ["loop_id", "acceptance_criteria", "evidence"],
            "properties": {
                "loop_id": {"type": "string", "description": "Loop ID"},
                "acceptance_criteria": {"type": "string", "description": "Summary of fulfilled criteria"},
                "evidence": {"type": "string", "description": "Proof of verification (test pass report, curl verification, etc.)"},
                "verified_by": {"type": "string", "description": "Agent or developer identifier", "default": "agent"}
            }
        }
    ),
    ToolDefinition(
        name="propose_lesson",
        description="Synthesizes a structured draft knowledge object from a verified Engineering Loop (non-destructive proposal).",
        inputSchema={
            "type": "object",
            "required": ["loop_id", "title", "summary"],
            "properties": {
                "loop_id": {"type": "string", "description": "Engineering Loop ID"},
                "title": {"type": "string", "description": "Title for proposed knowledge lesson"},
                "summary": {"type": "string", "description": "Concise summary of verified resolution"},
                "type": {"type": "string", "description": "Lesson type: 'debug_playbook', 'test', 'bug', 'pattern', 'decision'", "default": "debug_playbook"},
                "domain": {"type": "string", "description": "Primary domain", "default": "backend"}
            }
        }
    ),
    ToolDefinition(
        name="knowledge_health",
        description="Performs read-only diagnostic maintenance analysis across knowledge objects.",
        inputSchema={
            "type": "object",
            "properties": {}
        }
    ),
    ToolDefinition(
        name="system_diagnostics",
        description="Performs comprehensive runtime environment and subsystem health diagnostics.",
        inputSchema={
            "type": "object",
            "properties": {}
        }
    ),
    ToolDefinition(
        name="ask_zdwiki",
        description="Asks zdWiki an engineering question with bounded context retrieval and LLM synthesis.",
        inputSchema={
            "type": "object",
            "required": ["question"],
            "properties": {
                "question": {"type": "string", "description": "Engineering question to answer"},
                "max_context_tokens": {"type": "integer", "description": "Max token budget for context", "default": 6000},
                "project_file": {"type": "string", "description": "Optional path to .zdwiki/project.yaml"},
                "no_llm": {"type": "boolean", "description": "Use deterministic mock provider", "default": False}
            }
        }
    )
]

# -------------------------------------------------------------
# Tool Execution Handlers
# -------------------------------------------------------------

def handle_zdwiki_status(args: Dict[str, Any], read_only: bool = False) -> CallToolResult:
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    total_objs = len(repo.list_all())
    sources = len(repo.list_all(type_filter=KnowledgeType.SOURCE))
    loops = len(repo.list_all(type_filter=KnowledgeType.ENGINEERING_LOOP))
    bugs = len(repo.list_all(type_filter=KnowledgeType.BUG))
    tests = len(repo.list_all(type_filter=KnowledgeType.TEST))

    db_exists = settings.db_path.exists()
    db_size = f"{settings.db_path.stat().st_size / 1024:.1f} KB" if db_exists else "0 KB"

    ctx = load_project_context(args.get("project_file"))
    llm_name = "Gemini (Active)" if settings.gemini_api_key else "Mock Provider (Offline/CI)"

    return _create_text_result({
        "zdwiki_version": "1.0.0",
        "mcp_protocol_version": "2024-11-05",
        "schema_version": "1.0",
        "read_only_mode": read_only,
        "knowledge_root": str(settings.knowledge_dir),
        "total_objects": total_objs,
        "total_sources": sources,
        "total_loops": loops,
        "total_bugs": bugs,
        "total_tests": tests,
        "index_engine": "SQLite FTS5",
        "index_status": "ready" if db_exists else "missing",
        "database_size": db_size,
        "project_context": ctx.model_dump() if ctx else None,
        "llm_provider": llm_name
    })

def handle_search_knowledge(args: Dict[str, Any]) -> CallToolResult:
    query = args.get("query", "")
    if not query:
        return _create_text_result({"error": "Query parameter is required", "code": "INVALID_ARGUMENT"}, is_error=True)

    engine = SQLiteIndexEngine(settings.db_path)
    searcher = SQLiteFTSSearchEngine(engine)

    ctx = load_project_context(args.get("project_file"))
    if args.get("java") or args.get("spring"):
        if not ctx:
            ctx = ProjectContext()
        if args.get("java"):
            ctx.language["java"] = str(args.get("java"))
        if args.get("spring"):
            ctx.framework["spring_boot"] = str(args.get("spring"))

    kt = None
    if args.get("type"):
        try:
            kt = KnowledgeType(args.get("type").lower())
        except ValueError:
            return _create_text_result({"error": f"Invalid type '{args.get('type')}'", "code": "INVALID_ARGUMENT"}, is_error=True)

    res = searcher.search(
        query=query,
        type_filter=kt,
        domain_filter=args.get("domain"),
        project_context=ctx,
        limit=args.get("top", 10)
    )

    if args.get("status"):
        res.results = [r for r in res.results if r.lifecycle_status.value.lower() == args.get("status").lower()]

    results_data = []
    for r in res.results:
        item = {
            "id": r.id,
            "type": r.type.value,
            "title": r.title,
            "summary": r.summary,
            "domains": r.domains,
            "tags": r.tags,
            "lifecycle_status": r.lifecycle_status.value,
            "verification_status": r.verification_status.value,
            "score": round(r.score, 2)
        }
        if args.get("explain_ranking"):
            item["bm25_score"] = round(r.bm25_score, 2)
            item["ranking_multiplier"] = round(r.ranking_multiplier, 2)
        results_data.append(item)

    return _create_text_result({
        "query": query,
        "total": len(results_data),
        "project_context": ctx.model_dump() if ctx else None,
        "results": results_data
    })

def handle_get_knowledge(args: Dict[str, Any]) -> CallToolResult:
    kid = args.get("id")
    if not kid:
        return _create_text_result({"error": "ID parameter is required", "code": "INVALID_ARGUMENT"}, is_error=True)

    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    obj = repo.get(kid)
    if not obj:
        return _create_text_result({"error": f"Knowledge object '{kid}' not found", "code": "NOT_FOUND"}, is_error=True)

    return _create_text_result(obj.model_dump())

def handle_get_context(args: Dict[str, Any]) -> CallToolResult:
    query = args.get("query", "")
    if not query:
        return _create_text_result({"error": "Query parameter is required", "code": "INVALID_ARGUMENT"}, is_error=True)

    max_tokens = args.get("max_context_tokens", 6000)
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)
    searcher = SQLiteFTSSearchEngine(engine)

    ctx = load_project_context(args.get("project_file"))
    search_resp = searcher.search(query=query, limit=15, project_context=ctx)
    candidates = search_resp.results

    selected_objs = []
    current_tokens = 0
    sources_used = set()

    for cand in candidates:
        obj = repo.get(cand.id)
        if not obj:
            continue
        est_tokens = len(obj.summary + obj.body) // 4
        if current_tokens + est_tokens <= max_tokens:
            selected_objs.append({
                "id": obj.id,
                "type": obj.type.value,
                "title": obj.title,
                "summary": obj.summary,
                "lifecycle_status": obj.lifecycle_status.value,
                "verification_status": obj.verification_status.value,
                "estimated_tokens": est_tokens,
                "body": obj.body
            })
            current_tokens += est_tokens
            for s in (obj.sources or []):
                sources_used.add(s)

    return _create_text_result({
        "query": query,
        "project_context": ctx.model_dump() if ctx else None,
        "candidate_count": len(candidates),
        "selected_count": len(selected_objs),
        "estimated_context_tokens": current_tokens,
        "token_budget": max_tokens,
        "knowledge_objects": selected_objs,
        "sources": list(sources_used)
    })

def handle_get_graph(args: Dict[str, Any]) -> CallToolResult:
    kid = args.get("id")
    if not kid:
        return _create_text_result({"error": "ID parameter is required", "code": "INVALID_ARGUMENT"}, is_error=True)

    hops = args.get("hops", 2)
    relation = args.get("relation")

    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    obj = repo.get(kid)
    if not obj:
        return _create_text_result({"error": f"Knowledge object '{kid}' not found", "code": "NOT_FOUND"}, is_error=True)

    nodes = {obj.id: {"id": obj.id, "title": obj.title, "type": obj.type.value, "status": obj.lifecycle_status.value}}
    edges = []

    for rel_type, targets in obj.relations.items():
        if relation and rel_type != relation:
            continue
        for t in targets:
            edges.append({"source": obj.id, "target": t, "relation": rel_type})
            t_obj = repo.get(t)
            if t_obj:
                nodes[t] = {"id": t_obj.id, "title": t_obj.title, "type": t_obj.type.value, "status": t_obj.lifecycle_status.value}

    if hops >= 2:
        for t_id in list(nodes.keys()):
            if t_id == obj.id:
                continue
            t_obj = repo.get(t_id)
            if t_obj:
                for r_type, sub_targets in t_obj.relations.items():
                    for st in sub_targets:
                        edges.append({"source": t_id, "target": st, "relation": r_type})
                        st_obj = repo.get(st)
                        if st_obj and st not in nodes:
                            nodes[st] = {"id": st_obj.id, "title": st_obj.title, "type": st_obj.type.value, "status": st_obj.lifecycle_status.value}

    return _create_text_result({
        "center_id": kid,
        "hops": hops,
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "nodes": list(nodes.values()),
        "edges": edges
    })

def handle_list_sources(args: Dict[str, Any]) -> CallToolResult:
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    sources = repo.list_all(type_filter=KnowledgeType.SOURCE)
    return _create_text_result([s.model_dump() for s in sources])

def handle_get_source(args: Dict[str, Any]) -> CallToolResult:
    sid = args.get("id")
    if not sid:
        return _create_text_result({"error": "ID parameter is required", "code": "INVALID_ARGUMENT"}, is_error=True)

    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    src = repo.get(sid)
    if not src or src.type != KnowledgeType.SOURCE:
        return _create_text_result({"error": f"Source '{sid}' not found", "code": "NOT_FOUND"}, is_error=True)

    return _create_text_result(src.model_dump())

def handle_specialized_search(args: Dict[str, Any], kt: KnowledgeType) -> CallToolResult:
    args_copy = dict(args)
    args_copy["type"] = kt.value
    return handle_search_knowledge(args_copy)

def handle_list_loops(args: Dict[str, Any]) -> CallToolResult:
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    loops = repo.list_all(type_filter=KnowledgeType.ENGINEERING_LOOP)
    return _create_text_result([l.model_dump() for l in loops])

def handle_start_loop(args: Dict[str, Any], read_only: bool = False) -> CallToolResult:
    if read_only:
        return _create_text_result({"error": "Cannot mutate loop in read-only mode", "code": "PERMISSION_DENIED"}, is_error=True)

    title = args.get("title")
    goal = args.get("goal")
    related = args.get("related", [])

    if not title or not goal:
        return _create_text_result({"error": "Title and goal are required", "code": "INVALID_ARGUMENT"}, is_error=True)

    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)

    loop_id = f"loop-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    now_str = datetime.utcnow().isoformat()

    loop_obj = KnowledgeObject(
        id=loop_id,
        type=KnowledgeType.ENGINEERING_LOOP,
        title=title,
        summary=goal,
        status="in_progress",
        created_at=now_str,
        updated_at=now_str,
        relations={"related_to": related} if related else {},
        body=(
            f"## Goal\n{goal}\n\n"
            f"## Stages\nCurrent Stage: `goal`\n\n"
            f"## Verified Lessons\nPending loop verification.\n"
        )
    )

    repo.save(loop_obj)
    engine.index_object(loop_obj)
    engine.log_activity("loop_started", target_id=loop_id, details=f"Started loop {title} via MCP")

    return _create_text_result({
        "status": "success",
        "loop_id": loop_id,
        "title": title,
        "current_stage": "goal"
    })

def handle_get_loop(args: Dict[str, Any]) -> CallToolResult:
    lid = args.get("id")
    if not lid:
        return _create_text_result({"error": "ID parameter is required", "code": "INVALID_ARGUMENT"}, is_error=True)

    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    loop = repo.get(lid)
    if not loop or loop.type != KnowledgeType.ENGINEERING_LOOP:
        return _create_text_result({"error": f"Loop '{lid}' not found", "code": "NOT_FOUND"}, is_error=True)

    return _create_text_result(loop.model_dump())

def handle_update_loop(args: Dict[str, Any], read_only: bool = False) -> CallToolResult:
    if read_only:
        return _create_text_result({"error": "Cannot mutate loop in read-only mode", "code": "PERMISSION_DENIED"}, is_error=True)

    lid = args.get("id")
    stage = args.get("stage")
    status = args.get("status", "completed")
    note = args.get("note", "")
    evidence = args.get("evidence", "")

    if not lid or not stage:
        return _create_text_result({"error": "ID and stage are required", "code": "INVALID_ARGUMENT"}, is_error=True)

    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)

    loop = repo.get(lid)
    if not loop or loop.type != KnowledgeType.ENGINEERING_LOOP:
        return _create_text_result({"error": f"Loop '{lid}' not found", "code": "NOT_FOUND"}, is_error=True)

    now_str = datetime.utcnow().isoformat()
    loop.updated_at = now_str

    stage_entry = f"\n### Stage: `{stage}` ({status.upper()}) - {now_str}\n"
    if note:
        stage_entry += f"- **Notes**: {note}\n"
    if evidence:
        stage_entry += f"- **Evidence**: `{evidence}`\n"

    loop.body += stage_entry
    repo.save(loop)
    engine.index_object(loop)
    engine.log_activity("loop_stage_update", target_id=lid, details=f"Updated {lid} to {stage}:{status} via MCP")

    return _create_text_result({
        "status": "success",
        "loop_id": lid,
        "stage": stage,
        "stage_status": status
    })

def handle_record_test_result(args: Dict[str, Any], read_only: bool = False) -> CallToolResult:
    if read_only:
        return _create_text_result({"error": "Cannot mutate in read-only mode", "code": "PERMISSION_DENIED"}, is_error=True)

    loop_id = args.get("loop_id")
    result = args.get("result", "passed")
    command = args.get("command", "")
    summary = args.get("summary", "")
    evidence = args.get("evidence", "")

    return handle_update_loop({
        "id": loop_id,
        "stage": "test",
        "status": "completed" if result == "passed" else "failed",
        "note": f"Test Execution: {summary} (Result: {result.upper()})",
        "evidence": f"Command: `{command}`\nEvidence: {evidence}"
    }, read_only=read_only)

def handle_record_verification(args: Dict[str, Any], read_only: bool = False) -> CallToolResult:
    if read_only:
        return _create_text_result({"error": "Cannot mutate in read-only mode", "code": "PERMISSION_DENIED"}, is_error=True)

    loop_id = args.get("loop_id")
    criteria = args.get("acceptance_criteria", "")
    evidence = args.get("evidence", "")
    verified_by = args.get("verified_by", "agent")

    return handle_update_loop({
        "id": loop_id,
        "stage": "verify",
        "status": "completed",
        "note": f"Formal Verification fulfilled: {criteria} (Verified by: {verified_by})",
        "evidence": evidence
    }, read_only=read_only)

def handle_propose_lesson(args: Dict[str, Any], read_only: bool = False) -> CallToolResult:
    if read_only:
        return _create_text_result({"error": "Cannot propose lesson in read-only mode", "code": "PERMISSION_DENIED"}, is_error=True)

    loop_id = args.get("loop_id")
    title = args.get("title")
    summary = args.get("summary")
    ltype = args.get("type", "debug_playbook")
    domain = args.get("domain", "backend")

    if not loop_id or not title or not summary:
        return _create_text_result({"error": "loop_id, title, and summary are required", "code": "INVALID_ARGUMENT"}, is_error=True)

    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    loop = repo.get(loop_id)
    if not loop:
        return _create_text_result({"error": f"Loop '{loop_id}' not found", "code": "NOT_FOUND"}, is_error=True)

    draft_id = f"{ltype[:4]}-{title.lower().replace(' ', '-')}"
    draft_content = f"""---
id: {draft_id}
type: {ltype}
title: {title}
summary: {summary}
domains:
  - {domain}
tags:
  - verified-lesson
  - {loop_id}
lifecycle_status: current
knowledge_stability: stable
verification_status: verified
relations:
  derived_from:
    - {loop_id}
---

# {title}

## Problem & Context
Synthesized from verified Engineering Loop `{loop_id}`.

## Verified Resolution
{summary}

## Diagnostic Evidence
Recorded during loop execution.
"""
    return _create_text_result({
        "status": "proposal_generated",
        "loop_id": loop_id,
        "draft_id": draft_id,
        "draft_markdown": draft_content,
        "requires_human_approval": True,
        "instructions": "To persist into canonical wiki, review and save Markdown into knowledge/wiki/ and rebuild index."
    })

def handle_knowledge_health(args: Dict[str, Any]) -> CallToolResult:
    linter = KnowledgeLinter(settings.knowledge_dir)
    report = linter.run_maintenance_diagnostics()
    return _create_text_result(report.model_dump())

def handle_system_diagnostics(args: Dict[str, Any]) -> CallToolResult:
    linter = KnowledgeLinter(settings.knowledge_dir)
    report = linter.lint_all()

    db_ok = settings.db_path.exists()
    fts_ok = True
    try:
        engine = SQLiteIndexEngine(settings.db_path)
        conn = engine.get_connection()
        conn.execute("SELECT highlight(objects_fts, 0, '', '') FROM objects_fts LIMIT 0;")
        conn.close()
    except Exception:
        fts_ok = False

    return _create_text_result({
        "is_healthy": report.is_healthy and db_ok and fts_ok,
        "checks": [
            {"name": "Knowledge Repository", "status": "PASS" if settings.knowledge_dir.exists() else "FAIL"},
            {"name": "SQLite FTS5 Full-Text Index", "status": "PASS" if (db_ok and fts_ok) else "FAIL"},
            {"name": "Schema Integrity", "status": "PASS" if report.is_healthy else "WARN", "errors": len(report.errors)},
            {"name": "Storage Writable", "status": "PASS" if settings.db_path.parent.exists() else "FAIL"},
            {"name": "LLM Provider", "status": "ACTIVE" if settings.gemini_api_key else "MOCK_FALLBACK"}
        ]
    })

def handle_ask_zdwiki(args: Dict[str, Any]) -> CallToolResult:
    from app.api.ask import ask_zdwiki, AskRequest
    from app.api.deps import get_search_engine, get_repository, get_index_engine, get_llm_provider
    from app.providers.mock import MockLLMProvider

    question = args.get("question", "")
    if not question:
        return _create_text_result({"error": "Question is required", "code": "INVALID_ARGUMENT"}, is_error=True)

    ctx = load_project_context(args.get("project_file"))
    req = AskRequest(question=question, max_context_tokens=args.get("max_context_tokens", 6000), project_context=ctx)

    provider = MockLLMProvider() if args.get("no_llm") else get_llm_provider()

    resp = ask_zdwiki(
        req=req,
        search_engine=get_search_engine(),
        repo=get_repository(),
        llm_provider=provider,
        index_engine=get_index_engine()
    )

    return _create_text_result(resp.model_dump())

# Dispatch table
TOOL_HANDLERS = {
    "zdwiki_status": handle_zdwiki_status,
    "search_knowledge": handle_search_knowledge,
    "get_knowledge": handle_get_knowledge,
    "get_context": handle_get_context,
    "get_graph": handle_get_graph,
    "list_sources": handle_list_sources,
    "get_source": handle_get_source,
    "find_tests": lambda args: handle_specialized_search(args, KnowledgeType.TEST),
    "find_bugs": lambda args: handle_specialized_search(args, KnowledgeType.BUG),
    "find_debug_playbooks": lambda args: handle_specialized_search(args, KnowledgeType.DEBUG_PLAYBOOK),
    "list_loops": handle_list_loops,
    "start_loop": handle_start_loop,
    "get_loop": handle_get_loop,
    "update_loop": handle_update_loop,
    "record_test_result": handle_record_test_result,
    "record_verification": handle_record_verification,
    "propose_lesson": handle_propose_lesson,
    "knowledge_health": handle_knowledge_health,
    "system_diagnostics": handle_system_diagnostics,
    "ask_zdwiki": handle_ask_zdwiki,
}

def execute_tool(name: str, arguments: Dict[str, Any], read_only: bool = False) -> CallToolResult:
    handler = TOOL_HANDLERS.get(name)
    if not handler:
        return _create_text_result({"error": f"Tool '{name}' not found", "code": "NOT_FOUND"}, is_error=True)

    try:
        # Check if handler accepts read_only kwarg
        import inspect
        sig = inspect.signature(handler)
        if "read_only" in sig.parameters:
            return handler(arguments, read_only=read_only)
        return handler(arguments)
    except Exception as e:
        return _create_text_result({"error": f"Internal tool execution error: {str(e)}", "code": "INTERNAL_ERROR"}, is_error=True)
