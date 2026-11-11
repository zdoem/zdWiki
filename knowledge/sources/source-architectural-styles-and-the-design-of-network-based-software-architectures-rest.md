---
id: source-architectural-styles-and-the-design-of-network-based-software-architectures-rest
type: source
title: Architectural Styles and the Design of Network-based Software Architectures
  (REST)
tags:
- rest
- architecture
- fielding
- hateoas
- statelessness
summary: '# Architectural Styles: REST Constraints Author: Roy Thomas Fielding (PhD
  Dissertation, UC Irvine, 2000) ## Abstract Representational State Transfer (REST)
  is an architectural style for distributed hy'
created_at: '2026-08-17T03:45:29.880020'
updated_at: '2026-08-17T03:45:29.880020'
status: active
---

## Source Metadata
- **Raw Path**: `raw/docs/8538a0a2_fielding-rest-constraints.md`
- **SHA256**: `8538a0a26886613c3a664c2f801124432aa8f149a10eb6ede092b29c4ff8e8a1`
- **URL**: N/A
- **Ingested At**: 2026-08-17T03:45:29.880020

## Extracted Content

# Architectural Styles: REST Constraints
Author: Roy Thomas Fielding (PhD Dissertation, UC Irvine, 2000)

## Abstract
Representational State Transfer (REST) is an architectural style for distributed hypermedia systems.

## The Six Architectural Constraints
1. **Client-Server Architecture**: Separation of concerns between user interface (client) and data storage (server) improves portability and scalability.
2. **Statelessness**: Each request from client to server must contain all of the information necessary to understand and complete the request. Session state is kept entirely on the client.
3. **Cacheability**: Responses must implicitly or explicitly define themselves as cacheable or non-cacheable to prevent clients from reusing stale data.
4. **Layered System**: An intermediary (proxy, gateway, load balancer) cannot be distinguished from the end server by the client, enabling scalability and security encapsulation.
5. **Code-on-Demand (Optional)**: Servers can temporarily extend client functionality by transferring executable code (e.g., scripts).
6. **Uniform Interface**: The central defining constraint of REST:
   - Identification of resources (URIs)
   - Manipulation of resources through representations
   - Self-descriptive messages (media types, headers)
   - Hypermedia as the Engine of Application State (HATEOAS)
