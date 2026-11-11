# Troubleshooting & Diagnostic Procedures

This guide provides step-by-step diagnostic and remediation instructions for common operational issues in **zdWiki**.

---

## 1. Web Console Cannot Connect to API Backend

### Symptoms:
- Web Console shows `API Offline` or `Failed to fetch`.
- `Run Diagnostics` in `/diagnostics` marks `FastAPI Backend Gateway` as `ERROR`.

### Remediation:
1. Verify if the FastAPI server is running on port 8000:
   ```bash
   python zdwiki.py serve --port 8000
   ```
2. Test connection with curl or python:
   ```bash
   python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/health').read())"
   ```
3. Ensure `.env` in `apps/web/` contains:
   ```ini
   NEXT_PUBLIC_API_BASE=http://localhost:8000/api
   ```

---

## 2. SQLite Search Index Corrupted or Missing

### Symptoms:
- Search returns zero results for known terms.
- Sidebar SQLite card shows `0 Objs` or errors.

### Remediation:
1. Delete and rebuild the disposable index from canonical Markdown:
   ```bash
   python zdwiki.py index
   ```
   *Or click the **Rebuild Index** button in the sidebar footer or in `/diagnostics`.*
2. Check database integrity with the linter:
   ```bash
   python zdwiki.py lint
   ```

---

## 3. Gemini API Key Missing / AI Q&A Fallback

### Symptoms:
- `Ask zdWiki` responses return mock deterministic answers or telemetry logs show Mock Provider.

### Remediation:
1. Set a valid `GEMINI_API_KEY` in `.env`:
   ```ini
   GEMINI_API_KEY=AIzaSy...
   ```
2. Restart the API server.
3. If no key is provided, zdWiki safely uses its built-in Mock Provider, ensuring that unit tests, search, graph navigation, and all core features work without failure.

---

## 4. Knowledge Linter Detection of Broken Relations

### Symptoms:
- `python zdwiki.py lint` exits with code 1.
- Error message: `Broken relation: Target object 'tech-nonexistent' does not exist`.

### Remediation:
1. Open the referenced Markdown file.
2. In the `relations` block of YAML frontmatter, remove the missing target ID or create the missing knowledge object.
3. Re-run `python zdwiki.py lint` until all objects report healthy.

---

## 5. Ingestion Failures & Warnings

### Symptoms:
- Ingesting a PDF returns `OCR_REQUIRED` or `ENCRYPTED_PDF_UNSUPPORTED`.
- Ingesting JSON/YAML fails with `NESTING_DEPTH_EXCEEDED` or `INVALID_JSON`.
- Ingestion warning: `Potential secret redacted`.

### Remediation:
1. **OCR Required**: Scanned or image-only PDFs do not have a text layer. PDF text layer extraction cannot extract text. These require preprocessing (OCR) before ingestion.
2. **Encrypted PDF**: Password-protected PDFs are rejected by security policy. Decrypt/remove the password before uploading.
3. **Nesting Depth/Items Exceeded**: Nested configurations exceeding depth `20` or item count `10,000` are rejected to prevent parser hangs. Simplify or split the file.
4. **Secret Warnings**: Structured source values matching secret patterns are replaced with `[REDACTED]` in FTS and search. Confirm that the redacted field wasn't a false positive. If a false positive token needs to be unredacted, review it in the Markdown file under `knowledge/sources/`.
