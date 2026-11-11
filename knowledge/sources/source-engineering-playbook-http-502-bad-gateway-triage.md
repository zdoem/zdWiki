---
id: source-engineering-playbook-http-502-bad-gateway-triage
type: source
title: 'Engineering Playbook: HTTP 502 Bad Gateway Triage'
tags:
- http
- playbook
- debug
- '502'
- nginx
- proxy
- fastapi
summary: '# Technical Triage: HTTP 502 Bad Gateway Category: Engineering Triage Playbook
  ## Summary An HTTP 502 Bad Gateway status code indicates that the server, while
  acting as a gateway or proxy (e.g. Nginx,'
created_at: '2026-08-17T03:45:29.983672'
updated_at: '2026-08-17T03:45:29.983672'
status: active
---

## Source Metadata
- **Raw Path**: `raw/docs/2fbff51c_triage-http-502-bad-gateway.md`
- **SHA256**: `2fbff51cc191cb525a948c15f01abe11f2be16c3337c6d6ed892d5636483d9f5`
- **URL**: N/A
- **Ingested At**: 2026-08-17T03:45:29.983672

## Extracted Content

# Technical Triage: HTTP 502 Bad Gateway
Category: Engineering Triage Playbook

## Summary
An HTTP 502 Bad Gateway status code indicates that the server, while acting as a gateway or proxy (e.g. Nginx, Envoy, Cloudflare), received an invalid or null response from the inbound upstream backend server (e.g. Uvicorn, Gunicorn, Node.js).

## Primary Root Causes
1. **Upstream Process Crash / OOM**: Backend server terminated unexpectedly or was killed by Linux OOM killer.
2. **Upstream Timeout / Hang**: Backend application blocked on database lock or infinite loop exceeding proxy timeout.
3. **Socket / Port Misconfiguration**: Reverse proxy connecting to wrong host/port or socket file permissions mismatch.
4. **Response Header Overflow**: Backend sent HTTP response headers larger than proxy buffer size.
