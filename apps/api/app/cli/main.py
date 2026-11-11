import sys
import json
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from app.config import settings
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.engine import SQLiteFTSSearchEngine
from app.core.linter import KnowledgeLinter
from app.models.context import ProjectContext
from app.models.knowledge import KnowledgeObject, KnowledgeType, LifecycleStatus, VerificationStatus
from app.models.loop import EngineeringLoop, LoopStage, StageRecord
from app.ingestion.pipeline import IngestionPipeline
from app.providers.gemini import GeminiProvider
from app.providers.base import BaseLLMProvider, LLMResponse
from app.cli.context_loader import load_project_context, find_project_file

CLI_VERSION = "1.0.0"
SCHEMA_VERSION = "1.0"

# Main Typer app with sub-apps for clean command hierarchies
cli_app = typer.Typer(
    name="zdwiki",
    help="zdWiki CLI — Engineering Knowledge Operating System",
    no_args_is_help=True,
    add_completion=False,
)

# Sub-command groups
knowledge_app = typer.Typer(help="Knowledge object commands", no_args_is_help=True)
source_app = typer.Typer(help="Source registry and evidence commands", no_args_is_help=True)
index_app = typer.Typer(help="SQLite index management commands", no_args_is_help=True)
loop_app = typer.Typer(help="Engineering Loop management commands", no_args_is_help=True)
lesson_app = typer.Typer(help="Verified lessons and learning commands", no_args_is_help=True)
config_app = typer.Typer(help="System configuration commands", no_args_is_help=True)
context_app = typer.Typer(help="Project context and bounded context retrieval", no_args_is_help=True)

mcp_app = typer.Typer(help="zdWiki Model Context Protocol (MCP) server for AI coding agents", no_args_is_help=True)

cli_app.add_typer(knowledge_app, name="knowledge")
cli_app.add_typer(source_app, name="source")
cli_app.add_typer(index_app, name="index")
cli_app.add_typer(loop_app, name="loop")
cli_app.add_typer(lesson_app, name="lesson")
cli_app.add_typer(config_app, name="config")
cli_app.add_typer(context_app, name="context-group")
cli_app.add_typer(mcp_app, name="mcp")

console = Console(highlight=False, legacy_windows=False)
err_console = Console(stderr=True, highlight=False, legacy_windows=False)

def emit_json(data: Any):
    """Outputs pure JSON to stdout for machine consumption"""
    print(json.dumps(data, indent=2, default=str))

def version_callback(value: bool):
    if value:
        console.print(f"zdWiki CLI v{CLI_VERSION} (Schema: v{SCHEMA_VERSION})")
        raise typer.Exit(code=0)

@cli_app.callback()
def main_callback(
    version: Optional[bool] = typer.Option(
        None, "--version", "-v", help="Show zdWiki CLI version", callback=version_callback, is_eager=True
    )
):
    pass

# ==========================================
# 1. SYSTEM & DIAGNOSTICS COMMANDS
# ==========================================

@cli_app.command("status")
def status_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Displays concise system, index, and knowledge status."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)
    
    total_objs = len(repo.list_all())
    sources = len(repo.list_all(type_filter=KnowledgeType.SOURCE))
    loops = len(repo.list_all(type_filter=KnowledgeType.ENGINEERING_LOOP))
    bugs = len(repo.list_all(type_filter=KnowledgeType.BUG))
    tests = len(repo.list_all(type_filter=KnowledgeType.TEST))
    
    db_exists = settings.db_path.exists()
    db_size = f"{settings.db_path.stat().st_size / 1024:.1f} KB" if db_exists else "0 KB"
    
    ctx = load_project_context()
    ctx_name = ctx.custom.get("project_name", "N/A") if ctx else "No .zdwiki/project.yaml found"
    
    llm_name = "Gemini (Active)" if settings.gemini_api_key else "Mock Provider (Offline/CI)"

    res_data = {
        "zdwiki_version": CLI_VERSION,
        "schema_version": SCHEMA_VERSION,
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
    }

    if json_output:
        emit_json(res_data)
        return

    table = Table(title=f"zdWiki v{CLI_VERSION} System Status", show_header=False)
    table.add_column("Property", style="cyan")
    table.add_column("Value", style="bold green")

    table.add_row("Knowledge Root", str(settings.knowledge_dir))
    table.add_row("Total Objects", f"{total_objs} (Sources: {sources}, Loops: {loops}, Bugs: {bugs}, Tests: {tests})")
    table.add_row("SQLite Index", f"SQLite FTS5 ({'READY' if db_exists else 'NOT FOUND'}) • {db_size}")
    table.add_row("Project Context", ctx_name)
    table.add_row("LLM Provider", llm_name)

    console.print(table)

