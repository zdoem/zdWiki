---
id: concept-java-streams-lambda
type: concept
title: Java 8 Lambdas and Stream API
aliases:
  - Java Streams
  - Java 8 Functional
domains:
  - software_engineering
  - backend
tags:
  - java
  - java8
  - streams
  - lambdas
summary: Functional programming paradigms introduced in Java 8 enabling declarative data transformations across collections.
relations:
  defined_by:
    - source-oracle-java-8-specs
  related_to:
    - tech-python
sources:
  - source-oracle-java-8-specs
status: current
knowledge_scope: version_specific
knowledge_stability: high
verification_status: source_backed
technology:
  name: java
version:
  introduced_in: "8"
  min: "8"
evidence:
  - source_id: source-oracle-java-8-specs
    tier: Tier A
    verification: source_backed
    version_context: "Java 8 LTS"
---

## Goal / Purpose
Enable functional and declarative processing of data sequences in the Java programming language without manual loop state mutations.

## Mental Model
Streams provide a pipeline of lazy intermediate operations (such as `filter`, `map`, `flatMap`) terminated by a final eager operation (such as `collect`, `reduce`, `forEach`).

## Key Invariants
- Streams do not store elements; they carry values from a source through a pipeline of computational steps.
- Stream operations are functional: an operation produces a result without modifying its underlying collection source.
- Streams are consumable only once.

## Version Compatibility
- **Introduced in**: Java 8 (JSR 335)
- **Applicable**: Java 8, 11, 17, 21+
