---
id: pat-idempotency-key
type: pattern
title: Idempotency-Key Header Pattern
domains:
- software_engineering
- api
- backend
tags:
- idempotency
- pattern
- api-design
- distributed-systems
- payments
summary: Architectural pattern enabling safe retries of non-idempotent mutating POST
  operations using client-generated UUID keys.
relations:
  implements:
  - concept-http-methods
  defined_by:
  - source-ietf-draft-the-idempotency-key-http-header-field
  related_to:
  - concept-rest-api
sources:
- source-ietf-draft-the-idempotency-key-http-header-field
status: source-backed
---

## Problem Statement
Network drops and client timeouts during POST requests create ambiguity: did the server execute the transaction before disconnecting? Blindly retrying causes duplicate orders, duplicate billing, or state corruption.

## Solution Architecture
1. Client generates a unique UUID (e.g. `Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`).
2. Server checks transactional key cache:
   - **First Seen**: Acquires distributed lock, processes request, caches status code and response payload.
   - **In Progress**: Returns `409 Conflict` with `Retry-After` header.
   - **Completed**: Directly replays the cached response without re-executing business operations.

## Implementation Guidelines
- Store idempotency keys in fast cache with durable fallback (Redis + PostgreSQL).
- Set TTL between 24 and 72 hours.
- Bind the key to the authenticated client user ID to prevent cross-tenant collisions.
