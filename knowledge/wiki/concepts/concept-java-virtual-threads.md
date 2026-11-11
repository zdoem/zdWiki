---
id: concept-java-virtual-threads
type: concept
title: Java 21 Virtual Threads (Project Loom)
aliases:
  - Virtual Threads
  - Java 21 Concurrency
domains:
  - software_engineering
  - backend
  - performance
tags:
  - java
  - java21
  - concurrency
  - virtual-threads
  - loom
summary: Lightweight user-mode threads introduced in Java 21 that decouple Java threads from underlying OS kernel threads.
relations:
  defined_by:
    - source-oracle-java-21-specs
  related_to:
    - concept-java-streams-lambda
sources:
  - source-oracle-java-21-specs
status: current
knowledge_scope: version_specific
knowledge_stability: high
verification_status: source_backed
technology:
  name: java
version:
  introduced_in: "21"
  min: "21"
evidence:
  - source_id: source-oracle-java-21-specs
    tier: Tier A
    verification: source_backed
    version_context: "Java 21 LTS"
---

## Goal / Purpose
Enable high-throughput concurrent server applications using the simple synchronous thread-per-request programming model without kernel thread overhead.

## Architecture & Mechanisms
- Unlike standard platform threads mapped 1:1 to OS kernel threads, virtual threads are managed in user space by the JVM runtime.
- Millions of virtual threads can run concurrently on a small carrier thread pool (ForkJoinPool).
- When a virtual thread encounters blocking I/O (e.g. database query, socket read), the JVM runtime unmounts it from the carrier thread until the I/O completes.

## Version Compatibility
- **Introduced in**: Java 21 LTS (JEP 444)
- **Incompatible with**: Java 8, Java 11, Java 17
