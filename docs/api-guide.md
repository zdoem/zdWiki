# REST API Reference Manual

The **zdWiki Backend** provides a high-performance REST API built on FastAPI.

- **Base URL**: `http://localhost:8000/api`
- **Interactive OpenAPI Docs**: `http://localhost:8000/docs`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

---

## 1. System Health & Stats

### `GET /api/health`
Returns runtime health status.
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### `GET /api/stats`
Returns system-wide entity counts, type breakdowns, domain distributions, and active database size on disk.
```json
{
  "total_objects": 42,
  "total_sources": 14,
  "total_bugs": 1,
  "total_tests": 3,
  "total_playbooks": 3,
  "total_decisions": 1,
  "total_loops": 3,
  "by_type": {
    "concept": 9,
    "technology": 3,
    "pattern": 4,
    "architecture": 1,
    "test": 3,
    "bug": 1,
    "debug_playbook": 3,
    "decision": 1,
    "analysis": 1,
    "source": 14,
    "engineering_loop": 3
  },
  "db_size_bytes": 389120,
  "db_size_formatted": "380.0 KB"
}
```

---

## 2. Knowledge Retrieval & CRUD

### `GET /api/knowledge`
Lists all indexed knowledge objects with optional filtering.
- **Query Params**:
  - `type` (optional): `concept`, `technology`, `pattern`, `test`, `bug`, etc.
  - `domain` (optional): e.g. `backend`, `security`.
  - `limit` (default: 100).

### `GET /api/knowledge/{id}`
Returns a single knowledge object by ID, including its YAML frontmatter, markdown body, and relationship graph.

### `POST /api/knowledge`
Creates or updates a Markdown knowledge object in `knowledge/wiki/`.

---

## 3. Full-Text Search

### `GET /api/search`
Performs BM25 search over the SQLite FTS5 index.
- **Query Params**:
  - `q` (required): Search query string.
  - `domain` (optional): Filter by domain taxonomy.
  - `type` (optional): Filter by object type.
  - `java_ver` / `spring_ver` (optional): Context parameters.

---

## 4. Context Graph

### `GET /api/graph`
Returns nodes and edges for local relationship exploration.
- **Query Params**:
  - `center_id` (optional): Object ID to center graph around. If omitted, returns global graph.
  - `hops` (default: 2, range: 1-3): Degree of neighborhood expansion.

---

## 5. AI Assistant & Q&A

### `POST /api/ask`
Answers engineering questions with bounded context retrieval and source citations.
- **Request Body**:
```json
{
  "query": "How does JWT refresh token rotation prevent replay attacks?",
  "domain": "security"
}
```
- **Response**:
```json
{
  "query": "How does JWT refresh token rotation prevent replay attacks?",
  "answer": "JWT refresh token rotation invalidates the previous refresh token...",
  "sources": ["concept-jwt-authentication", "concept-refresh-token"],
  "model": "gemini-1.5-flash",
  "latency_ms": 420.5
}
```

---

## 6. Engineering Loops

### `GET /api/loops`
Lists active and archived engineering loops.

### `POST /api/loops`
Creates a new engineering loop.

### `PATCH /api/loops/{id}`
Updates stage, status, diagnosis, or verified lessons for an engineering loop.
