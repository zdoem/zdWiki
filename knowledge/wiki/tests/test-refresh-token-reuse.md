---
id: test-refresh-token-reuse
type: test
title: Concurrent Refresh Token Reuse Test
domains:
- testing
- security
tags:
- test
- concurrency
- jwt
- refresh-token
summary: Integration test that issues 50 parallel requests with the same refresh token
  to ensure atomic rotation.
relations:
  verifies:
  - bug-refresh-token-race
status: active
---

### Test Specification
`pytest -k test_concurrent_refresh_token_reuse`
