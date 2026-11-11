import json
import pytest
from typer.testing import CliRunner
from app.cli.main import cli_app

runner = CliRunner()

def test_cli_version():
    res = runner.invoke(cli_app, ["--version"])
    assert res.exit_code == 0
    assert "zdWiki CLI v1.0.0" in res.stdout

def test_cli_status_json():
    res = runner.invoke(cli_app, ["status", "--json"])
    assert res.exit_code == 0
    data = json.loads(res.stdout)
    assert data["zdwiki_version"] == "1.0.0"
    assert data["total_objects"] >= 40
    assert data["index_engine"] == "SQLite FTS5"
    assert data["index_status"] == "ready"

def test_cli_doctor_json():
    res = runner.invoke(cli_app, ["doctor", "--json"])
    assert res.exit_code == 0
    data = json.loads(res.stdout)
    assert data["is_healthy"] is True
    assert len(data["checks"]) >= 4

def test_cli_config_commands():
    res = runner.invoke(cli_app, ["config", "show", "--json"])
    assert res.exit_code == 0
    data = json.loads(res.stdout)
    assert "host" in data
    assert "port" in data
    assert "knowledge_dir" in data

    res_val = runner.invoke(cli_app, ["config", "validate", "--json"])
    assert res_val.exit_code == 0
    val_data = json.loads(res_val.stdout)
    assert val_data["valid"] is True

def test_cli_knowledge_list_and_get():
    res = runner.invoke(cli_app, ["knowledge", "list", "--json", "--limit", "5"])
    assert res.exit_code == 0
    items = json.loads(res.stdout)
    assert isinstance(items, list)
    assert len(items) > 0

    first_id = items[0]["id"]
    res_get = runner.invoke(cli_app, ["get", first_id, "--json"])
    assert res_get.exit_code == 0
    obj_data = json.loads(res_get.stdout)
    assert obj_data["id"] == first_id

def test_cli_knowledge_not_found_exit_code():
    res = runner.invoke(cli_app, ["get", "non-existent-object-id-9999", "--json"])
    assert res.exit_code == 3
    data = json.loads(res.stdout)
    assert data["code"] == 3

def test_cli_search_json_and_explain():
    res = runner.invoke(cli_app, ["search", "jwt authentication", "--json"])
    assert res.exit_code == 0
    data = json.loads(res.stdout)
    assert data["query"] == "jwt authentication"
    assert len(data["results"]) > 0

    res_exp = runner.invoke(cli_app, ["search", "jwt authentication", "--explain-ranking"])
    assert res_exp.exit_code == 0
    assert "BM25" in res_exp.stdout or "Multiplier" in res_exp.stdout

def test_cli_context_retrieval_token_budget():
    res = runner.invoke(cli_app, [
        "context",
        "implement secure payment API",
        "--max-context-tokens", "4000",
        "--json"
    ])
    assert res.exit_code == 0
    data = json.loads(res.stdout)
    assert data["query"] == "implement secure payment API"
    assert data["estimated_context_tokens"] <= 4000
    assert len(data["knowledge_objects"]) > 0
    assert "token_budget" in data

def test_cli_graph_command():
    res = runner.invoke(cli_app, ["graph", "concept-jwt-auth", "--hops", "2", "--json"])
    assert res.exit_code == 0
    data = json.loads(res.stdout)
    assert data["center_id"] == "concept-jwt-auth"
    assert "nodes" in data
    assert "edges" in data

def test_cli_source_list_and_verify():
    res = runner.invoke(cli_app, ["source", "list", "--json"])
    assert res.exit_code == 0
    sources = json.loads(res.stdout)
    assert len(sources) > 0

    res_verify = runner.invoke(cli_app, ["source", "verify", "source-rfc-7519", "--json"])
    assert res_verify.exit_code == 0
    v_data = json.loads(res_verify.stdout)
    assert v_data["source_id"] == "source-rfc-7519"
    assert "status" in v_data

def test_cli_ingest_dry_run():
    res = runner.invoke(cli_app, ["ingest", "README.md", "--dry-run", "--json"])
    assert res.exit_code == 0
    data = json.loads(res.stdout)
    assert data["status"] == "dry_run"
    assert "size_bytes" in data

def test_cli_index_status_and_optimize():
    res_status = runner.invoke(cli_app, ["index", "status", "--json"])
    assert res_status.exit_code == 0
    data = json.loads(res_status.stdout)
    assert data["ready"] is True

    res_opt = runner.invoke(cli_app, ["index", "optimize", "--json"])
    assert res_opt.exit_code == 0
    opt_data = json.loads(res_opt.stdout)
    assert opt_data["status"] == "success"

def test_cli_lint_and_maintain():
    res_lint = runner.invoke(cli_app, ["lint", "--json"])
    assert res_lint.exit_code == 0
    lint_data = json.loads(res_lint.stdout)
    assert lint_data["is_healthy"] is True

    res_maint = runner.invoke(cli_app, ["maintain", "--json"])
    assert res_maint.exit_code == 0
    maint_data = json.loads(res_maint.stdout)
    assert "total_scanned" in maint_data

def test_cli_loop_lifecycle_and_lesson_proposal():
    # 1. Start loop
    res_start = runner.invoke(cli_app, [
        "loop", "start",
        "--title", "Automated CLI Test Loop",
        "--goal", "Verify engineering loop workflow via CLI",
        "--json"
    ])
    assert res_start.exit_code == 0
    start_data = json.loads(res_start.stdout)
    loop_id = start_data["loop_id"]

    # 2. Update loop stage
    res_update = runner.invoke(cli_app, [
        "loop", "update", loop_id,
        "--stage", "test",
        "--status", "completed",
        "--note", "Automated test execution passed",
        "--evidence", "pytest apps/api/tests/test_cli.py",
        "--json"
    ])
    assert res_update.exit_code == 0

    # 3. Get loop
    res_get = runner.invoke(cli_app, ["loop", "get", loop_id, "--json"])
    assert res_get.exit_code == 0
    get_data = json.loads(res_get.stdout)
    assert get_data["id"] == loop_id

    # 4. Propose lesson
    res_lesson = runner.invoke(cli_app, [
        "lesson", "propose",
        "--loop", loop_id,
        "--title", "Test Automation Loop Finding",
        "--summary", "CLI tests ensure regression-free command contracts",
        "--json"
    ])
    assert res_lesson.exit_code == 0
    lesson_data = json.loads(res_lesson.stdout)
    assert lesson_data["status"] == "proposal_generated"
    assert "draft_markdown" in lesson_data

def test_cli_ask_mock_provider():
    res = runner.invoke(cli_app, [
        "ask",
        "How does JWT expiry verification work?",
        "--no-llm",
        "--json"
    ])
    assert res.exit_code == 0
    data = json.loads(res.stdout)
    assert "answer" in data
    assert "knowledge_objects_used" in data
