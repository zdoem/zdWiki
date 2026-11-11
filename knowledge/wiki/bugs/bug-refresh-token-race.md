---
id: bug-refresh-token-race
type: bug
title: JWT Refresh Token Race Condition Bug
domains:
- security
- backend
tags:
- jwt
- bug
- concurrency
- race-condition
summary: Concurrent refresh requests with the same refresh token caused race condition
  and premature invalidation.
relations:
  resolved_by:
  - debug-refresh-token-race
  verified_by:
  - test-refresh-token-reuse
status: active
---

### Bug Description
When two API requests arrive simultaneously with the same refresh token, both attempt rotation without locking.
