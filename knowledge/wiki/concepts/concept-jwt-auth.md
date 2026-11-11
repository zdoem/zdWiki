---
id: concept-jwt-auth
type: concept
title: JWT Authentication
aliases:
  - json-web-tokens
domains:
  - software-engineering
  - security
tags:
  - jwt
  - auth
  - token
summary: Stateless authentication token standard (RFC 7519) compact and self-contained for securely transmitting claims between parties.
relations:
  uses:
    - concept-rest-api
  related_to:
    - concept-refresh-token
    - pat-refresh-token-rotation
sources:
  - source-rfc-7519
status: active
---

# JWT Authentication

## Principles
A JSON Web Token consists of three parts separated by dots:
1. Header: Algorithm & Token Type (e.g. `HS256`, `RS256`)
2. Payload: Claims (`sub`, `exp`, `iat`, `roles`)
3. Signature: Cryptographic verification signature

## Expiry & Validation
- Always validate expiration timestamp `exp`.
- Reject expired tokens with HTTP 401 Unauthorized.
