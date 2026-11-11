# zdWiki Multi-Format Source Ingestion

This document describes the unified parser-based ingestion pipeline implemented in **zdWiki**.

---

## Architecture Overview

The ingestion pipeline follows a strict, parser-centric architecture that abstracts file-type specific parsing and validation details behind a common contract:

```text
Source File / Content
        ↓
File Type Detection (Extension, MIME & Signature checks)
        ↓
Parser Registry
        ↓
Format-Specific Parser
        ↓
Normalized Source Document (Unified sections & locators)
        ↓
Immutable Evidence Storage (raw/ docs or pdf)
        ↓
Knowledge Compiler (Generates candidate proposals)
        ↓
Human Review (Approve, Edit, Reject)
        ↓
Canonical Knowledge (wiki/)
        ↓
SQLite FTS / Retriever Index
```

This guarantees **different source formats, one normalized ingestion contract**.

---

## Supported Formats

### 1. Markdown (`.md`, `.markdown`)
- **Parser**: `MarkdownParser`
- **Behavior**: Chunks content by headings (`#`, `##`, etc.).
- **Provenance Locator**: `heading` (type="heading", heading="Name", section_path=["Level 1", "Level 2"]).

### 2. Plain Text (`.txt`)
- **Parser**: `TextParser`
- **Behavior**: Decodes safely using UTF-8 (falling back to Latin-1). Represents text as a single section.
- **Provenance Locator**: `line_range` (type="line_range", start_line=1, end_line=N).

### 3. PDF (`.pdf`)
- **Parser**: `PdfParser`
- **Behavior**: Extracts text layer page-by-page. Pages are separated into individual sections.
- **Detections**:
  - Validates `%PDF-` file signature.
  - Flags `OCR_REQUIRED` if no text is extractable.
  - Rejects password-protected PDFs (`ENCRYPTED_PDF_UNSUPPORTED`).
- **Provenance Locator**: `page` (type="page", page=P).

### 4. JSON (`.json`)
- **Parser**: `JsonParser`
- **Behavior**: Validates valid JSON structure and recursively flattens keys/paths.
- **Resource Limits**: Enforces a max nesting depth of `20` and max array/object item counts of `10,000` to prevent memory exhaustion.
- **Provenance Locator**: `json_path` (type="json_path", path="$.services.payment.timeout").

### 5. YAML (`.yaml`, `.yml`)
- **Parser**: `YamlParser`
- **Behavior**: Safe parsing using PyYAML (`yaml.safe_load_all`). Supports multi-document YAML. Enforces nesting and item size limits.
- **Provenance Locator**: `yaml_path` (type="yaml_path", path="$.services.api.environment" or $[1].db.host).

---

## Security Policies

### Secret Scanning & Redaction
Ingested JSON and YAML structured configurations frequently contain credentials. The ingestion pipeline runs a pre-indexing scanner:
1. **Key Matching**: Looks for segments containing `password`, `secret`, `api_key`, `token`, etc.
2. **Pattern Matching**: Scans value contents for SSH keys, OpenAI API key patterns (`sk-proj...`), and JWTs.
3. **Global Redaction**: If any credential is found, the value is replaced by `[REDACTED]` in the derived text of all sections *before* it is indexed in SQLite, saved as proposals, or sent to the LLM.
4. **Flagging**: The source security status is flagged as `"review_required"`.

### Path Traversal Protection
User filenames are never trusted as server storage paths.
- Filenames are checked for traversal elements (`..`, `/`, `\`).
- Filenames are sanitized, hashed, and stored using a safe prefix naming scheme: `knowledge/raw/{category}/{sha256[:8]}_{filename}`.

---

## Knowledge Compilation & Proposal Flow

1. **Ingest**: Ingesting a source creates a source Markdown file in `knowledge/sources/` with rich metadata (original filename, MIME type, SHA-256 hash, parser status, and secret warning tags).
2. **Compile**: Clicking **Compile Knowledge** runs candidate generation. It segments the normalized source document sections into draft candidate objects.
3. **Proposals**: Candidate objects are evaluated by the relearning `KnowledgeCompiler` and saved as pending proposals in `knowledge/proposals/prop-*.md`.
4. **Review**: The user reviews the proposals inside the Web UI or CLI.
5. **Approve**: Clicking **Approve** moves the candidate to the canonical `knowledge/wiki/` directory and indexes it in the search engine.
