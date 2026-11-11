---
id: test-http-idempotency
type: test
title: HTTP Idempotent Retry Test Suite
domains:
- software_engineering
- testing
- api
tags:
- test
- integration-testing
- http
- idempotency
- concurrency
summary: Automated integration test verifying that concurrent and repeated POST requests
  with matching Idempotency-Key return identical responses without duplicate records.
relations:
  verifies:
  - pat-idempotency-key
  related_to:
  - concept-http-methods
sources:
- source-ietf-draft-the-idempotency-key-http-header-field
status: tested
---

## Test Specification
Issue 20 concurrent HTTP POST requests with identical payload and matching `Idempotency-Key: test-uuid-001`.

## Acceptance Criteria
1. Server executes underlying business transaction exactly ONCE.
2. All 20 requests receive identical HTTP 201 Created responses and payload bodies.
3. Database record count increments by exactly 1.
