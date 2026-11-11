# zdWiki Knowledge Bootstrap Plan

**Objective**: Accumulate a foundation of 100–200 authoritative engineering sources compiling into 300–500+ atomic, interconnected canonical knowledge objects across 5 strategic waves.

---

## 1. Core Principles

1. **Quality Beats Quantity**: No web-scraping dumps or unverified LLM hallucinations. Every knowledge object must trace to an immutable raw source.
2. **Atomic Granularity**: Maintain pages within 500–2,000 tokens. Decompose broad topics with typed graph relations rather than giant monolithic articles.
3. **Multi-Faceted Technical Coverage**: Topics include architectural models, key invariants, common failure modes, diagnostic commands, and test verification strategies.
4. **Human Review Gate**: During initial bootstrap waves, all candidate knowledge compiled from sources undergoes explicit schema and content review before committing.

---

## 2. Ingestion & Compilation Waves

```text
+-------------------------------------------------------------------------+
| Wave 1: Core Engineering Foundations (HTTP, REST, Git, Linux, SQL, DB)  |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
| Wave 2: Production Engineering (Architecture, Security, CI/CD, Obs, Perf)|
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
| Wave 3: Data Engineering (Data Modeling, ETL, Pipelines, Warehouses)    |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
| Wave 4: AI / ML & LLM Engineering (Deep Learning, RAG, Evals, Agents)   |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
| Wave 5: Product & Domain Expertise (BA, UX/UI, Accounting, Finance)     |
+-------------------------------------------------------------------------+
```

---

## 3. Wave Breakdown & Source Targets

### Wave 1 — Core Engineering Foundations (Target: 30–40 Sources $\rightarrow$ ~100 Objects)
* **HTTP & REST Protocols**: RFC 9110 (HTTP Semantics), RFC 7231, Fielding Dissertation (REST constraints), IETF Idempotency-Key Header draft.
* **Git & Version Control**: Pro Git (Scott Chacon & Ben Straub), Git Internals Reference.
* **Linux & Systems**: Linux Foundation Docs, POSIX System Interface standards, systemd architecture docs.
* **Database Fundamentals**: SQLite Documentation & Arch, PostgreSQL Documentation (MVCC, Indexes, Transaction Isolation), ACID Transaction specifications.
* **Backend Architecture**: FastAPI Official Architecture, ASGI 3.0 Specification, Python Concurrency model.
* **Testing & Quality**: ISTQB Standards, Pytest Official Architecture, Automated Testing Pyramid principles.

### Wave 2 — Production Engineering & Security (Target: 25–35 Sources $\rightarrow$ ~80 Objects)
* **Security & Auth**: RFC 7519 (JWT), RFC 6749 (OAuth 2.0), OWASP Top 10, NIST Digital Identity Guidelines (SP 800-63B).
* **System Architecture**: Twelve-Factor App Specification, Microservice Decomposition Patterns (Chris Richardson).
* **CI/CD & DevOps**: GitHub Actions Core Architecture, OCI Container Image Specification.
* **Observability**: OpenTelemetry Specification (Traces, Metrics, Logs), Google SRE Handbook (SLO/SLI).
* **Performance**: Web Vitals Specification, Cache-Control Semantics (RFC 9111).

### Wave 3 — Data Engineering (Target: 20–30 Sources $\rightarrow$ ~60 Objects)
* **Data Modeling**: Kimball Star Schema Methodology, Third Normal Form (3NF) relational rules.
* **Data Pipelines**: Apache Kafka Architecture Guide, Stream Processing fundamentals.
* **Analytical Warehouses**: ClickHouse Architecture Whitepaper, Apache Parquet Format Specification.
* **Vector Data**: HNSW Algorithm Paper (Malkov & Yashunin), Vector Indexing benchmarks.

### Wave 4 — AI / ML & LLM Engineering (Target: 20–30 Sources $\rightarrow$ ~70 Objects)
* **Foundations**: Attention Is All You Need (Vaswani et al.), Transformer Architecture guides.
* **RAG & Retrieval**: BM25 Specification, Dense Retrieval & Cross-Encoder Reranking research papers.
* **Evaluation**: RAGAS Evaluation Framework whitepaper, LLM-as-a-Judge methodology papers.
* **Agents & Tool Calling**: ReAct (Reasoning and Acting) Framework paper, Tool Calling protocol specs.

### Wave 5 — Product, UX & Domain Expertise (Target: 15–25 Sources $\rightarrow$ ~50 Objects)
* **Product & Requirements**: BABOK Guide v3, User Story Mapping (Jeff Patton).
* **Design Systems**: Atomic Design Methodology (Brad Frost), Web Content Accessibility Guidelines (WCAG 2.1).
* **Accounting & Finance**: Dual-Entry Bookkeeping Principles, GAAP/IFRS Ledger Structure standards.

---

## 4. Compilation Workflow & Guardrails

$$\text{Source Input} \rightarrow \text{Immutable Raw Archive} \rightarrow \text{SHA-256 Digest} \rightarrow \text{Source Quality Tier Check} \rightarrow \text{Candidate Extraction} \rightarrow \text{Deduplication & Conflict Detection} \rightarrow \text{Review} \rightarrow \text{Markdown Commit} \rightarrow \text{Index Rebuild} \rightarrow \text{Schema Lint}$$

### Guardrails
* **No Unvetted Tier D in Core Concepts**: Community posts cannot define primary system concepts.
* **Schema Validation Pre-Commit**: `python zdwiki.py lint` must report 0 errors after every batch.
* **Token Budgeting**: Any object exceeding 3,000 tokens triggers automatic decomposition review.
