---
id: concept-http-methods
type: concept
title: HTTP Request Methods & Idempotency
domains:
- software_engineering
- api
- networking
tags:
- http
- methods
- idempotency
- rfc9110
- rest
summary: Standard HTTP methods defined in RFC 9110, categorizing operations by safety
  and idempotency.
relations:
  defined_by:
  - source-rfc-9110-http-semantics-methods-idempotency
  implemented_by:
  - pat-idempotency-key
  related_to:
  - concept-rest-api
sources:
- source-rfc-9110-http-semantics-methods-idempotency
status: source-backed
---

## Goal / Purpose
Provide a standardized protocol vocabulary for client-server communication across distributed systems.

## Mental Model
HTTP methods classify resource operations along two orthogonal dimensions:
1. **Safety**: Read-only semantics with no intended server state mutations (GET, HEAD, OPTIONS).
2. **Idempotency**: Multiple identical executions produce the exact same final system state as a single execution (GET, PUT, DELETE).

## Method Matrix
| Method | Safe? | Idempotent? | RFC 9110 Defined Semantics |
| :--- | :---: | :---: | :--- |
| **GET** | Yes | Yes | Retrieve representation of target resource |
| **POST** | No | No | Process request payload according to resource logic |
| **PUT** | No | Yes | Replace target resource state entirely |
| **PATCH** | No | No | Apply partial modifications to resource |
| **DELETE** | No | Yes | Remove target resource |

## Key Invariants
- Safe methods MUST NOT induce side-effects that alter business state.
- Retrying an idempotent request (e.g. network failure on PUT) is inherently safe and guaranteed not to create duplicate records.
