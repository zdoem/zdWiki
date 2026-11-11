---
id: concept-http-caching
type: concept
title: HTTP Caching & Freshness Validation
domains:
- software_engineering
- api
- performance
- networking
tags:
- http
- caching
- rfc9111
- etag
- performance
summary: RFC 9111 caching mechanisms utilizing Cache-Control directives and conditional
  ETag/Last-Modified validators.
relations:
  defined_by:
  - source-rfc-9111-http-caching-standards
  related_to:
  - concept-rest-api
sources:
- source-rfc-9111-http-caching-standards
status: source-backed
---

## Goal / Purpose
Reduce network bandwidth, eliminate redundant server computation, and minimize request latency through distributed edge and client caching.

## Freshness vs Validation
1. **Freshness (`Cache-Control`)**:
   - `max-age=3600`: Cache can serve response without contacting server for 1 hour.
   - `no-cache`: Cache MUST revalidate with server before serving cached response.
   - `no-store`: Never write response to disk or cache storage.
2. **Conditional Validation (`ETag`)**:
   - Server returns `ETag: "v1-abc123hash"`.
   - Client subsequent request includes `If-None-Match: "v1-abc123hash"`.
   - If unchanged, server returns `304 Not Modified` with empty body (0 payload transfer).
