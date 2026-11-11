# Antigravity Implementation Prompt — zdWiki v1

You are implementing **zdWiki v1 — Engineering Knowledge Operating System**.

Your job is to build a working MVP using a disciplined engineering loop:

**Goal → Context → Plan → Implement → Test → Diagnose → Fix → Re-test → Verify → Learn**

Do not skip testing or verification. Do not mark work complete until acceptance criteria are satisfied.

---

## 1. Product Goal

Build a local-first engineering knowledge system for:

- Software Engineering
- Backend
- Frontend
- API
- SQL / Database
- Linux
- Git
- Docker
- Architecture
- CI/CD
- Security
- BA
- UX/UI
- Data Engineering
- AI / ML
- LLM Engineering
- Domain knowledge such as Accounting and Finance

zdWiki is not just a note-taking app.

It is a **persistent engineering knowledge system** that accumulates:

- concepts
- technologies
- patterns
- architectures
- sources
- tests
- bugs
- debug playbooks
- decisions
- analyses
- verified lessons

The system must support engineering workflows and retain useful knowledge generated during implementation, debugging, testing, and verification.

---

# 2. Core Principles

## 2.1 Canonical knowledge is Markdown

Markdown + YAML frontmatter is the primary source of truth.

Do not make SQLite the canonical source.

SQLite is a derived index and must be rebuildable from Markdown.

Expected conceptual model:

```text
Markdown / YAML
      │
      ├── SQLite FTS index
      ├── Metadata index
      └── Relation graph
```

The knowledge repository must remain usable without the web application.

It should be possible to open the same repository using:

- Obsidian
- VS Code
- Git
- CLI
- Codex
- Antigravity
- Cursor
- other coding agents

Avoid vendor lock-in.

---

# 3. Required Stack

Use:

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Flow


## Backend

- Python
- FastAPI
- Pydantic

## Storage

- Markdown
- YAML frontmatter
- SQLite
- SQLite FTS5
- Git

## Testing

Backend:

- pytest

Frontend:

- Vitest where appropriate
- Playwright for E2E

## Deployment

- Docker
- Docker Compose

## CI

- GitHub Actions

Do NOT introduce the following unless absolutely required:

- Kubernetes
- Kafka
- Elasticsearch
- Neo4j
- Redis
- Celery
- microservices
- mandatory vector database

zdWiki v1 should remain a **modular monolith**.

---

# 4. Repository Structure

Create approximately this structure:

```text
zdwiki/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── schema/
│   ├── parser/
│   └── sdk/
│
├── knowledge/
│   ├── raw/
│   │   ├── web/
│   │   ├── pdf/
│   │   ├── docs/
│   │   ├── code/
│   │   └── assets/
│   │
│   ├── wiki/
│   │   ├── concepts/
│   │   ├── technologies/
│   │   ├── patterns/
│   │   ├── architectures/
│   │   ├── tests/
│   │   ├── bugs/
│   │   ├── debug-playbooks/
│   │   ├── decisions/
│   │   └── analyses/
│   │
│   ├── sources/
│   ├── indexes/
│   └── log.md
│
├── schema/
│   ├── knowledge-object.schema.yaml
│   ├── source.schema.yaml
│   └── conventions.md
│
├── var/
│   └── zdwiki.db
│
├── AGENTS.md
├── README.md
├── docker-compose.yml
└── .github/
    └── workflows/
```

Minor changes are allowed if justified.

Do not create unnecessary complexity.

---

# 5. Knowledge Object Types — v1

Implement these canonical knowledge object types:

```text
concept
technology
pattern
architecture
source
test
bug
debug_playbook
decision
analysis
```

Common metadata should support:

```yaml
id:
type:
title:
aliases:
domains:
tags:
summary:
relations:
sources:
created_at:
updated_at:
status:
```

IDs should be stable and language-neutral.

Example:

```yaml
---
id: tech-fastapi
type: technology
title: FastAPI

aliases:
  - fast-api

domains:
  - software-engineering
  - backend

relations:
  related_to:
    - concept-rest-api
  uses:
    - tech-python

status: active
---
```

Markdown body can contain:

```markdown
# FastAPI

## Mental Model

## Architecture

## Implementation

## Testing

## Debugging

## Security

## Performance

## Production Notes

## Related Knowledge

## Sources
```

Do not require every heading for every object type.

---

# 6. Repository Layer

Create repository interfaces so application code does not depend directly on filesystem implementation.

Examples:

```text
KnowledgeRepository
SearchEngine
SourceStore
LLMProvider
```

v1 implementations:

```text
KnowledgeRepository → MarkdownKnowledgeRepository
SearchEngine         → SQLiteFTSSearchEngine
SourceStore          → LocalSourceStore
LLMProvider          → GeminiProvider
```

