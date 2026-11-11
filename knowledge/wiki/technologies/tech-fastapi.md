---
id: tech-fastapi
type: technology
title: FastAPI
aliases:
  - fast-api
domains:
  - software-engineering
  - backend
tags:
  - python
  - rest
  - async
summary: Modern, high-performance web framework for building APIs with Python based on standard Python type hints.
relations:
  uses:
    - tech-python
  related_to:
    - concept-rest-api
    - arch-modular-monolith
sources:
  - source-fastapi-docs
status: active
---

# FastAPI

## Mental Model
FastAPI is built on top of Starlette for web routing and Pydantic for data validation and schema generation. It utilizes Python 3.8+ async/await semantics for asynchronous concurrency.

## Architecture
- Request parsing & validation via Pydantic models.
- Dependency Injection system for shared resources (database sessions, authentication, caching).
- Automatic OpenAPI (Swagger UI) generation from route definitions and type hints.

## Production Notes
- Run with Uvicorn or Gunicorn with Uvicorn workers behind a reverse proxy (e.g. Nginx, Caddy).
- Enable lifespan events for resource setup and teardown.
