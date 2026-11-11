---
id: pat-refresh-token-rotation
type: pattern
title: Refresh Token Rotation
aliases:
  - token-rotation
domains:
  - security
  - backend
tags:
  - security-pattern
  - auth
  - token
summary: Security pattern where every access token refresh issues a new refresh token and invalidates the previous one, revoking the entire token family on detected replay.
relations:
  implements:
    - concept-refresh-token
  related_to:
    - bug-refresh-token-race
status: active
---

# Refresh Token Rotation

## Mechanism
1. Client sends Refresh Token R1.
2. Server validates R1, invalidates R1, and issues (A2, R2).
3. If an attacker replays stolen R1, the server detects reuse and immediately revokes all descendant tokens in the family.