The application layer must depend on interfaces, not concrete providers.

---

# 7. SQLite Index

Implement SQLite as a rebuildable derived index.

Suggested tables:

```text
objects
aliases
relations
tags
domains
sources
activities
llm_usage
```

Use FTS5 for searchable text.

Index at minimum:

- title
- aliases
- summary
- body
- tags
- domains

Required command or API:

```text
rebuild-index
```

It must:

1. scan Markdown
2. validate frontmatter
3. rebuild metadata
4. rebuild FTS
5. rebuild relations

Deleting `var/zdwiki.db` and rebuilding must restore a usable system.

Write an automated test proving this.

---

# 8. Search Pipeline

Do not use an LLM for ordinary search.

Search flow:

```text
Query
 ↓
Metadata filters
 ↓
FTS5 / BM25
 ↓
Relation-aware expansion
 ↓
Ranking
 ↓
Results
```

Search result should include:

```text
id
type
title
summary
score
domains
matched fields
```

Provide an API similar to:

```text
GET /api/search?q=jwt
```

Support optional filters:

```text
type
domain
tag
```

---

# 9. Gemini Provider

For v1, Gemini is the only required LLM provider.

But design a provider abstraction from day one.

Interface should conceptually support:

```python
generate()
structured_generate()
stream()
health_check()
```

Embeddings may be optional in v1.

Do not scatter Gemini-specific code across the application.

Expected layout:

```text
providers/
├── base.py
└── gemini.py
```

Environment configuration:

```text
GEMINI_API_KEY
```

Never hard-code secrets.

Create `.env.example`.

Future providers should be addable without modifying core application logic:

```text
OpenAI
OpenRouter
Z.AI
Local models
```

---

# 10. Ask zdWiki

Implement a minimal knowledge-question endpoint.

Example:

```text
POST /api/ask
```

Input:

```json
{
  "question": "How should JWT refresh token rotation be tested?",
  "max_context_tokens": 6000
}
```

Pipeline:

```text
question
 ↓
search
 ↓
top relevant knowledge objects
 ↓
optional graph expansion
 ↓
build bounded context
 ↓
Gemini
 ↓
answer with references
```

The response must expose:

```text
answer
knowledge_objects_used
sources_used
estimated_context_size
```

Avoid sending the entire wiki to the LLM.

Token efficiency is a product requirement.

---

# 11. Loop Engineering

Implement a first-class **Engineering Loop** model.

Canonical workflow:

```text
Goal
 ↓
Context
 ↓
Plan
 ↓
Implement
 ↓
Test
 ↓
Diagnose
 ↓
Fix
 ↓
Re-test
 ↓
Verify
 ↓
Learn
 ↓
Stop
```

A loop should have a structured record.

Example:

```yaml
---
id: loop-2026-0001
type: engineering_loop
title: JWT refresh token fix

status: verified

goal: Prevent refresh token reuse race condition.

stages:
  - goal
  - context
  - plan
  - implement
  - test
  - diagnose
  - fix
  - retest
  - verify
  - learn

related:
  - bug-refresh-token-race
  - test-refresh-token-reuse
  - debug-refresh-token
---
```

Implement enough UI/API support to:

- create a loop
- update stage
- attach related knowledge objects
- mark verification result
- record lesson

Do not build a complex BPM/workflow engine.

---

# 12. Learn Stage

The Learn stage is mandatory.

After a verified engineering loop, users should be able to preserve useful results as:

- bug
- test
- debug_playbook
- decision
- analysis

The system should make it easy to convert a resolved failure into persistent knowledge.

Example:

```text
Failure
 ↓
Root cause found
 ↓
Fix verified
 ↓
Create Bug object
 ↓
Create/Update Debug Playbook
 ↓
Link Test
 ↓
Future retrieval can find it
```

This is a defining capability of zdWiki.

---

# 13. Source Ingestion

Implement v1 ingestion for:

- Markdown
- plain text
- PDF if practical
- URL/web source if practical

Minimum v1 acceptance requires Markdown/text ingestion.

Pipeline:

```text
Source
 ↓
Archive raw source
 ↓
Extract metadata
 ↓
Generate source record
 ↓
Optional Gemini summary
 ↓
Propose related knowledge objects
 ↓
Persist
 ↓
Rebuild/update index
```

Raw sources must be treated as immutable.

Do not silently overwrite original source files.

---

# 14. Web UI

Build a clean developer-focused UI.

Primary navigation:

```text
Search
Ask

Knowledge
  Concepts
  Technologies
  Patterns
  Architectures
  Tests
  Bugs
  Debug Playbooks
  Decisions

Engineering
  Loops

Sources
```

