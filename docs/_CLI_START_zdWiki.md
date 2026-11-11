# zdWiki — Quick Start Guide (PowerShell & CMD)

คู่มือคำสั่งสำหรับเริ่มต้นรันระบบ **zdWiki** (FastAPI Backend, Next.js Frontend, และ Model Context Protocol (MCP) Server) ผ่าน **PowerShell** และ **Command Prompt (CMD)**

---

## 1. วิธีรันแบบแยก 2 Terminal (Standard Dev Mode)

### 🔹 Terminal 1: Start Backend API (FastAPI)
เปิด PowerShell หรือ CMD ที่โฟลเดอร์ root ของโปรเจกต์ `Z:\DEV\llmwiki\zdWiki`:

```powershell
# รัน FastAPI Server ที่พอร์ต 8000
python zdwiki.py serve --port 8000

# หรือรันแบบ Auto-Reload (รีสตาร์ตอัตโนมัติเมื่อมีการแก้ไขโค้ด Backend)
python zdwiki.py serve --port 8000 --reload
```
* **API Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Base URL**: `http://localhost:8000/api`

---

### 🔹 Terminal 2: Start Frontend Web Console (Next.js)
เปิดอีกหนึ่งหน้าต่าง PowerShell หรือ CMD:

```powershell
# เข้าโฟลเดอร์เว็บ แล้วเริ่ม Dev Server
cd apps\web
npm run dev
```
* **Web UI Console**: [http://localhost:3000](http://localhost:3000)

---

## 2. คำสั่ง Start MCP Server (สำหรับ AI Coding Agents)

สำหรับการเชื่อมต่อ AI Coding Agents (**Google Antigravity**, **Claude Code**, **Cursor**, **Codex**) ผ่าน Model Context Protocol over `stdio`:

```powershell
# รัน MCP Stdio Server มาตรฐาน
python zdwiki.py mcp serve

# หรือรันแบบ Read-Only (อ่านได้อย่างเดียว ป้องกันการแก้ไขหรือสร้าง Loop)
python zdwiki.py mcp serve --read-only
```

---

## 3. One-Liner Commands (เปิด Backend + Frontend พร้อมกันในคำสั่งเดียว)

### ⚡ บน PowerShell:
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python zdwiki.py serve --port 8000 --reload" ; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\web; npm run dev"
```

### ⚡ บน CMD (Command Prompt):
```cmd
start cmd /k "python zdwiki.py serve --port 8000 --reload" && start cmd /k "cd apps\web && npm run dev"
```

---

## 4. คำสั่งจัดการ Index และตรวจสอบระบบ (CLI Utilities)

```powershell
# ตรวจสอบสถานะระบบ จำนวน Knowledge Object และขนาด SQLite FTS5 Database
python zdwiki.py status

# ตรวจสอบ Subsystems Health ทั้งหมด (Repository, FTS5, Schema, Write Permissions, LLM)
python zdwiki.py doctor

# Rebuild SQLite FTS5 Search Index จาก Markdown files ทั้งหมด
python zdwiki.py index rebuild

# ตรวจสอบความถูกต้องและ Schema Linter
python zdwiki.py lint

# รัน Maintenance Diagnostics
python zdwiki.py maintain

# ค้นหา Knowledge พร้อม Version Context
python zdwiki.py search "jwt authentication" --project .zdwiki/project.yaml --explain-ranking --json
```

---

## 5. Port Mapping Summary

| Service | Port / Protocol | URL / Command |
|---|---|---|
| **Next.js Web Console** | 3000 (HTTP) | [http://localhost:3000](http://localhost:3000) |
| **FastAPI Backend & REST** | 8000 (HTTP) | [http://localhost:8000](http://localhost:8000) / [http://localhost:8000/docs](http://localhost:8000/docs) |
| **MCP Server** | `stdio` JSON-RPC | `python zdwiki.py mcp serve` |
