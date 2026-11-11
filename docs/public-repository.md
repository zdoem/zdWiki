# Public repository publication

The public repository contains application code and reviewed sample knowledge. Local credentials, runtime databases, imported organization documents, private derived knowledge, and execution history are excluded by `.gitignore`. Excluded files remain on the original machine; cloning does not restore them.

Before publication, inspect the staged snapshot, scan credential patterns, and compare it against local secret values without printing them. Review imported content separately: absence of API keys does not make internal documents publishable. Never modify immutable raw sources to sanitize them; exclude private sources and their derived records together.

Verification on 2026-11-11: the exported staged snapshot contained 41 knowledge objects, passed knowledge lint without warnings, and passed all 74 backend tests. The local frontend passed 3 tests and its production build; remaining React Hooks warnings were not addressed in this publication task. Live Gemini calls were not verified.

After cloning, install the documented dependencies, copy `.env.example` to `.env` if needed, and rebuild the disposable index with `python zdwiki.py index rebuild`. Keep real keys only in the ignored environment file.