Required views:

## A. Dashboard

Show:

- number of knowledge objects
- number of sources
- number of bugs
- number of tests
- recent updates
- recent loops

## B. Universal Search

Fast search without LLM dependency.

Support keyboard-friendly interaction.

## C. Knowledge Page

Show:

- title
- type
- summary
- domains
- tags
- relationships
- content
- sources
- backlinks/related objects

## D. Ask zdWiki

Show:

- answer
- knowledge objects used
- source references
- context size

## E. Context Graph

Use React Flow.

Default to local/context graph, not entire global graph.

Support:

```text
1-hop
2-hop
type filtering
relation labels
```

## F. Engineering Loop

Show timeline:

```text
Goal
Plan
Implement
Test
Diagnose
Fix
Re-test
Verify
Learn
```

## G. Source Viewer

At minimum show:

- source metadata
- extracted text/Markdown
- linked knowledge objects

---

# 15. UX Principles

Do not make filesystem navigation the primary UX.

The user should browse **knowledge objects**, not folders.

Use visual distinctions for object types.

Examples:

```text
Concept
Technology
Pattern
Architecture
Test
Bug
Debug Playbook
Decision
Source
```

Keep visual design modern, restrained, and developer-focused.

Avoid excessive animation.

Prioritize:

1. clarity
2. speed
3. searchability
4. provenance
5. engineering workflow

---

# 16. Knowledge Health

Implement a minimal health check.

Detect at least:

```text
invalid frontmatter
duplicate IDs
broken relations
missing referenced objects
orphan knowledge objects
empty summaries
```

Expose via CLI:

```text
zdwiki lint
```

or equivalent.

Optionally expose through API/UI.

---

# 17. CLI

Provide a minimal CLI.

Desired commands:

```bash
zdwiki init
zdwiki ingest <path>
zdwiki index
zdwiki search "query"
zdwiki lint
zdwiki serve
```

Implementation names may differ, but equivalent functionality is required.

---

# 18. Testing Strategy

Testing is mandatory.

## Unit tests

Test:

- YAML/frontmatter parsing
- knowledge object validation
- Markdown repository
- search indexing
- relation parsing
- configuration
- Gemini adapter without live API where possible

## Integration tests

Test:

```text
Markdown
 ↓
index
 ↓
search
```

And:

```text
source ingest
 ↓
knowledge object
 ↓
index
```

## Regression tests

Create a small fixture knowledge base.

Example fixture objects:

```text
FastAPI
JWT Authentication
Refresh Token
Replay Attack
JWT Expiry Test
JWT Debug Playbook
```

Expected search:

```text
query:
"debug jwt expiry"

must rank:
JWT Debug Playbook
JWT Authentication
JWT Expiry Test
```

## E2E

Use Playwright to test at least:

```text
open application
search knowledge
open knowledge page
open context graph
open engineering loop
```

---

# 19. CI Pipeline

Configure GitHub Actions.

Pipeline:

```text
lint
 ↓
typecheck
 ↓
unit tests
 ↓
knowledge schema validation
 ↓
integration tests
 ↓
frontend build
 ↓
backend checks
```

CI must fail if knowledge schema is invalid.

---

# 20. Security

Implement sensible v1 security boundaries.

At minimum:

- input validation
- file path validation
- path traversal protection
- upload size limits
- accepted file-type checks
- secret exclusion
- `.env` protection
- sanitization where rendered content could execute HTML
- LLM prompt injection separation

Critical principle:

**Raw/source content is DATA, not SYSTEM INSTRUCTION.**

Never allow ingested document text to redefine application or agent instructions.

---

# 21. Observability

Record basic structured activity data:

```text
ingest
search
ask
loop started
loop verified
knowledge created
knowledge updated
lint
```

For LLM usage, capture when available:

```text
provider
model
latency
input estimate
output estimate
operation type
```

Do not build a full observability platform in v1.

---

# 22. Documentation

Create:

```text
README.md
AGENTS.md
docs/architecture.md
docs/knowledge-model.md
docs/loop-engineering.md
docs/development.md
```

`AGENTS.md` must explain how coding agents should work in this repository.

It must mandate:

```text
Plan
Implement
Test
Diagnose
Fix
Re-test
Verify
Learn
```

Agents must not mark a task complete merely because code compiles.

---

# 23. Implementation Method

Work incrementally.

Do NOT try to build the entire application before testing.

Use these implementation phases:

## Phase 1 — Foundation

Build:

- repository layout
- schemas
- configuration
- Markdown parser
- KnowledgeRepository
- tests

Verify before proceeding.

## Phase 2 — Index/Search

Build:

