# Knowledge Workflow, Relearning & Lifecycle Specification

This document details the lifecycle of knowledge inside **zdWiki**, including how raw sources are ingested, how knowledge is synthesized, and how the system handles relearning and unlearning.

---

## 1. The Canonical Knowledge Lifecycle

```text
External Source (RFC, Doc, Specs)
      ↓
Raw Evidence Archive (knowledge/raw/ - SHA-256 Verified, Immutable)
      ↓
Source Registry (knowledge/sources/ - Synthesized Reference)
      ↓
Knowledge Synthesis (knowledge/wiki/ - Markdown + YAML)
      ↓
Disposable SQLite Index (var/zdwiki.db - FTS5 BM25)
      ↓
Search & Engineering Use (IDE / Web / CLI)
      ↓
Verification & Learning (Tests & Loops)
      ↓
Updated / Superseded Knowledge (Relearning Loop)
```

---

## 2. Knowledge Object Taxonomy

zdWiki categorizes engineering knowledge into well-defined types:

| Type | Directory | Purpose |
|---|---|---|
| `concept` | `knowledge/wiki/concepts/` | Fundamental theories, protocols, and mechanisms (e.g. ACID, REST). |
| `technology` | `knowledge/wiki/technologies/` | Libraries, frameworks, engines (e.g. FastAPI, SQLite, React). |
| `pattern` | `knowledge/wiki/patterns/` | Design patterns, architectural solutions (e.g. Repository pattern). |
| `architecture` | `knowledge/wiki/architectures/` | System-wide architectures and topologies. |
| `test` | `knowledge/wiki/tests/` | Regression suites, test strategies, and validation scripts. |
| `bug` | `knowledge/wiki/bugs/` | Documented bugs, edge cases, race conditions. |
| `debug_playbook`| `knowledge/wiki/debug-playbooks/`| Step-by-step diagnostic and remediation guides. |
| `decision` | `knowledge/wiki/decisions/` | Architecture Decision Records (ADRs). |
| `analysis` | `knowledge/wiki/analyses/` | Comparative studies, trade-off evaluations. |
| `source` | `knowledge/sources/` | Curated metadata for primary documentation sources. |

---

## 3. Metadata Lifecycle & Verification States

Each knowledge object tracks its lifecycle and verification status via YAML frontmatter:

```yaml
---
id: concept-jwt-authentication
type: concept
title: JWT Authentication Protocol
summary: Stateless token-based authentication using RFC 7519 standards.
domains:
  - backend
  - security
  - api
tags:
  - jwt
  - auth
  - token
lifecycle_status: current       # current | legacy | deprecated | superseded
knowledge_stability: stable    # fundamental | stable | experimental
verification_status: verified   # source_backed | tested | verified | disputed
source_references:
  - source-rfc-7519
relations:
  related:
    - concept-refresh-token
  supersedes: []
---
```

---

## 4. Relearning vs. Unlearning

### Relearning (Updating Knowledge with New Evidence)
When a framework releases a major upgrade (e.g. Spring Security 6 replacing WebSecurityConfigurerAdapter):
1. The new pattern is authored as `current`.
2. It lists the older pattern in `relations.supersedes`.
3. The older pattern is updated to `lifecycle_status: legacy` or `superseded`.
4. History is fully preserved; no knowledge is lost.

### Unlearning (Demoting Invalid or Deprecated Knowledge)
In zdWiki, **unlearning does NOT mean silent deletion**.
- Flawed or deprecated assumptions are explicitly marked with `lifecycle_status: deprecated` and `verification_status: disputed`.
- A warning or diagnostic rationale is documented in the body.
- Future agent searches will avoid deprecated patterns unless explicitly requesting historical legacy contexts.