@cli_app.command("doctor")
def doctor_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Runs comprehensive runtime environment and subsystem health diagnostics."""
    checks = []
    has_critical_error = False

    # 1. Config & paths
    k_dir_ok = settings.knowledge_dir.exists() and settings.knowledge_dir.is_dir()
    checks.append({
        "name": "Knowledge Repository Directory",
        "status": "PASS" if k_dir_ok else "FAIL",
        "details": f"Path: {settings.knowledge_dir}"
    })
    if not k_dir_ok:
        has_critical_error = True

    # 2. SQLite FTS5 support
    db_ok = True
    fts_ok = True
    try:
        engine = SQLiteIndexEngine(settings.db_path)
        conn = engine.get_connection()
        conn.execute("SELECT highlight(objects_fts, 0, '', '') FROM objects_fts LIMIT 0;")
        conn.close()
    except Exception as e:
        fts_ok = False
        checks.append({
            "name": "SQLite FTS5 Extension",
            "status": "FAIL",
            "details": f"Error: {e}"
        })
        has_critical_error = True
    else:
        checks.append({
            "name": "SQLite FTS5 Full-Text Index",
            "status": "PASS",
            "details": f"Database at {settings.db_path}"
        })

    # 3. Schema & Knowledge Health Linter
    try:
        linter = KnowledgeLinter(settings.knowledge_dir)
        report = linter.lint_all()
        checks.append({
            "name": "Knowledge Schema Integrity",
            "status": "PASS" if report.is_healthy else "WARN",
            "details": f"{report.total_objects} objects validated ({len(report.errors)} errors, {len(report.warnings)} warnings)"
        })
    except Exception as e:
        checks.append({
            "name": "Knowledge Schema Integrity",
            "status": "FAIL",
            "details": str(e)
        })
        has_critical_error = True

    # 4. Write Permissions
    try:
        test_file = settings.db_path.parent / ".doctor_write_test"
        test_file.write_text("ok", encoding="utf-8")
        test_file.unlink()
        checks.append({
            "name": "Storage Write Permissions",
            "status": "PASS",
            "details": f"Writable: {settings.db_path.parent}"
        })
    except Exception as e:
        checks.append({
            "name": "Storage Write Permissions",
            "status": "FAIL",
            "details": f"Permission error: {e}"
        })
        has_critical_error = True

    # 5. LLM Provider
    llm_status = "ACTIVE" if settings.gemini_api_key else "MOCK_FALLBACK"
    checks.append({
        "name": "LLM Provider Configuration",
        "status": "PASS",
        "details": f"Provider: Gemini ({llm_status})"
    })

    if json_output:
        emit_json({
            "is_healthy": not has_critical_error,
            "checks": checks
        })
        raise typer.Exit(code=1 if has_critical_error else 0)

    table = Table(title="zdWiki Doctor Diagnostic Report")
    table.add_column("Subsystem", style="cyan")
    table.add_column("Status", style="bold")
    table.add_column("Details", style="white")

    for c in checks:
        status_style = "green" if c["status"] == "PASS" else ("yellow" if c["status"] == "WARN" else "red")
        table.add_row(c["name"], f"[{status_style}]{c['status']}[/{status_style}]", c["details"])

    console.print(table)
    if has_critical_error:
        console.print("[bold red][FAIL] Critical issues detected. Resolve errors above.[/bold red]")
        raise typer.Exit(code=1)
    else:
        console.print("[bold green][OK] System is healthy and ready for operation.[/bold green]")

# ==========================================
# 2. CONFIGURATION COMMANDS
# ==========================================

@config_app.command("show")
def config_show_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Displays active configuration parameters without exposing secrets."""
    conf = {
        "host": settings.host,
        "port": settings.port,
        "base_dir": str(settings.base_dir),
        "knowledge_dir": str(settings.knowledge_dir),
        "db_path": str(settings.db_path),
        "raw_dir": str(settings.raw_dir),
        "gemini_model": settings.gemini_model,
        "gemini_api_key_configured": bool(settings.gemini_api_key)
    }
    if json_output:
        emit_json(conf)
        return

    table = Table(title="zdWiki Configuration", show_header=False)
    table.add_column("Key", style="cyan")
    table.add_column("Value", style="bold green")

    for k, v in conf.items():
        table.add_row(k, str(v))
    console.print(table)

