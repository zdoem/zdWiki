# Command Line Interface (CLI) Reference Manual

This manual documents the official **zdWiki v1 CLI Integration Layer**. The CLI provides a deterministic, thin, scriptable, and machine-readable interface for humans and AI coding agents (Antigravity, Codex, Claude Code, Cursor).

---

## 1. Overview & Architecture

```text
Terminal / Agent Subprocess
            │
            ▼
        zdwiki CLI
            │
            ▼
   Application Services
 ├── MarkdownKnowledgeRepository (Canonical Markdown/YAML)
 ├── SQLiteIndexEngine (Disposable FTS5 Index)
 ├── SQLiteFTSSearchEngine (BM25 + ContextAwareRanker)
 ├── IngestionPipeline (Immutable Raw Archive + SHA-256)
 ├── KnowledgeLinter & Maintenance
 └── GeminiProvider / MockProvider
```

### Exit Codes Contract
- `0`: Success
- `1`: General Error / Schema Validation Failure / Critical Doctor Failure
- `2`: Invalid Arguments / Option Validation Error
- `3`: Object / Source / Loop Not Found
- `4`: Verification Hash Mismatch
- `5`: LLM Provider / Upstream Network Failure

---

## 2. Command Tree Reference

```text
zdwiki
├── --version, -v
├── status [--json]
├── doctor [--json]
├── config
│   ├── show [--json]
│   ├── validate [--json]
│   └── path
├── knowledge
│   ├── list [--domain] [--type] [--status] [--limit] [--json]
│   └── get <id> [--json]
├── get <id> [--json] (Convenience Alias)
├── search <query> [--domain] [--type] [--status] [--project] [--top] [--explain-ranking] [--json]
├── context <question> [--project] [--max-context-tokens] [--no-llm] [--json]
├── context-show [--project] [--json]
├── graph <id> [--hops] [--relation] [--json]
├── source
│   ├── list [--json]
│   └── verify <id> [--json]
├── ingest <path> [--title] [--domain] [--dry-run] [--json]
├── index
│   ├── status [--json]
│   ├── rebuild [--json]
│   └── optimize [--json]
├── lint [--quiet] [--json]
├── maintain [--json]
├── loop
│   ├── list [--json]
│   ├── start --title --goal [--related] [--json]
│   ├── get <id> [--json]
│   └── update <id> --stage --status [--note] [--evidence] [--json]
├── lesson
│   └── propose --loop <id> --title --summary [--type] [--domain] [--json]
├── ask <question> [--project] [--max-context-tokens] [--no-llm] [--json]
├── serve [--host] [--port] [--reload]
└── migrate [--check]
```

---

## 3. Detailed Command Reference

### `status`
Displays concise system, index, and knowledge status.
```bash
python zdwiki.py status
python zdwiki.py status --json
```

---

### `doctor`
Runs comprehensive runtime diagnostics (knowledge directory, SQLite FTS5 extension, schema integrity, write permissions, provider configuration).
```bash
python zdwiki.py doctor
python zdwiki.py doctor --json
```

---

### `context <question>` (Agent Command)
Retrieves a bounded knowledge context bundle strictly adhering to token budgets for AI coding agents.
```bash
# Human readable table
python zdwiki.py context "Implement payment approval REST API" --max-context-tokens 4000

# Machine-readable JSON output
python zdwiki.py context "Implement payment approval REST API" --max-context-tokens 6000 --json
```

**JSON Output Schema**:
```json
{
  "query": "Implement payment approval REST API",
  "project_context": { ... },
  "candidate_count": 8,
  "selected_count": 5,
  "estimated_context_tokens": 1240,
  "token_budget": 6000,
  "knowledge_objects": [
    {
      "id": "pat-idempotency-key",
      "type": "pattern",
      "title": "Idempotency-Key Header Pattern",
      "summary": "...",
      "lifecycle_status": "current",
      "verification_status": "source_backed",
      "estimated_tokens": 259,
      "body": "..."
    }
  ],
  "sources": [
    "source-rfc-7519",
    "source-ietf-draft-the-idempotency-key-http-header-field"
  ]
}
```

---

### `search <query>`
Searches knowledge objects using SQLite FTS5 BM25 with version-aware ranking.
```bash
# Basic search
python zdwiki.py search "jwt refresh"

# Project-aware search using project.yaml
python zdwiki.py search "spring security" --project .zdwiki/project.yaml

# Explain BM25 scores and ranking multipliers
python zdwiki.py search "spring security" --explain-ranking --json
```

---

### `knowledge list` & `get <id>`
Lists or retrieves individual knowledge objects.
```bash
# List bugs in backend domain
python zdwiki.py knowledge list --domain backend --type bug --json

# Get knowledge object
python zdwiki.py get concept-jwt-auth --json
```

---

### `graph <id>`
Explores the relationship graph neighborhood around a knowledge entity.
```bash
python zdwiki.py graph concept-jwt-auth --hops 2 --json
```

---

### `source verify <id>`
Verifies raw immutable source integrity via cryptographic SHA-256 hash comparison.
```bash
python zdwiki.py source verify source-rfc-7519 --json
```

---

### `loop` (Engineering Loop for AI Coding Agents)
Enables coding agents to track the strict engineering loop (`Goal → Plan → Test → Diagnose → Fix → Verify → Learn`).
```bash
# 1. Start loop
python zdwiki.py loop start --title "Fix Token Race" --goal "Prevent concurrent reuse" --json

# 2. Record stage evidence
python zdwiki.py loop update loop-20260818-025117 --stage test --status failed --evidence "pytest tests/test_token.py" --json

# 3. Record fix & verification
python zdwiki.py loop update loop-20260818-025117 --stage verify --status completed --evidence "27 passed in 4s" --json

# 4. Propose lesson for knowledge base
python zdwiki.py lesson propose --loop loop-20260818-025117 --title "Token Concurrency Protection" --summary "Use atomic distributed mutex during token rotation" --json
```

---

### `lint` & `maintain`
Runs knowledge validation and deep diagnostic maintenance analysis.
```bash
python zdwiki.py lint
python zdwiki.py maintain --json
```
