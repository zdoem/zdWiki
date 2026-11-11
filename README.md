# zdWiki — Engineering Knowledge Operating System

> **zdWiki** is an Engineering Knowledge Operating System that stores persistent, version-aware, source-backed, and verified engineering knowledge across projects, teams, and AI coding agents.

[![Python Tests](https://img.shields.io/badge/pytest-66%20passed-emerald)](file:///apps/api/tests)
[![Next.js 14](https://img.shields.io/badge/next.js-14.2-blue)](file:///apps/web)
[![Architecture](https://img.shields.io/badge/architecture-local--first-brass)](file:///docs/architecture-overview.md)
[![License](https://img.shields.io/badge/license-MIT-purple)](file:///LICENSE)

---

## 🧭 What is zdWiki?

zdWiki is designed to preserve and retrieve engineering knowledge across diverse domains:
- **Core Engineering**: Software Engineering, Backend, Frontend, API Design, SQL / Databases, Linux, Git, Docker, Architecture, CI/CD, Security, Testing, Debugging.
- **Cross-Functional & Data**: Business Analysis (BA), UX/UI Design, Data Engineering, AI / ML, LLM Engineering.
- **Domain Knowledge**: Accounting, Finance, Regulatory & Enterprise Domain Rules.

```text
                        Engineer
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       Coding Agent / IDE           zdWiki Web
              │                         │
              │                         │
        Code / Test / Debug       Human Knowledge UI
              │                         │
              └────────────┬────────────┘
                           ▼
                       zdWiki Core
                ┌──────────┼──────────┐
                ▼          ▼          ▼
               CLI        API        MCP
                │          │          │
                └──────────┼──────────┘
                           ▼
                  Search / Retrieval
                           │
                    Knowledge Graph
                           │
                           ▼
                  Markdown/YAML/Git
```

- **Web UI** = Primarily for humans (browse, explore graph, inspect health, review loops, approve knowledge).
- **CLI / API / MCP** = For agents and automation (retrieve context, search BM25, record loops, propose lessons).
- **Markdown / YAML** = Canonical knowledge source of truth stored in Git.
- **SQLite FTS5** = Disposable, rebuildable derived full-text search index.

---

## 📚 Documentation Index

| Guide | Description |
|---|---|
| [🚀 Getting Started](file:///docs/getting-started.md) | Setup backend, web frontend, dependencies, and environment. |
| [🔌 Model Context Protocol (MCP) Guide](file:///docs/mcp-guide.md) | Official MCP stdio server guide for Antigravity, Claude Code, Cursor, Codex. |
| [🏗️ Architecture Overview](file:///docs/architecture-overview.md) | Layer boundaries, disposable SQLite index, repository interfaces. |
| [🔄 Daily Engineering Workflow](file:///docs/daily-workflow.md) | Step-by-step developer & agent workflow with practical REST API example. |
| [🤖 AI Agent Integration Guide](file:///docs/agent-integration.md) | How Antigravity, Claude Code, Cursor, Codex & other agents integrate. |
| [🌌 Antigravity + zdWiki Integration](file:///docs/antigravity-integration.md) | Recommended workspace layout and coordination between IDE & zdWiki. |
| [🎯 Project Context Specification](file:///docs/project-context.md) | Context-aware retrieval (e.g. Java 21 vs Java 8, Spring 6 vs Spring 5). |
| [🔁 Engineering Loop Guide](file:///docs/engineering-loop-guide.md) | Strict engineering cycle: Goal → Context → Plan → Implement → Test → Learn. |
| [🧠 Knowledge Workflow & Relearning](file:///docs/knowledge-workflow.md) | Raw sources, evidence gates, lifecycle states, relearning and unlearning. |
| [💻 CLI Reference Manual](file:///docs/cli-guide.md) | Complete CLI command catalog, JSON contract, and exit codes. |
| [🔌 REST API Reference](file:///docs/api-guide.md) | Complete FastAPI endpoint specification with real payloads and examples. |
| [🛠️ Troubleshooting Guide](file:///docs/troubleshooting.md) | Common diagnostic procedures, index repair, API connection recovery. |

---

## ⚡ Quick Start

### 1. Backend API & CLI (Python 3.10+)
```bash
# Install dependencies
pip install -r apps/api/requirements.txt

# Initialize repository & rebuild SQLite FTS5 index
python zdwiki.py init
python zdwiki.py index

# Run CLI search & validation linter
python zdwiki.py search "jwt authentication"
python zdwiki.py lint

# Start FastAPI server at http://localhost:8000
python zdwiki.py serve --port 8000
```

### 2. Run MCP Server (for Antigravity / Claude / Cursor / Codex)
```bash
python zdwiki.py mcp serve
```

### 3. Next.js Web Console (Node.js 18+)
```bash
cd apps/web
npm install
npm run dev
# Open http://localhost:3000
```

### 4. Docker Compose
```bash
docker compose up --build
```

---

## 🧪 Testing & Verification
```bash
# Run all backend unit & integration tests (66/66 passing)
pytest apps/api/tests -v

# Run knowledge consistency linter
python zdwiki.py lint

# Run maintenance diagnostics
python zdwiki.py maintain
```

---

## 💡 Core Philosophy
> **Agents come and go. Models come and go. Verified engineering knowledge remains.**
