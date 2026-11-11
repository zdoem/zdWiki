# Project Context & Version-Aware Retrieval Specification

This document explains why **Project Context** is critical to preventing hallucinated, out-of-date, or incompatible code suggestions, and how zdWiki resolves version-specific knowledge.

---

## 1. The Context Challenge

In modern engineering, the "correct" solution depends heavily on the project's runtime versions and architectural constraints:
- In **Java 21 + Spring Security 6**: The correct pattern is `SecurityFilterChain` bean definitions.
- In **Java 8 + Spring Security 5**: The legacy pattern `WebSecurityConfigurerAdapter` is still active.
- In **FastAPI (Pydantic v2)**: Use `model_validate()` instead of deprecated `from_orm()`.

If an AI agent searches without project context, it risks injecting deprecated or incompatible code patterns.

---

## 2. Project Context Contract (`.zdwiki/project.yaml`) `[PROPOSED / CONTRACT]`

Projects utilizing zdWiki can declare their operational context in `.zdwiki/project.yaml`:

```yaml
# .zdwiki/project.yaml — Project Context Declaration
project_name: enterprise-billing-service
version: 2.4.0

context:
  language:
    java: "21"
    python: "3.11"

  framework:
    spring_boot: "3.2.x"
    spring_security: "6.2.x"
    fastapi: "0.110.x"

  database:
    postgresql: "15"
    redis: "7.0"

  runtime:
    docker: true
    kubernetes: "1.28"

domains:
  - backend
  - api
  - security
  - accounting
```

---

## 3. How Context-Aware Retrieval Works

When a search query is executed, zdWiki passes the `ProjectContext` to the retrieval engine:

```text
               User Query: "Spring Security Authentication"
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       Project A (.zdwiki/project.yaml)  Project B (.zdwiki/project.yaml)
       - Java: 21                        - Java: 8
       - Spring Security: 6.x            - Spring Security: 5.x
                  │                               │
                  ▼                               ▼
       [ Retrieval Re-Ranking ]          [ Retrieval Re-Ranking ]
                  │                               │
                  ▼                               ▼
       Top Match:                        Top Match:
       SecurityFilterChain Pattern       WebSecurityConfigurerAdapter
       (Lifecycle: Current)              (Lifecycle: Legacy / Compatible)
```

### Key Principles:
1. **Preservation of History**: Legacy knowledge is never destroyed or deleted; it is cataloged with `lifecycle_status: legacy`.
2. **Dynamic Priority**: High-version projects boost `current` knowledge matching their runtime; legacy projects safely retrieve compatible patterns.
3. **Explicit Cross-References**: Modern objects link back to the legacy objects they supersede using `relations.supersedes`.
