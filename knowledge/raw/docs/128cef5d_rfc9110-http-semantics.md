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
