---
id: concept-acid-transactions
type: concept
title: ACID Transaction Principles
aliases:
  - ACID Properties
  - Database Transactions
domains:
  - software_engineering
  - database
tags:
  - acid
  - database
  - transactions
  - atomicity
  - consistency
  - isolation
  - durability
summary: Fundamental principles ensuring reliable transaction processing in database management systems.
relations:
  defined_by:
    - source-database-acid-principles
  related_to:
    - tech-sqlite
sources:
  - source-database-acid-principles
status: current
knowledge_scope: fundamental
knowledge_stability: high
verification_status: verified
evidence:
  - source_id: source-database-acid-principles
    tier: Tier A
    verification: verified
---

## Goal / Purpose
Guarantee data integrity and consistency during concurrent operations and system crashes in relational and transactional database management systems.

## Mental Model: The Four Pillars
1. **Atomicity (All-or-Nothing)**: All operations within a transaction execute completely, or none are applied. On failure, the database rolls back to its pre-transaction state.
2. **Consistency (Valid State Transitions)**: Transactions only transition the database from one valid state to another, strictly enforcing all schema constraints, foreign keys, and invariants.
3. **Isolation (Concurrency Control)**: Uncommitted changes made by one transaction are invisible to concurrent transactions according to the selected isolation level (e.g. Read Committed, Repeatable Read, Serializable).
4. **Durability (Fault Tolerance)**: Once a transaction commits, its recorded modifications survive crashes, power outages, and system restarts (typically guaranteed via write-ahead logging).

## Fundamental Stability
ACID principles represent foundational computer science theory. They remain universally valid and immune to calendar file age or version churn.