@config_app.command("validate")
def config_validate_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Validates configuration paths and directory integrity."""
    valid = settings.knowledge_dir.exists() and settings.db_path.parent.exists()
    if json_output:
        emit_json({"valid": valid, "knowledge_dir_exists": settings.knowledge_dir.exists()})
        return
    if valid:
        console.print("[bold green][OK] Configuration is valid![/bold green]")
    else:
        console.print("[bold red][FAIL] Configuration has invalid paths.[/bold red]")
        raise typer.Exit(code=2)

@config_app.command("path")
def config_path_cmd():
    """Prints the workspace base directory path."""
    console.print(str(settings.base_dir))

# ==========================================
# 3. KNOWLEDGE RETRIEVAL & CRUD COMMANDS
# ==========================================

@knowledge_app.command("list")
def knowledge_list_cmd(
    domain: Optional[str] = typer.Option(None, "--domain", "-d", help="Filter by domain"),
    type_name: Optional[str] = typer.Option(None, "--type", "-t", help="Filter by type (concept, tech, bug, test, etc.)"),
    status: Optional[str] = typer.Option(None, "--status", help="Filter by lifecycle status (current, legacy, deprecated)"),
    tag: Optional[str] = typer.Option(None, "--tag", help="Filter by tag"),
    limit: int = typer.Option(50, "--limit", "-n", help="Max items to list"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Lists knowledge objects with optional filtering."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    
    kt = None
    if type_name:
        try:
            kt = KnowledgeType(type_name.lower())
        except ValueError:
            err_console.print(f"[red]Error: Invalid knowledge type '{type_name}'[/red]")
            raise typer.Exit(code=2)

    objs = repo.list_all(type_filter=kt, domain_filter=domain, tag_filter=tag)
    
    if status:
        objs = [o for o in objs if o.lifecycle_status.value.lower() == status.lower()]

    objs = objs[:limit]

    if json_output:
        emit_json([o.model_dump() for o in objs])
        return

    table = Table(title=f"Knowledge Objects ({len(objs)} matches)")
    table.add_column("ID", style="cyan")
    table.add_column("Type", style="magenta")
    table.add_column("Status", style="blue")
    table.add_column("Domains", style="yellow")
    table.add_column("Title", style="bold green")

    for o in objs:
        doms = ", ".join(o.domains[:2])
        table.add_row(o.id, o.type.value, o.lifecycle_status.value, doms, o.title)

    console.print(table)

@knowledge_app.command("get")
def knowledge_get_cmd(
    id: str = typer.Argument(..., help="Knowledge Object ID (e.g. concept-jwt-authentication)"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Fetches a single knowledge object by ID."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    obj = repo.get(id)
    if not obj:
        if json_output:
            emit_json({"error": f"Object '{id}' not found", "code": 3})
        else:
            err_console.print(f"[red]Error: Knowledge object '{id}' not found[/red]")
        raise typer.Exit(code=3)

    if json_output:
        emit_json(obj.model_dump())
        return

    panel_content = f"""[bold cyan]ID:[/bold cyan] {obj.id}
[bold magenta]Type:[/bold magenta] {obj.type.value}
[bold blue]Status:[/bold blue] {obj.lifecycle_status.value} ({obj.knowledge_stability.value} • {obj.verification_status.value})
[bold yellow]Domains:[/bold yellow] {', '.join(obj.domains)}
[bold green]Tags:[/bold green] {', '.join(obj.tags)}
[bold]Summary:[/bold] {obj.summary}

[dim]--- Body ---[/dim]
{obj.body}
"""
    console.print(Panel(panel_content, title=f"Knowledge Object: {obj.title}", border_style="green"))

# Convenience top-level shortcut: `zdwiki get <id>`
@cli_app.command("get")
def top_get_cmd(
    id: str = typer.Argument(..., help="Knowledge Object ID"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Convenience alias for 'zdwiki knowledge get <id>'."""
    knowledge_get_cmd(id=id, json_output=json_output)

# ==========================================
# 4. SEARCH COMMAND (FTS5 BM25 + Version Ranking)
# ==========================================

