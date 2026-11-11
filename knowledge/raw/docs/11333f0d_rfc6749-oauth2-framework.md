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
