# System Architecture Overview

This document describes the architectural principles, component boundaries, and data flow of **zdWiki v1**.

---

## 1. High-Level Conceptual Topology

```text
                        ┌───────────────────────────────┐
                        │       Human Engineer          │
                        └──────────────┬────────────────┘
                                       │ (Browsing, Approval, Graphs)
                                       ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │                       zdWiki Web Console                          │
    │         (Next.js 14, React 18, React Flow, Dual-Theme UI)         │
    └──────────────────────────────────┬────────────────────────────────┘
                                       │ HTTP / REST
                                       ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │               FastAPI Backend Gateway & CLI / MCP                 │
    │                 (Python 3.10+, Pydantic v2, Typer)                │
    │                                                                   │
    │   • REST API:  http://localhost:8000                              │
    │   • CLI:       python zdwiki.py <command>                         │
    │   • MCP:       python zdwiki.py mcp serve (stdio JSON-RPC 2.0)    │
    └──────────────┬───────────────────┬───────────────────┬────────────┘
                   │                   │                   │
                   ▼                   ▼                   ▼
    ┌─────────────────────────┐ ┌───────────────┐ ┌─────────────────────┐
    │  Knowledge Repository   │ │ Search Engine │ │ LLM Provider Layer  │
    │ (MarkdownKnowledgeRepo) │ │ (SQLite FTS5) │ │ (Gemini/MockProvider│
    └──────────────┬──────────┘ └───────┬───────┘ └─────────────────────┘
                   │                    │
                   ▼                    ▼
    ┌─────────────────────────┐ ┌───────────────┐
    │ Canonical Markdown/Git  │ │ Disposable DB │
    │ (knowledge/wiki/ & raw/)│ │(var/zdwiki.db)│
    └─────────────────────────┘ └───────────────┘
```

---

## 2. Non-Negotiable Architectural Invariants

1. **Markdown is Canonical**:
   All knowledge objects are stored as plain-text Markdown with YAML frontmatter. Git history is the permanent audit trail.
2. **SQLite is Disposable**:
   The SQLite database (`var/zdwiki.db`) contains only derived tables (FTS5 search index, graph links, LLM telemetry). If deleted, running `python zdwiki.py index` completely restores 100% of the index without data loss.
3. **Repository Abstraction**:
   Application layers communicate with `KnowledgeRepository` protocols, never directly reading disk files ad-hoc.
4. **Immutable Raw Sources**:
   Original PDF, HTML, or Markdown source files ingested into `knowledge/raw/` are verified via SHA-256 digests and treated strictly as DATA, never executable instructions.
5. **Bounded Context Retrieval**:
   zdWiki never injects the entire wiki into an LLM prompt. It performs targeted BM25 retrieval and passes only relevant, bounded snippets conforming to token budgets.
6. **Unified Multi-Interface Contract**:
   Web, REST API, CLI, and MCP access the exact same application services, ensuring zero divergent logic.

---

## 3. Multi-Format Ingestion pipeline

The system splits ingestion into clean extraction, safe redaction, and human review boundaries:

1. **Extraction (Parsers)**: Concrete parsers (`MarkdownParser`, `TextParser`, `PdfParser`, `JsonParser`, `YamlParser`) extract text and build a `NormalizedSourceDocument` with `ProvenanceLocator` models.
2. **Redaction (Secrets)**: Pre-indexing scanner detects secret keys/patterns and redacts credential values globally from derived text, keeping raw files immutable but protected.
3. **Compilation & Proposals**: The compiler evaluates parsed chunks against existing canonical wiki files, generating draft Markdown proposals in `knowledge/proposals/` for human review.
4. **Approval**: Only upon explicit human approval does a proposal move into `knowledge/wiki/` to become indexable and searchable.
