# Architecture & System Design — zdWiki v1

## Conceptual Model

```text
Canonical Markdown + YAML Frontmatter (knowledge/wiki/ & knowledge/sources/)
      │
      ├── MarkdownKnowledgeRepository (I/O, Parse, Validation)
      │
      └── SQLite Index Engine (var/zdwiki.db)
            ├── FTS5 Virtual Table (BM25 Full Text Index)
            ├── Objects & Relational Graph (Relations, Domains, Tags, Aliases)
            ├── Activities Audit Log
            └── LLM Usage Tracking
```

## Layer Boundaries & Interfaces

1. **Repository Layer (`KnowledgeRepository`)**:
   - Application code interacts only with the abstract protocol `KnowledgeRepository`.
   - Concrete implementation: `MarkdownKnowledgeRepository`.
   - Filepaths and directories are resolved transparently.

2. **Index & Search Layer (`SearchEngine`)**:
   - `SQLiteFTSSearchEngine` implements BM25 ranking, domain and tag filters, and graph expansion without requiring LLM dependencies for basic searches.
   - Deleting `var/zdwiki.db` causes zero permanent data loss; rebuilding restores 100% of search functionality.

3. **LLM Provider Layer (`BaseLLMProvider`)**:
   - `GeminiProvider`: communicates with Google Gemini API via official SDK using environment variable `GEMINI_API_KEY`.
   - `MockLLMProvider`: deterministic mock provider used for automated testing.
   - Future extensions (`OpenAIProvider`, `LocalModelProvider`) implement `BaseLLMProvider` without altering core application logic.

4. **Web Frontend Architecture**:
   - Next.js 14 App Router with standalone React client components.
   - React Flow for 1-hop and 2-hop interactive local context graphs.
   - Tailored developer UI with dark mode, type badges, and real-time FTS5 search.
