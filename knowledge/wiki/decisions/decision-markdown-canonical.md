---
id: decision-markdown-canonical
type: decision
title: Markdown as Canonical Knowledge Source
aliases:
  - decision-markdown-truth
domains:
  - software-engineering
  - architecture
tags:
  - adr
  - storage
  - local-first
summary: Architectural decision establishing Markdown with YAML frontmatter as the primary canonical source of truth, while SQLite is a disposable derived index.
relations:
  related_to:
    - arch-modular-monolith
    - tech-sqlite
status: active
---

# Decision: Markdown as Canonical Source

## Context
We need a local-first engineering knowledge repository accessible from VS Code, Obsidian, Git, CLI, and AI agents without vendor lock-in.

## Decision
- Canonical knowledge objects are saved as Markdown + YAML frontmatter in Git.
- SQLite is used purely as a derived index for fast search and relation queries, rebuildable at any time from disk.
