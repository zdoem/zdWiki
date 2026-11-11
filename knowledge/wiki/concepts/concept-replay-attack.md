---
id: concept-replay-attack
type: concept
title: Replay Attack
aliases:
  - token-replay
  - playback-attack
domains:
  - security
  - authentication
tags:
  - jwt
  - oauth2
  - vulnerability
summary: Network attack in which a valid data transmission or token is fraudulently repeated or delayed.
relations:
  related_to:
    - concept-jwt-auth
    - concept-refresh-token
    - bug-refresh-token-race
sources:
  - source-rfc-7519
status: active
created_at: 2026-08-16T10:00:00Z
updated_at: 2026-08-16T10:00:00Z
---

# Replay Attack

A **Replay Attack** is an attack vector where an adversary intercepts a valid authentication token (such as a JWT or refresh token) and retransmits it to authenticate themselves as the legitimate user.

## Mitigation Strategies
1. **Refresh Token Rotation**: Issuing a new refresh token with each request and invalidating old tokens.
2. **One-Time Nonces & JTI**: Using a unique Token ID (`jti`) verified against a distributed cache.
3. **Short Expiry Lifetimes**: Keeping access token lifespans brief (e.g. 5–15 minutes).
