# Getting Started with zdWiki

This guide covers installing, configuring, running, and verifying **zdWiki** locally.

---

## 1. Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18.x or 20.x LTS (with npm)
- **Git**: 2.30+
- **Gemini API Key** *(Optional for AI Q&A / Ask Assistant)*: Set in `.env`

---

## 2. Repository Structure

```text
zdWiki/
├── apps/
│   ├── api/            # Python FastAPI Backend & CLI engine
│   └── web/            # Next.js 14 Web Console UI
├── config/             # Domain taxonomy & system configuration (domains.yaml)
├── docs/               # Official Engineering & Usage Documentation
├── knowledge/          # Canonical Knowledge Repository (Markdown + YAML)
│   ├── raw/            # Immutable Raw Source Documents (SHA-256 verified)
│   ├── sources/        # Synthesized Source Registry Files
│   └── wiki/           # Concepts, Technologies, Patterns, Tests, Bugs, Playbooks
├── var/                # Derived runtime state (Disposable SQLite index)
└── zdwiki.py           # Primary CLI wrapper entry point
```

---

## 3. Backend Setup & CLI

### Step 1: Clone and install Python dependencies
```bash
git clone <your-repo-url> zdWiki
cd zdWiki

# Create and activate virtual environment (optional but recommended)
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r apps/api/requirements.txt
```

### Step 2: Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Contents of `.env`:
```ini
ZDWIKI_ENV=development
ZDWIKI_HOST=0.0.0.0
ZDWIKI_PORT=8000
GEMINI_API_KEY=your_gemini_api_key_here
```
> **Note**: If `GEMINI_API_KEY` is not provided, zdWiki automatically falls back to the deterministic **Mock Provider**, allowing all search, graph, and core wiki features to function completely offline.

### Step 3: Initialize and Index
```bash
# Verify knowledge directories
python zdwiki.py init

# Build or rebuild SQLite FTS5 search index
python zdwiki.py index

# Verify knowledge health
python zdwiki.py lint
```

### Step 4: Start the Backend API Server
```bash
python zdwiki.py serve --port 8000
```
API is now live at `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

---

## 4. Frontend Web Console Setup

Open a new terminal window:
```bash
cd apps/web

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 5. Running with Docker Compose

To launch both Backend API and Web Frontend in isolated containers:
```bash
docker compose up --build
```
- Web Console: `http://localhost:3000`
- API Backend: `http://localhost:8000`

---

## 6. Verification Checklist

Run automated tests to confirm everything is operating properly:

```bash
# 1. Run all 37 backend tests
pytest apps/api/tests -v

# 2. Run knowledge linter
python zdwiki.py lint

# 3. Check maintenance diagnostics
python zdwiki.py maintain

# 4. Build frontend production bundle
cd apps/web && npm run build
```
