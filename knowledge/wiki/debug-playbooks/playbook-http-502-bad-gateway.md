---
id: playbook-http-502-bad-gateway
type: debug_playbook
title: HTTP 502 Bad Gateway Triage Playbook
domains:
- software_engineering
- debugging
- observability
- backend
tags:
- http
- '502'
- bad-gateway
- nginx
- proxy
- debug
- triage
summary: Systematic diagnostic procedure for troubleshooting and fixing HTTP 502 Bad
  Gateway proxy errors between reverse proxies and backend upstreams.
relations:
  defined_by:
  - source-engineering-playbook-http-502-bad-gateway-triage
  related_to:
  - concept-http-methods
sources:
- source-engineering-playbook-http-502-bad-gateway-triage
status: source-backed
---

## Diagnostic Symptom
End users or API clients receive HTTP status 502 Bad Gateway from edge reverse proxy (Nginx, Envoy, Cloudflare).

## Systematic Triage Workflow
```text
Client -> [Proxy / Gateway] -- 502 Bad Gateway -- [Upstream Application]
                                    ^
                           (Socket Drop / Crash / Hang)
```

1. **Step 1: Check Reverse Proxy Error Logs**
   - Nginx: `grep "502" /var/log/nginx/error.log`
   - Check if log shows `Connection refused` (backend down) or `upstream prematurely closed connection`.

2. **Step 2: Check Backend Process & OOM Status**
   - Run `systemctl status api` or `docker compose ps` to see if backend crashed.
   - Check kernel logs for OOM killer: `dmesg -T | grep -i oom` or `journalctl -k | grep -i kill`.

3. **Step 3: Test Upstream Directly (Bypass Proxy)**
   - Execute loopback request directly against backend port: `curl -iv http://127.0.0.1:8000/health`.

4. **Step 4: Check Upstream Concurrency & Timeouts**
   - If backend is hanging on database locks, inspect active connections and timeout limits.
