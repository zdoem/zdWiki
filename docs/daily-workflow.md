# Daily Engineering Workflow with zdWiki

This guide demonstrates how a software engineer and an AI coding agent collaborate using **zdWiki** during a real day-to-day engineering task.

---

## 1. Two Primary Working Modes

zdWiki is designed to support both human-centric and agent-centric workflows using the same canonical knowledge base:

```text
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│        Mode A: Human-First           │     │        Mode B: Agent-First           │
│                                      │     │                                      │
│  Engineer                            │     │  Engineer                            │
│     ↓                                │     │     ↓                                │
│  zdWiki Web Console (Explore/Search) │     │  Coding Agent (Antigravity/Claude)   │
│     ↓                                │     │     ↓                                │
│  Coding IDE (Build & Test)           │     │  zdWiki CLI / API (Retrieve/Loop)    │
│     ↓                                │     │     ↓                                │
│  Commit Verified Lessons             │     │  Engineer Reviews in zdWiki Web      │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## 2. Recommended Screen & Workspace Layout

For maximum productivity during daily development:

```text
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│              PRIMARY SCREEN (IDE)             │            SECONDARY SCREEN (zdWiki)          │
│                                               │                                               │
│  Antigravity IDE / VS Code / Cursor           │  zdWiki Web Console (http://localhost:3000)  │
│                                               │                                               │
│  - Code Editor & Terminal                     │  - Context Graph & Relationship Explorer      │
│  - Test Execution                             │  - Domain Taxonomy & Architecture Specs       │
│  - AI Coding Agent Chat                       │  - Knowledge Health & Review Ledger           │
│                                               │                                               │
│  [ Implementation & Verification ]            │  [ Knowledge Navigation & Approval ]          │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 3. End-to-End Walkthrough: Payment Approval REST API

Consider a typical scenario: **Implementing a Payment Approval REST API** with idempotency, authorization rules, and database transactions.

```text
Engineer
   ↓
Open project in Antigravity
   ↓
Open zdWiki Web Console
   ↓
Agent reads project context (.zdwiki/project.yaml)
   ↓
Agent queries zdWiki for relevant patterns (REST idempotency, JWT auth, ACID)
   ↓
Plan (Create small, verified implementation plan)
   ↓
Implement (Write endpoint and service logic)
   ↓
Test (Run automated test suites)
   ↓
[Failure Occurs] → Diagnose (Inspect Bug & Playbook records in zdWiki)
   ↓
Fix (Apply minimum justified code fix)
   ↓
Re-test (Verify tests pass 100%)
   ↓
Verify (Check acceptance criteria & evidence gate)
   ↓
Learn (Propose new Debug Playbook / Test / Bug lesson)
   ↓
Human reviews in zdWiki Web Console
   ↓
Commit persistent Markdown knowledge to Git
```

---

## 4. Detailed Stage Breakdown

### Stage 1: Retrieval & Context Setup
Before writing code, the engineer or agent queries zdWiki for verified patterns:
```bash
# Agent CLI query
python zdwiki.py search "http idempotency retry"
python zdwiki.py search "jwt refresh token"
```
The search returns `concept-rest-api`, `test-http-idempotency`, and `concept-acid-transactions`.

### Stage 2: Implementation & Testing
The agent implements the endpoint following the canonical pattern. Tests are executed immediately:
```bash
pytest tests/test_payment_api.py -v
```

### Stage 3: Diagnosis via Playbooks (If Failure Happens)
If a concurrency race or HTTP 502 occurs, the agent retrieves the relevant playbook:
```bash
python zdwiki.py search "502 Bad Gateway"
```
The agent applies the playbook steps: checking upstream gateway headers, timeout configurations, and connection pooling.

### Stage 4: Learn & Propose Knowledge Update
After resolving the issue and passing all verification gates, the newly discovered behavior is synthesized into a Markdown knowledge object:
- Stored as a new `test`, `bug`, or `debug_playbook` under `knowledge/wiki/`.
- Cross-linked to related technologies (`tech-fastapi`) and domains (`backend`, `api`, `accounting`).

### Stage 5: Human Review & Persistent Commit
1. The engineer opens **Knowledge Health** (`/health`) or **Loops** (`/loops`) in zdWiki Web.
2. The engineer inspects the proposed knowledge changes.
3. The knowledge is committed to Git, immediately benefiting all future agent sessions and human engineers.
