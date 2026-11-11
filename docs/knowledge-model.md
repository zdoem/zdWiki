# Knowledge Object Model & Conventions

## Canonical Object Types

| Type | Prefix | Description | Directory |
|---|---|---|---|
| `concept` | `concept-` | Fundamental software, domain, or architectural ideas | `knowledge/wiki/concepts/` |
| `technology` | `tech-` | Languages, libraries, frameworks, runtime tools | `knowledge/wiki/technologies/` |
| `pattern` | `pat-` | Reusable design and architectural solutions | `knowledge/wiki/patterns/` |
| `architecture` | `arch-` | High-level system structure, topology, and component design | `knowledge/wiki/architectures/` |
| `test` | `test-` | Concrete verification test procedures or suites | `knowledge/wiki/tests/` |
| `bug` | `bug-` | Documented failure mode, root cause, and verified fix | `knowledge/wiki/bugs/` |
| `debug_playbook` | `playbook-` | Step-by-step diagnostic and remediation guide | `knowledge/wiki/debug-playbooks/` |
| `decision` | `decision-` | Architectural Decision Record (ADR) | `knowledge/wiki/decisions/` |
| `analysis` | `analysis-` | In-depth trade-off, benchmark, or comparative analysis | `knowledge/wiki/analyses/` |
| `engineering_loop` | `loop-` | Record of full Goal → Test → Fix → Learn engineering cycles | `knowledge/wiki/loops/` |
| `source` | `source-` | Ingested documentation, book, paper, or code source | `knowledge/sources/` |

## Frontmatter Schema Example
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
tags:
  - python
  - rest
  - async
summary: Modern, high-performance web framework for Python.
relations:
  uses:
    - tech-python
  related_to:
    - concept-rest-api
    - arch-modular-monolith
sources:
  - source-fastapi-docs
status: active
---
```
