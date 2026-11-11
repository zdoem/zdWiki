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
