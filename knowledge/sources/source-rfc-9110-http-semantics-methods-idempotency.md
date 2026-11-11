---
id: source-rfc-9110-http-semantics-methods-idempotency
type: source
title: 'RFC 9110: HTTP Semantics - Methods & Idempotency'
tags:
- http
- rfc9110
- standards
- idempotency
- methods
summary: '# RFC 9110: HTTP Semantics Status: Internet Standard (IETF STD 97) Authors:
  R. Fielding, M. Nottingham, J. Reschke ## Abstract The Hypertext Transfer Protocol
  (HTTP) is a stateless application-level p'
created_at: '2026-08-17T03:45:29.853525'
updated_at: '2026-08-17T03:45:29.853525'
status: active
---

## Source Metadata
- **Raw Path**: `raw/docs/128cef5d_rfc9110-http-semantics.md`
- **SHA256**: `128cef5da54a72aa664dc02c10680cc868ba3e99bca4e7ca6000310b4cad1f16`
- **URL**: N/A
- **Ingested At**: 2026-08-17T03:45:29.853525

## Extracted Content

# RFC 9110: HTTP Semantics
Status: Internet Standard (IETF STD 97)
Authors: R. Fielding, M. Nottingham, J. Reschke

## Abstract
The Hypertext Transfer Protocol (HTTP) is a stateless application-level protocol for distributed, collaborative, hypertext information systems. This document defines the HTTP semantics, request methods, response status codes, and message header fields.

## Core Concepts
### Safe Methods
Request methods are considered 'safe' if their defined semantics are essentially read-only; i.e., the client does not request, and does not expect, any state change on the origin server.
Safe methods: GET, HEAD, OPTIONS, TRACE.

### Idempotent Methods
A request method is considered 'idempotent' if the intended effect on the server of multiple identical requests with that method is the same as the effect for a single such request.
Idempotent methods: GET, HEAD, PUT, DELETE, OPTIONS, TRACE.
Non-idempotent methods: POST, PATCH, CONNECT.

### Method Semantics
- GET: Transfer a current representation of the target resource.
- POST: Perform resource-specific processing on the request payload.
- PUT: Replace all current representations of the target resource with the request payload.
- DELETE: Remove all current representations of the target resource.
- PATCH: Apply partial modifications to a resource.
