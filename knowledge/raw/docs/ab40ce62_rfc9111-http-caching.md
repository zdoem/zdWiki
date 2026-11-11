# RFC 9111: HTTP Caching
Status: Internet Standard (IETF STD 98)
Authors: R. Fielding, M. Nottingham, J. Reschke

## Abstract
HTTP caching provides a mechanism for storing responses to requests in order to reuse them for future requests.

## Core Mechanisms
### Cache-Control Directives
- `max-age=N`: Response is fresh for N seconds from generation.
- `no-cache`: Must validate freshness with origin server via conditional request before reuse.
- `no-store`: Do not store any part of request/response in non-volatile storage.
- `private`: Response intended for single user; shared caches must not store.
- `public`: Any cache may store the response.

### Conditional Validation
- `ETag` (Entity Tag): Opaque validator token representing resource state. Client sends `If-None-Match: <etag>`, server replies `304 Not Modified` if unchanged.
- `Last-Modified`: Timestamp validator. Client sends `If-Modified-Since: <date>`.
