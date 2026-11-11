---
id: source-ietf-draft-the-idempotency-key-http-header-field
type: source
title: 'IETF Draft: The Idempotency-Key HTTP Header Field'
tags:
- http
- idempotency
- rest
- api-design
- payments
summary: '# The Idempotency-Key HTTP Header Field Internet-Draft: draft-ietf-httpapi-idempotency-key-04
  Authors: Y. Rosbroj, B. Stark, M. Sridharan ## Abstract The ''Idempotency-Key''
  HTTP request header field al'
created_at: '2026-08-17T03:45:29.905053'
updated_at: '2026-08-17T03:45:29.905053'
status: active
---

## Source Metadata
- **Raw Path**: `raw/docs/68141860_draft-ietf-httpapi-idempotency-key.md`
- **SHA256**: `68141860f94dcd6d42be3d86a01fabc4745a029e2f7e1c4fdd7424ad1e8a660b`
- **URL**: N/A
- **Ingested At**: 2026-08-17T03:45:29.905053

## Extracted Content

# The Idempotency-Key HTTP Header Field
Internet-Draft: draft-ietf-httpapi-idempotency-key-04
Authors: Y. Rosbroj, B. Stark, M. Sridharan

## Abstract
The 'Idempotency-Key' HTTP request header field allows clients to make mutating requests (such as POST) idempotent by providing a unique client-generated identifier.

## Protocol Mechanics
1. **Request**: The client generates a unique UUIDv4 token and attaches it via `Idempotency-Key: <UUID>` header on a POST request.
2. **First Processing**: The server executes the operation within a transactional lock, associates the response with the key in a durable cache, and returns the response.
3. **Replay Detection**: If a duplicate request arrives with the same Idempotency-Key:
   - If processing is in progress: Server returns HTTP 409 Conflict or waits.
   - If already completed: Server returns the cached response without re-executing business logic.
4. **Key Lifetime**: Idempotency keys typically carry a time-to-live (TTL) of 24–72 hours.
