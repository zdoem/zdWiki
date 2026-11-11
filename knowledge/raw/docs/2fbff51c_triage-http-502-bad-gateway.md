# Technical Triage: HTTP 502 Bad Gateway
Category: Engineering Triage Playbook

## Summary
An HTTP 502 Bad Gateway status code indicates that the server, while acting as a gateway or proxy (e.g. Nginx, Envoy, Cloudflare), received an invalid or null response from the inbound upstream backend server (e.g. Uvicorn, Gunicorn, Node.js).

## Primary Root Causes
1. **Upstream Process Crash / OOM**: Backend server terminated unexpectedly or was killed by Linux OOM killer.
2. **Upstream Timeout / Hang**: Backend application blocked on database lock or infinite loop exceeding proxy timeout.
3. **Socket / Port Misconfiguration**: Reverse proxy connecting to wrong host/port or socket file permissions mismatch.
4. **Response Header Overflow**: Backend sent HTTP response headers larger than proxy buffer size.
