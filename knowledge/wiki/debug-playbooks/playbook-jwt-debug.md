---
id: playbook-jwt-debug
type: debug_playbook
title: JWT Debug Playbook
aliases:
  - debug-jwt-tokens
domains:
  - security
  - backend
tags:
  - playbook
  - debug
  - jwt
  - expiry
summary: Standard engineering playbook for diagnosing JWT authentication failures, expired token errors, clock drifts, and algorithm mismatches.
relations:
  related_to:
    - concept-jwt-auth
    - test-jwt-expiry
    - bug-refresh-token-race
status: active
---

# JWT Debug Playbook

## Diagnostic Steps
1. **Decode Header & Payload**: Run `jwt decode --no-verify <token>` to inspect `exp`, `nbf`, `iss`, and `alg`.
2. **Check Server Clock Drift**: Ensure NTP time synchronization between client, auth server, and API gateway.
3. **Verify Secret Consistency**: Verify whether the verification key matches the signing private/public keypair.
4. **Inspect Expiry Handling**: Verify whether token expiration is tested using `test-jwt-expiry`.
