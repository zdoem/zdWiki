# zdWiki Conventions & Guidelines

## 1. ID Naming Rules
Every Knowledge Object must have an `id` prefixed by its type and formatted in kebab-case:
- Concept: `concept-<slug>` (e.g. `concept-rest-api`, `concept-jwt-token`)
- Technology: `tech-<slug>` (e.g. `tech-fastapi`, `tech-sqlite`)
- Pattern: `pat-<slug>` (e.g. `pat-refresh-token-rotation`, `pat-circuit-breaker`)
- Architecture: `arch-<slug>` (e.g. `arch-modular-monolith`)
- Test: `test-<slug>` (e.g. `test-jwt-expiry`)
- Bug: `bug-<slug>` (e.g. `bug-refresh-token-race`)
- Debug Playbook: `playbook-<slug>` (e.g. `playbook-jwt-debugging`)
- Decision: `decision-<slug>` (e.g. `decision-use-sqlite-fts5`)
- Analysis: `analysis-<slug>` (e.g. `analysis-jwt-vs-paseto`)
- Source: `source-<slug>` (e.g. `source-rfc-7519`)
- Engineering Loop: `loop-<yyyy>-<nnnn>` (e.g. `loop-2026-0001`)

## 2. Relation Types
Supported relation keys in frontmatter `relations`:
- `related_to`: General conceptual association
- `uses`: Technology or component dependency
- `implements`: Pattern or architecture realization
- `tests`: Test verifying a concept, technology, or fix
- `fixes`: Bug or issue resolution
- `replaces` / `supersedes`: Superseded decision or pattern

## 3. Directory Layout
Canonical markdown files must be placed according to their type:
- `knowledge/wiki/concepts/`
- `knowledge/wiki/technologies/`
- `knowledge/wiki/patterns/`
- `knowledge/wiki/architectures/`
- `knowledge/wiki/tests/`
- `knowledge/wiki/bugs/`
- `knowledge/wiki/debug-playbooks/`
- `knowledge/wiki/decisions/`
- `knowledge/wiki/analyses/`
- `knowledge/wiki/loops/`
- `knowledge/sources/`
- `knowledge/raw/` (immutable raw files)
