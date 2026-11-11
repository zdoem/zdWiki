---
id: debug-refresh-token-race
type: debug_playbook
title: 'Debug Playbook: Concurrent Refresh Token Race'
domains:
- security
- devops
- backend
tags:
- playbook
- debug
- jwt
- race-condition
summary: Playbook for diagnosing and fixing concurrent refresh token rotation races
  using database locks or Redis mutexes.
relations:
  addresses:
  - bug-refresh-token-race
status: active
---

### Diagnosis Steps
1. Inspect DB transaction isolation level.
2. Ensure atomic token consumption.
