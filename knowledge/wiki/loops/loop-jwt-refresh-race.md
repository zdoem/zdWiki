---
id: loop-jwt-refresh-race
type: engineering_loop
title: 'Engineering Loop: JWT Refresh Token Race Condition'
domains:
- security
- backend
- auth
tags:
- jwt
- auth
- race-condition
- refresh-token
summary: Engineering investigation resolving concurrent refresh token reuse and token
  rotation race condition.
status: verified
---

## Engineering Goal
Resolve race condition when concurrent client requests attempt refresh token rotation simultaneously.

### Stage: Goal
Prevent concurrent refresh token reuse.

### Stage: Context
Attached: pat-refresh-token-rotation, concept-jwt-auth.

### Stage: Plan
Implement atomic Redis/DB token exchange mutex with grace period.

### Stage: Test (Failed)
Concurrent requests cause duplicate token generation and invalid session revocation.

### Stage: Diagnose
Root cause: Database transaction lacked row-level lock during token validation.

### Stage: Fix
Implemented SELECT FOR UPDATE on refresh token lookup.

### Stage: Re-test (Passed)
100 concurrent refresh requests handled cleanly without token invalidation.

### Stage: Verify
Verified in integration environment with stress test suite.
