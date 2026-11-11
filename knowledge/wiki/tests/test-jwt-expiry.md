---
id: test-jwt-expiry
type: test
title: JWT Expiry Test
aliases:
  - test-token-expiration
domains:
  - security
  - backend
tags:
  - test
  - jwt
  - expiry
summary: Automated verification test confirming that expired JWT tokens return HTTP 401 Unauthorized across all protected API routes.
relations:
  tests:
    - concept-jwt-auth
  related_to:
    - playbook-jwt-debug
status: active
---

# JWT Expiry Test

## Test Procedure
1. Generate JWT with `exp` in the past (e.g. `now - 60s`).
2. Dispatch GET request to `/api/protected` with `Authorization: Bearer <expired_token>`.
3. Assert response status code is 401 Unauthorized with header `WWW-Authenticate: Bearer error="invalid_token"`.