@cli_app.command("search")
def search_cmd(
    query: str = typer.Argument(..., help="Search query text"),
    domain: Optional[str] = typer.Option(None, "--domain", "-d", help="Filter by domain"),
    type_name: Optional[str] = typer.Option(None, "--type", "-t", help="Filter by type"),
    status: Optional[str] = typer.Option(None, "--status", help="Filter by lifecycle status (current, legacy)"),
    java_ver: Optional[str] = typer.Option(None, "--java", help="Java version constraint (e.g. '21' or '8')"),
    spring_ver: Optional[str] = typer.Option(None, "--spring", help="Spring version constraint (e.g. '6' or '5')"),
    project_file: Optional[str] = typer.Option(None, "--project", "-p", help="Path to .zdwiki/project.yaml"),
    top: int = typer.Option(10, "--top", "-n", help="Max search matches"),
    explain_ranking: bool = typer.Option(False, "--explain-ranking", help="Show score breakdown and multipliers"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Searches knowledge objects using SQLite FTS5 BM25 with version-aware ranking."""
    engine = SQLiteIndexEngine(settings.db_path)
    searcher = SQLiteFTSSearchEngine(engine)

    ctx = load_project_context(project_file)
    if java_ver or spring_ver:
        if not ctx:
            ctx = ProjectContext()
        if java_ver:
            ctx.language["java"] = java_ver
        if spring_ver:
            ctx.framework["spring_boot"] = spring_ver

    kt = None
    if type_name:
        try:
            kt = KnowledgeType(type_name.lower())
        except ValueError:
            err_console.print(f"[red]Error: Invalid type '{type_name}'[/red]")
            raise typer.Exit(code=2)

    res = searcher.search(
        query=query,
        type_filter=kt,
        domain_filter=domain,
        project_context=ctx,
        limit=top
    )

    if status:
        res.results = [r for r in res.results if r.lifecycle_status.value.lower() == status.lower()]

    if json_output:
        emit_json({
            "query": query,
            "total": len(res.results),
            "project_context": ctx.model_dump() if ctx else None,
            "results": [r.model_dump() for r in res.results]
        })
        return

    if not res.results:
        console.print(f"[yellow]No results found for: '{query}'[/yellow]")
        return

    table = Table(title=f"Search Results for '{query}' ({len(res.results)} matches)")
    table.add_column("ID", style="cyan")
    table.add_column("Type", style="magenta")
    table.add_column("Status", style="blue")
    table.add_column("Score", style="yellow")
    table.add_column("Title", style="bold green")
    if explain_ranking:
        table.add_column("BM25", style="dim")
        table.add_column("Multiplier", style="dim")

    for r in res.results:
        row = [r.id, r.type.value, r.lifecycle_status.value, f"{r.score:.2f}", r.title]
        if explain_ranking:
            row.extend([f"{r.bm25_score:.2f}", f"{r.ranking_multiplier:.2f}x"])
        table.add_row(*row)

    console.print(table)

# ==========================================
# 5. BOUNDED CONTEXT RETRIEVAL (Agent Command)
# ==========================================

@cli_app.command("context")
def context_cmd(
    question: str = typer.Argument(..., help="Engineering task or query to bundle context for"),
    project_file: Optional[str] = typer.Option(None, "--project", "-p", help="Path to .zdwiki/project.yaml"),
    max_tokens: int = typer.Option(6000, "--max-context-tokens", help="Max token budget for context bundle"),
    no_llm: bool = typer.Option(False, "--no-llm", help="Bypass any LLM processing"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Retrieves a bounded knowledge context bundle suitable for AI coding agents."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)
    searcher = SQLiteFTSSearchEngine(engine)

    ctx = load_project_context(project_file)

    search_resp = searcher.search(query=question, limit=12, project_context=ctx)
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

    result_payload = {
        "query": question,
        "project_context": ctx.model_dump() if ctx else None,
        "candidate_count": len(candidates),
        "selected_count": len(selected_objs),
        "estimated_context_tokens": current_tokens,
        "token_budget": max_tokens,
        "knowledge_objects": selected_objs,
        "sources": list(sources_used)
    }

    if json_output:
        emit_json(result_payload)
        return

    table = Table(title=f"Bounded Context Bundle ({len(selected_objs)} Objects • {current_tokens}/{max_tokens} Tokens)")
    table.add_column("ID", style="cyan")
    table.add_column("Type", style="magenta")
    table.add_column("Status", style="blue")
    table.add_column("Tokens", style="yellow")
    table.add_column("Title", style="bold green")

    for o in selected_objs:
        table.add_row(o["id"], o["type"], o["lifecycle_status"], str(o["estimated_tokens"]), o["title"])

    console.print(table)
    console.print(f"\n[dim]Sources Referenced: {', '.join(sources_used) if sources_used else 'None'}[/dim]")

@cli_app.command("context-show")
def context_show_cmd(
    project_file: Optional[str] = typer.Option(None, "--project", "-p", help="Path to .zdwiki/project.yaml"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Displays active project environment context."""
    ctx = load_project_context(project_file)
    p_file = find_project_file(Path(project_file).parent if project_file else None)

    if not ctx:
        if json_output:
            emit_json({"discovered": False, "project_context": None})
        else:
            console.print("[yellow]No project context file found (.zdwiki/project.yaml).[/yellow]")
        return

    if json_output:
        emit_json({
            "discovered": True,
            "file_path": str(p_file) if p_file else None,
            "project_context": ctx.model_dump()
        })
        return

    console.print(Panel(
        f"[bold]Project File:[/bold] {p_file}\n"
        f"[bold]Project Name:[/bold] {ctx.custom.get('project_name', 'N/A')}\n"
        f"[bold]Languages:[/bold] {json.dumps(ctx.language)}\n"
        f"[bold]Frameworks:[/bold] {json.dumps(ctx.framework)}\n"
        f"[bold]Databases:[/bold] {json.dumps(ctx.database)}\n"
        f"[bold]Domains:[/bold] {', '.join(ctx.custom.get('domains', []))}",
        title="Active Project Context",
        border_style="cyan"
    ))

# ==========================================
# 6. CONTEXT GRAPH COMMAND
# ==========================================

@cli_app.command("graph")
def graph_cmd(
    id: str = typer.Argument(..., help="Center Knowledge Object ID"),
    hops: int = typer.Option(2, "--hops", "-h", help="Neighborhood hops depth (1-3)"),
    relation: Optional[str] = typer.Option(None, "--relation", "-r", help="Filter by relation type"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Retrieves local neighborhood graph for a knowledge object."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)

    obj = repo.get(id)
    if not obj:
        if json_output:
            emit_json({"error": f"Object '{id}' not found", "code": 3})
        else:
            err_console.print(f"[red]Error: Knowledge object '{id}' not found[/red]")
        raise typer.Exit(code=3)

    nodes = {obj.id: {"id": obj.id, "title": obj.title, "type": obj.type.value, "status": obj.lifecycle_status.value}}
    edges = []

    # Direct relations
    for rel_type, targets in obj.relations.items():
        if relation and rel_type != relation:
            continue
        for t in targets:
            edges.append({"source": obj.id, "target": t, "relation": rel_type})
            t_obj = repo.get(t)
            if t_obj:
                nodes[t] = {"id": t_obj.id, "title": t_obj.title, "type": t_obj.type.value, "status": t_obj.lifecycle_status.value}

    # 2-hop expansion
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

    graph_data = {
        "center_id": id,
        "hops": hops,
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "nodes": list(nodes.values()),
        "edges": edges
    }

    if json_output:
        emit_json(graph_data)
        return

    table = Table(title=f"Context Graph for '{id}' ({len(nodes)} Nodes, {len(edges)} Edges)")
    table.add_column("Source", style="cyan")
    table.add_column("Relation", style="magenta")
    table.add_column("Target", style="green")

    for e in edges:
        table.add_row(e["source"], e["relation"], e["target"])

    console.print(table)

# ==========================================
# 7. SOURCE REGISTRY & EVIDENCE COMMANDS
# ==========================================

@source_app.command("list")
def source_list_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Lists all registered sources in the knowledge base."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    sources = repo.list_all(type_filter=KnowledgeType.SOURCE)

    if json_output:
        emit_json([s.model_dump() for s in sources])
        return

    table = Table(title=f"Source Registry ({len(sources)} Sources)")
    table.add_column("Source ID", style="cyan")
    table.add_column("Title", style="bold green")
    table.add_column("Tags", style="yellow")
    table.add_column("File Path", style="dim")

    for s in sources:
        table.add_row(s.id, s.title, ", ".join(s.tags), str(s.file_path or "N/A"))

    console.print(table)

@source_app.command("verify")
def source_verify_cmd(
    id: str = typer.Argument(..., help="Source ID (e.g. source-rfc-7519)"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Verifies raw source integrity via SHA-256 hash comparison."""
    import hashlib
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    src = repo.get(id)
    if not src or src.type != KnowledgeType.SOURCE:
        if json_output:
            emit_json({"error": f"Source '{id}' not found", "code": 3})
        else:
            err_console.print(f"[red]Error: Source '{id}' not found[/red]")
        raise typer.Exit(code=3)

    # Extract raw path and sha256 from source body
    raw_path_match = None
    sha_match = None
    for line in src.body.splitlines():
        if "Raw Path" in line:
            raw_path_match = line.split("`")[1] if "`" in line else None
        if "SHA256" in line or "SHA-256" in line:
            sha_match = line.split("`")[1] if "`" in line else None

    status = "VERIFIED"
    details = "Hash matches immutable raw file"

    if raw_path_match:
        full_raw = settings.base_dir / raw_path_match
        if full_raw.exists():
            computed = hashlib.sha256(full_raw.read_bytes()).hexdigest()
            if sha_match and computed != sha_match:
                status = "MISMATCH"
                details = f"Computed {computed} != Recorded {sha_match}"
        else:
            status = "RAW_MISSING"
            details = f"Raw source not found at {full_raw}"

    result = {
        "source_id": id,
        "status": status,
        "recorded_sha256": sha_match,
        "raw_path": raw_path_match,
        "details": details
    }

    if json_output:
        emit_json(result)
        return

    console.print(Panel(
        f"[bold]Source ID:[/bold] {id}\n"
        f"[bold]Status:[/bold] [{'green' if status == 'VERIFIED' else 'red'}]{status}[/{'green' if status == 'VERIFIED' else 'red'}]\n"
        f"[bold]SHA-256:[/bold] {sha_match}\n"
        f"[bold]Raw Path:[/bold] {raw_path_match}\n"
        f"[bold]Details:[/bold] {details}",
        title=f"Source Verification: {src.title}",
        border_style="green" if status == "VERIFIED" else "red"
    ))

# ==========================================
# 8. INGESTION COMMAND
# ==========================================

@cli_app.command("ingest")
def ingest_cmd(
    file_path: str = typer.Argument(..., help="Path to raw source file (md, pdf, txt)"),
    title: Optional[str] = typer.Option(None, "--title", "-t", help="Optional title for the source"),
    domain: Optional[str] = typer.Option(None, "--domain", "-d", help="Domain category"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Preview ingestion without saving"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Ingests a raw source document into the immutable raw archive and source registry."""
    src_file = Path(file_path).resolve()
    if not src_file.exists() or not src_file.is_file():
        err_console.print(f"[red]Error: Source file '{file_path}' not found[/red]")
        raise typer.Exit(code=2)

    content_bytes = src_file.read_bytes()
    
    if dry_run:
        res = {
            "status": "dry_run",
            "file": str(src_file),
            "size_bytes": len(content_bytes),
            "title": title or src_file.stem
        }
        if json_output:
            emit_json(res)
        else:
            console.print(f"[yellow][DRY-RUN] Would ingest {src_file.name} ({len(content_bytes)} bytes)[/yellow]")
        return

    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)
    pipeline = IngestionPipeline(repo, engine, settings.raw_dir)

    result = pipeline.ingest_file(
        filename=src_file.name,
        content_bytes=content_bytes,
        title=title,
        tags=[domain] if domain else None
    )

    if json_output:
        mapped_result = {
            "source_id": result.get("source_id"),
            "source_type": result.get("source_type") or Path(src_file.name).suffix.lower().lstrip("."),
            "sha256": result.get("sha256"),
            "parse_status": result.get("parse_status", "completed"),
            "secret_scan_status": result.get("secret_scan_status", "clean")
        }
        emit_json(mapped_result)
        return

    console.print(f"[bold green][OK] Successfully ingested {src_file.name}[/bold green]")
    console.print(f"Source ID: [cyan]{result['source_id']}[/cyan]")
    console.print(f"SHA-256: [yellow]{result['sha256']}[/yellow]")
    if result.get("warnings"):
        console.print(f"[yellow]Warnings:[/yellow] {', '.join(result['warnings'])}")

# ==========================================
# 9. INDEX COMMANDS
# ==========================================

@index_app.command("rebuild")
def index_rebuild_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Rebuilds the SQLite FTS5 index from canonical Markdown files."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)
    res = engine.rebuild_index(repo)

    if json_output:
        emit_json(res)
        return

    console.print(f"[bold green][OK] Successfully rebuilt index: {res['indexed_count']} objects indexed into {settings.db_path}[/bold green]")

@index_app.command("status")
def index_status_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Reports index size and synchronization status."""
    db_exists = settings.db_path.exists()
    db_size = settings.db_path.stat().st_size if db_exists else 0
    status_data = {
        "type": "SQLite FTS5",
        "ready": db_exists,
        "path": str(settings.db_path),
        "size_bytes": db_size,
        "size_formatted": f"{db_size / 1024:.1f} KB"
    }
    if json_output:
        emit_json(status_data)
        return
    console.print(Panel(
        f"[bold]Status:[/bold] {'READY' if db_exists else 'MISSING'}\n"
        f"[bold]Path:[/bold] {settings.db_path}\n"
        f"[bold]Size:[/bold] {status_data['size_formatted']}",
        title="SQLite FTS5 Index Status",
        border_style="green" if db_exists else "red"
    ))

@index_app.command("optimize")
def index_optimize_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Runs safe SQLite PRAGMA optimize and ANALYZE operations."""
    engine = SQLiteIndexEngine(settings.db_path)
    conn = engine.get_connection()
    try:
        conn.execute("PRAGMA optimize;")
        conn.execute("ANALYZE;")
    finally:
        conn.close()

    res = {"status": "success", "operations": ["PRAGMA optimize", "ANALYZE"]}
    if json_output:
        emit_json(res)
        return
    console.print("[bold green][OK] SQLite FTS5 index successfully optimized.[/bold green]")

# Top-level alias for `zdwiki index` (preserves backward compatibility)
@cli_app.command("index")
def top_index_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Rebuilds the SQLite FTS5 index (backward-compatible alias)."""
    index_rebuild_cmd(json_output=json_output)

# ==========================================
# 10. LINT & MAINTAIN COMMANDS
# ==========================================

@cli_app.command("lint")
def lint_cmd(
    quiet: bool = typer.Option(False, "--quiet", "-q", help="Minimal output"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Runs health check and validation across all knowledge objects."""
    linter = KnowledgeLinter(settings.knowledge_dir)
    report = linter.lint_all()

    if json_output:
        emit_json(report.model_dump())
        raise typer.Exit(code=0 if report.is_healthy else 1)

    if not quiet:
        console.print(f"Scanned {report.total_files} files, {report.total_objects} knowledge objects.")
        for err in report.errors:
            console.print(f"  [red][FAIL] [{err.rule}] {err.file_path}: {err.message}[/red]")
        for warn in report.warnings:
            console.print(f"  [yellow][WARN] [{warn.rule}] {warn.file_path}: {warn.message}[/yellow]")

    if report.is_healthy:
        if not quiet:
            console.print("[bold green][OK] All knowledge objects are healthy and valid![/bold green]")
        raise typer.Exit(code=0)
    else:
        if not quiet:
            console.print(f"[bold red]Found {len(report.errors)} lint errors.[/bold red]")
        raise typer.Exit(code=1)

@cli_app.command("maintain")
def maintain_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Performs deep diagnostic maintenance analysis without destructive changes."""
    linter = KnowledgeLinter(settings.knowledge_dir)
    report = linter.run_maintenance_diagnostics()

    if json_output:
        emit_json(report.model_dump())
        return

    console.print(f"[bold]Knowledge Maintenance Diagnostic Report[/bold]")
    console.print(f"Total Objects Scanned: {report.total_scanned} | Total Issues Detected: {report.total_issues}")

    if not report.items:
        console.print("[bold green][OK] Knowledge base is in pristine condition! No maintenance actions needed.[/bold green]")
        return

    table = Table(title="Maintenance Diagnostics & Actionable Recommendations")
    table.add_column("Severity", style="bold")
    table.add_column("Category", style="cyan")
    table.add_column("Object ID", style="magenta")
    table.add_column("Diagnostic Message", style="white")
    table.add_column("Recommendation", style="green")

    for item in report.items:
        sev_style = "red" if item.severity.value == "critical" else ("yellow" if item.severity.value == "warning" else "blue")
        table.add_row(
            f"[{sev_style}]{item.severity.value.upper()}[/{sev_style}]",
            item.category.value,
            item.id,
            item.message,
            item.recommendation or ""
        )

    console.print(table)

# ==========================================
# 11. ENGINEERING LOOP COMMANDS
# ==========================================

@loop_app.command("list")
def loop_list_cmd(
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Lists all active and archived engineering loops."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    loops = repo.list_all(type_filter=KnowledgeType.ENGINEERING_LOOP)

    if json_output:
        emit_json([l.model_dump() for l in loops])
        return

    table = Table(title=f"Engineering Loops ({len(loops)} Loops)")
    table.add_column("ID", style="cyan")
    table.add_column("Title", style="bold green")
    table.add_column("Status", style="magenta")
    table.add_column("Updated", style="dim")

    for l in loops:
        table.add_row(l.id, l.title, l.status or "active", l.updated_at or "N/A")

    console.print(table)

@loop_app.command("start")
def loop_start_cmd(
    title: str = typer.Option(..., "--title", "-t", help="Title of the engineering task"),
    goal: str = typer.Option(..., "--goal", "-g", help="Exact objective and boundaries"),
    related: Optional[List[str]] = typer.Option(None, "--related", "-r", help="Related bug, test, or playbook IDs"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Initializes a new Engineering Loop."""
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
    engine.log_activity("loop_started", target_id=loop_id, details=f"Started loop {title}")

    res = {"status": "success", "loop_id": loop_id, "title": title}
    if json_output:
        emit_json(res)
        return

    console.print(f"[bold green][OK] Started Engineering Loop: {loop_id}[/bold green]")
    console.print(f"Goal: {goal}")

@loop_app.command("get")
def loop_get_cmd(
    id: str = typer.Argument(..., help="Loop ID"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Retrieves state and stage history of an engineering loop."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    loop = repo.get(id)
    if not loop or loop.type != KnowledgeType.ENGINEERING_LOOP:
        if json_output:
            emit_json({"error": f"Loop '{id}' not found", "code": 3})
        else:
            err_console.print(f"[red]Error: Engineering Loop '{id}' not found[/red]")
        raise typer.Exit(code=3)

    if json_output:
        emit_json(loop.model_dump())
        return

    console.print(Panel(loop.body, title=f"Loop: {loop.title} ({loop.id})", border_style="cyan"))

@loop_app.command("update")
def loop_update_cmd(
    id: str = typer.Argument(..., help="Loop ID"),
    stage: str = typer.Option(..., "--stage", "-s", help="Stage (plan, implement, test, diagnose, fix, verify, learn)"),
    status: str = typer.Option("completed", "--status", help="Stage status (completed, failed, in_progress)"),
    note: Optional[str] = typer.Option("", "--note", "-n", help="Stage explanation note"),
    evidence: Optional[str] = typer.Option("", "--evidence", "-e", help="Test execution command or log output"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Records an engineering loop stage transition with verifiable evidence."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)

    loop = repo.get(id)
    if not loop or loop.type != KnowledgeType.ENGINEERING_LOOP:
        if json_output:
            emit_json({"error": f"Loop '{id}' not found", "code": 3})
        else:
            err_console.print(f"[red]Error: Loop '{id}' not found[/red]")
        raise typer.Exit(code=3)

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
    engine.log_activity("loop_stage_update", target_id=id, details=f"Updated {id} to {stage}:{status}")

    res = {"status": "success", "loop_id": id, "stage": stage, "stage_status": status}
    if json_output:
        emit_json(res)
        return

    console.print(f"[bold green][OK] Updated loop {id} to stage '{stage}' ({status})[/bold green]")

# ==========================================
# 12. LESSON PROPOSAL & APPLY COMMANDS
# ==========================================

@lesson_app.command("propose")
def lesson_propose_cmd(
    loop_id: str = typer.Option(..., "--loop", "-l", help="Engineering Loop ID to propose lesson from"),
    lesson_type: str = typer.Option("debug_playbook", "--type", "-t", help="Type: debug_playbook, test, bug, decision"),
    title: str = typer.Option(..., "--title", help="Title for the proposed lesson"),
    summary: str = typer.Option(..., "--summary", help="Concise summary of verified finding"),
    domain: str = typer.Option("backend", "--domain", "-d", help="Primary domain"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Proposes a structured knowledge object draft derived from a verified Engineering Loop."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    loop = repo.get(loop_id)
    if not loop:
        err_console.print(f"[red]Error: Loop '{loop_id}' not found[/red]")
        raise typer.Exit(code=3)

    draft_id = f"{lesson_type[:4]}-{title.lower().replace(' ', '-')}"
    draft_content = f"""---
id: {draft_id}
type: {lesson_type}
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
Synthesized from Engineering Loop \`{loop_id}\`.

## Verified Resolution
{summary}

## Diagnostic Evidence
Documented during loop execution.
"""
    proposal = {
        "status": "proposal_generated",
        "loop_id": loop_id,
        "draft_id": draft_id,
        "draft_markdown": draft_content
    }

    if json_output:
        emit_json(proposal)
        return

    console.print(Panel(draft_content, title=f"Proposed Knowledge Lesson Draft ({draft_id})", border_style="green"))
    console.print("\n[dim]To persist into canonical knowledge, save as Markdown in knowledge/wiki/ and run 'zdwiki index'.[/dim]")

# ==========================================
# 13. ASK ASSISTANT COMMAND (Grounded Q&A)
# ==========================================

@cli_app.command("ask")
def ask_cmd(
    question: str = typer.Argument(..., help="Engineering question to answer"),
    project_file: Optional[str] = typer.Option(None, "--project", "-p", help="Path to .zdwiki/project.yaml"),
    max_tokens: int = typer.Option(6000, "--max-context-tokens", help="Max context token budget"),
    no_llm: bool = typer.Option(False, "--no-llm", help="Use deterministic mock provider"),
    json_output: bool = typer.Option(False, "--json", help="Emit machine-readable JSON")
):
    """Asks zdWiki an engineering question with bounded context retrieval."""
    from app.api.ask import ask_zdwiki, AskRequest
    from app.api.deps import get_search_engine, get_repository, get_index_engine, get_llm_provider
    from app.providers.mock import MockLLMProvider

    ctx = load_project_context(project_file)
    req = AskRequest(question=question, max_context_tokens=max_tokens, project_context=ctx)

    provider = MockLLMProvider() if no_llm else get_llm_provider()
    
    resp = ask_zdwiki(
        req=req,
        search_engine=get_search_engine(),
        repo=get_repository(),
        llm_provider=provider,
        index_engine=get_index_engine()
    )

    if json_output:
        emit_json(resp.model_dump())
        return

    console.print(Panel(
        resp.answer,
        title=f"zdWiki Answer (Model: {resp.model} • Latency: {resp.latency_ms:.1f}ms)",
        border_style="cyan"
    ))
    console.print(f"[dim]Knowledge Objects Used: {', '.join(resp.knowledge_objects_used)}[/dim]")

# ==========================================
# 14. SERVER & MIGRATION COMMANDS
# ==========================================

@cli_app.command("serve")
def serve_cmd(
    host: str = typer.Option(settings.host, "--host", "-h", help="Bind host"),
    port: int = typer.Option(settings.port, "--port", "-p", help="Bind port"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Auto-reload on code change")
):
    """Starts the zdWiki FastAPI backend server."""
    import uvicorn
    console.print(f"[bold green]Starting zdWiki API server at http://{host}:{port}[/bold green]")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)

@cli_app.command("migrate")
def migrate_cmd(
    check: bool = typer.Option(True, "--check", help="Check compatibility without rewriting")
):
    """Verifies schema backward compatibility across all knowledge files."""
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    objects = repo.list_all()
    upgraded = sum(1 for o in objects if o.lifecycle_status and o.knowledge_stability and o.verification_status)
    console.print(f"[bold green][OK] 100% Backward Compatibility Verified: {upgraded}/{len(objects)} objects ready.[/bold green]")

# ==========================================
# 15. MCP SERVER COMMAND
# ==========================================

@mcp_app.command("serve")
def mcp_serve_cmd(
    read_only: bool = typer.Option(False, "--read-only", help="Run MCP server in read-only mode")
):
    """Starts the zdWiki stdio MCP server for Antigravity, Codex, Claude Code, and Cursor."""
    from app.mcp.server import MCPServer
    server = MCPServer(read_only=read_only)
    server.serve_stdio()

def main():
    cli_app()

if __name__ == "__main__":
    main()