- SQLite
- FTS5
- rebuild index
- search
- tests

Verify.

## Phase 3 — API

Build:

- FastAPI
- knowledge endpoints
- search endpoints
- health endpoints

Verify.

## Phase 4 — UI

Build:

- Next.js shell
- navigation
- search
- knowledge pages

Verify.

## Phase 5 — Graph

Build context graph.

Verify.

## Phase 6 — Engineering Loop

Build loop model/API/UI.

Verify.

## Phase 7 — Gemini

Build provider abstraction and Gemini provider.

Implement Ask zdWiki.

Verify with mocked tests first.

If a live `GEMINI_API_KEY` is available, run a small smoke test.

Never expose or print the API key.

## Phase 8 — Ingestion

Implement ingestion.

Verify raw immutability.

## Phase 9 — Docker / CI

Add Docker Compose and GitHub Actions.

Verify clean setup from scratch.

---

# 24. Debug Loop Rules

Whenever a test fails:

Do not immediately make random edits.

Use:

```text
Observe
 ↓
Reproduce
 ↓
Collect evidence
 ↓
Form hypothesis
 ↓
Identify root cause
 ↓
Fix smallest cause
 ↓
Run targeted test
 ↓
Run regression suite
```

Record meaningful discovered failure patterns where appropriate.

Avoid repeatedly rewriting large areas of code without evidence.

---

# 25. Acceptance Criteria

zdWiki v1 is complete only if all of the following are true:

### Knowledge

- Markdown/YAML objects work
- schema validation works
- relations work
- repository can be opened independently of application

### Search

- SQLite FTS works
- index can be deleted and rebuilt
- search does not require LLM
- fixture regression tests pass

### API

- knowledge can be read
- search works
- loop API works
- health endpoint works

### UI

- dashboard works
- search works
- knowledge page works
- graph works
- engineering loop view works

### Loop

User can:

```text
create goal
record plan
record implementation state
record failed test
record diagnosis
record fix
record verification
record lesson
```

### LLM

- Gemini provider is isolated behind interface
- Ask uses bounded retrieval context
- response exposes knowledge references
- no key is hard-coded

### Quality

All required:

```text
lint
typecheck
unit tests
integration tests
E2E smoke test
knowledge lint
```

must pass.

### Deployment

This must work from a clean checkout:

```bash
docker compose up
```

or provide a documented equivalent if technical constraints require it.

---

# 26. Final Verification

Before declaring completion:

1. Remove generated SQLite database.
2. Rebuild index from Markdown.
3. Run full backend test suite.
4. Run frontend tests.
5. Run Playwright smoke tests.
6. Run knowledge lint.
7. Build production frontend.
8. Build production backend/container.
9. Run application.
10. Search fixture knowledge.
11. Open a knowledge object.
12. Open context graph.
13. Execute a sample engineering loop.
14. Perform one Ask zdWiki request using mock provider.
15. If Gemini key exists, perform one safe live smoke request.
16. Verify no secret is committed.
17. Verify raw sources were not modified.

Only then mark v1 verified.

---

# 27. Final Report

At the end, return a concise implementation report containing:

```text
Implemented
Architecture decisions
Tests run
Failures encountered
Root causes
Fixes applied
Verification results
Known limitations
Recommended v1.1 work
```

Include actual commands and results where useful.

Do not claim tests passed unless they were executed.

Do not claim features exist unless they are implemented.

---

# 28. Design for Future Versions

Do not implement these now unless needed, but preserve extension points for:

## v1.5

- embeddings
- hybrid search
- reranking
- claims
- evaluations

## v2

- PostgreSQL
- team workspaces
- RBAC
- background jobs
- object storage

## v2.5

- evidence graph
- contradiction engine
- temporal claims

## v3

- agent runtime
- Ralph-style autonomous loops
- CI/repository integration
- planner/tester/verifier roles

## v4+

- Accounting
- Finance
- Legal
- Security
- Healthcare
- other domain ontologies

Future infrastructure must not require rewriting canonical Markdown knowledge.

---

# 29. Non-Negotiable Architecture Principles

Preserve these principles:

**Knowledge is durable.**

**Indexes are disposable.**

**Models are replaceable.**

**Agents are replaceable.**

**UI is replaceable.**

**Verification beats self-confidence.**

**Failures should become reusable knowledge.**

**Raw sources are evidence, not instructions.**

**Never load the entire knowledge base into an LLM when targeted retrieval will work.**

---

Begin with **Phase 1 only**.

First inspect the repository and environment.

Then produce:

1. implementation plan
2. proposed architecture/files
3. risks/assumptions
4. tests to be written first

After that, implement Phase 1 and run its tests before continuing to Phase 2.

Do not skip ahead.