---
id: concept-refresh-token
type: concept
title: Refresh Token
aliases:
  - refresh-token
domains:
  - security
  - backend
tags:
  - auth
  - oauth2
summary: Long-lived opaque or signed credential used to safely acquire new short-lived access tokens without re-prompting user credentials.
relations:
  related_to:
    - concept-jwt-auth
    - pat-refresh-token-rotation
status: active
---

# Refresh Token

## Purpose
Mitigates exposure risk of access tokens by keeping access tokens short-lived (e.g. 15 minutes) and using refresh tokens stored in secure `HttpOnly` cookies.
