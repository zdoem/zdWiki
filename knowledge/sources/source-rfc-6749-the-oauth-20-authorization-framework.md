---
id: source-rfc-6749-the-oauth-20-authorization-framework
type: source
title: 'RFC 6749: The OAuth 2.0 Authorization Framework'
tags:
- oauth2
- rfc6749
- security
- authorization
- tokens
summary: '# RFC 6749: The OAuth 2.0 Authorization Framework Status: Proposed Standard
  (IETF RFC 6749) Author: D. Hardt ## Abstract The OAuth 2.0 authorization framework
  enables a third-party application to obta'
created_at: '2026-08-17T03:45:29.957923'
updated_at: '2026-08-17T03:45:29.957923'
status: active
---

## Source Metadata
- **Raw Path**: `raw/docs/11333f0d_rfc6749-oauth2-framework.md`
- **SHA256**: `11333f0d0162c1236a81e1b03772c4b11e3dd6aaaa4e4c5de8c34bc9b55eae6c`
- **URL**: N/A
- **Ingested At**: 2026-08-17T03:45:29.957923

## Extracted Content

# RFC 6749: The OAuth 2.0 Authorization Framework
Status: Proposed Standard (IETF RFC 6749)
Author: D. Hardt

## Abstract
The OAuth 2.0 authorization framework enables a third-party application to obtain limited access to an HTTP service on behalf of a resource owner.

## Protocol Roles
1. **Resource Owner**: An entity capable of granting access to a protected resource (e.g. end-user).
2. **Resource Server**: The server hosting the protected resources, accepting access tokens.
3. **Client**: An application making requests on behalf of the resource owner.
4. **Authorization Server**: The server issuing access tokens to the client after authentication.

## Grant Types
- Authorization Code Grant (with PKCE for public clients)
- Client Credentials Grant (machine-to-machine)
- Refresh Token Grant (token exchange for expired access tokens)
