# Engineering Loop Guide

The **Engineering Loop** is the disciplined execution standard enforced across zdWiki for human engineers and autonomous coding agents alike.

---

## 1. The Canonical Loop

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
Pass? ──► [No] ──► Observe → Collect Evidence → Hypothesis → Fix ──► Re-Test
  │
 [Yes]
  ↓
Verify (Evidence Gate)
  ↓
Learn (Synthesize & Persist Knowledge)
  ↓
Stop
```

---

## 2. Step-by-Step Breakdown

### 1. Goal
Define the exact objective and boundaries of the change before editing any files.
- *What problem are we solving?*
- *What is explicitly out of scope?*

### 2. Context
Inspect existing files, schemas, tests, and relevant zdWiki documentation.
- Query zdWiki via CLI or API for relevant playbooks, patterns, and tests.
- Identify runtime constraints and versions.

### 3. Plan
Produce a clear, incremental implementation plan with test specifications before making large changes.

### 4. Implement
Make clean, modular, minimal edits adhering to project architecture rules and conventions.

### 5. Test
Execute automated test suites immediately after code modifications. **Never skip testing.**

### 6. Diagnose (When Tests Fail)
When an unexpected failure occurs, follow the scientific method:
1. **Observe**: Capture exact error trace and exit code.
2. **Reproduce**: Run isolated test case.
3. **Collect Evidence**: Read system logs and search zdWiki for related `debug_playbook` records.
4. **Hypothesis**: Formulate clear rationale for the failure.
5. **Fix**: Apply the smallest justified fix targeting the root cause.

### 7. Verify (Evidence Gate)
Prove acceptance criteria are fulfilled with verifiable test logs before marking tasks complete.

### 8. Learn (Knowledge Synthesis)
Record newly discovered lessons, bugs, test strategies, or playbooks into zdWiki:
- Create or update Markdown knowledge object in `knowledge/wiki/`.
- Ensure YAML frontmatter contains valid tags, domains, and relations.
- Rebuild index via `python zdwiki.py index` or Web Console.

---

## 3. Loop Knowledge Artifacts

Engineering work directly generates persistent organizational value:

| Stage Output | Knowledge Object Type | Location |
|---|---|---|
| Recurring Failure Diagnosis | `debug_playbook` | `knowledge/wiki/debug-playbooks/` |
| Regression Scenario | `test` | `knowledge/wiki/tests/` |
| Known Vulnerability / Defect | `bug` | `knowledge/wiki/bugs/` |
| Architectural Choice | `decision` | `knowledge/wiki/decisions/` |
| Technology Evaluation | `analysis` | `knowledge/wiki/analyses/` |
