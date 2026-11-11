---
id: tech-sqlite
type: technology
title: SQLite
aliases:
  - sqlite3
domains:
  - software-engineering
  - database
tags:
  - database
  - embedded
  - fts5
summary: C-language library that implements a small, fast, self-contained, high-reliability, full-featured SQL database engine with FTS5 full-text indexing.
relations:
  related_to:
    - arch-modular-monolith
status: active
---

# SQLite

## Overview
SQLite stores entire databases in single cross-platform disk files.
- FTS5 module provides full-text search with BM25 ranking.
- Ideal for local-first derived indexes and desktop applications.
