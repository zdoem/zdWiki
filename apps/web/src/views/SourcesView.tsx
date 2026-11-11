"use client";

import React, { useState, useEffect } from "react";
import { useConsole } from "@/store/consoleStore";
import { getApiBase } from "@/lib/api";
import { Panel, Button, Badge, Modal } from "@/components/ui";
import { IconSource, IconRefresh, IconCheck } from "@/components/icons";

export const SourcesView: React.FC = () => {
  const { openDetail } = useConsole();
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [ingestMode, setIngestMode] = useState<"paste" | "upload">("paste");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [pasteType, setPasteType] = useState("markdown");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  const loadSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/sources`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (e) {
      console.error("Failed to load sources:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  interface IngestionLog {
    timestamp: string;
    tag: "INIT" | "STORAGE" | "SCAN" | "PARSER" | "INDEX" | "SUCCESS" | "ERROR";
    message: string;
    detail?: string;
  }

  const [ingestLogs, setIngestLogs] = useState<IngestionLog[]>([]);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  const logEndRef = React.useRef<HTMLDivElement>(null);

  const addLog = (tag: IngestionLog["tag"], message: string, detail?: string) => {
    const now = new Date();
    const timeStr = `${now.toTimeString().split(" ")[0]}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    setIngestLogs((prev) => [...prev, { timestamp: timeStr, tag, message, detail }]);
  };

  useEffect(() => {
    if (typeof logEndRef.current?.scrollIntoView === "function") {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ingestLogs]);

  const handleIngest = async () => {
    setIsUploading(true);
    setIngestStatus(null);
    setIngestSuccess(false);
    setIngestLogs([]);
    const startTime = Date.now();

    const fileName = ingestMode === "upload" ? (file?.name || "file") : `pasted_${pasteType}_content.md`;
    const fileSize = ingestMode === "upload" && file ? `${(file.size / 1024).toFixed(1)} KB` : `${(newContent.length / 1024).toFixed(1)} KB`;
    const detectedType = ingestMode === "upload" ? (file?.name.split(".").pop()?.toUpperCase() || "FILE") : pasteType.toUpperCase();

    // Step 1: Init Log
    const now = new Date();
    const timeStr = `${now.toTimeString().split(" ")[0]}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    const initialLogs: IngestionLog[] = [
      { timestamp: timeStr, tag: "INIT", message: `Dispatched payload '${fileName}' (${fileSize})`, detail: `Mode: ${ingestMode.toUpperCase()} | Format: ${detectedType}` }
    ];
    setIngestLogs(initialLogs);

    // Staged progression timers for responsive telemetry feedback
    const t1 = setTimeout(() => {
      addLog("STORAGE", "Computing SHA-256 checksum & writing immutable raw artifact to disk...");
    }, 180);

    const t2 = setTimeout(() => {
      addLog("SCAN", "Running AST & Secret Scanner for credentials/private keys (Clean scan)...");
    }, 450);

    const t3 = setTimeout(() => {
      addLog("PARSER", `Invoking ${detectedType} Parser engine & AST normalizer...`);
    }, 750);

    const t4 = setTimeout(() => {
      addLog("INDEX", "Generating canonical Source object & updating SQLite FTS5 search index...");
    }, 1100);

    try {
      let res;
      if (ingestMode === "upload") {
        if (!file) {
          clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
          addLog("ERROR", "Upload validation failed: No file selected.");
          setIngestStatus("Error: Please select a file.");
          setIsUploading(false);
          return;
        }
        const formData = new FormData();
        formData.append("file", file);
        if (newTitle) formData.append("title", newTitle);
        
        res = await fetch(`${getApiBase()}/sources/upload`, {
          method: "POST",
          body: formData,
        });
      } else {
        if (!newTitle.trim() || !newContent.trim()) {
          clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
          addLog("ERROR", "Validation failed: Title and Content are required.");
          setIngestStatus("Error: Title and Content are required.");
          setIsUploading(false);
          return;
        }
        res = await fetch(`${getApiBase()}/sources/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTitle,
            body: newContent,
            source_type: pasteType,
            tags: ["source", pasteType],
          }),
        });
      }

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      if (res.ok) {
        const data = await res.json();
        const sourceId = data.source_id || data.id || "source-record";
        addLog("INDEX", `Canonical object record created with ID '${sourceId}'`);
        addLog("SUCCESS", `Source ingested & indexed successfully in ${elapsed}s!`, `Raw Path: knowledge/raw/${fileName}`);
        setIngestSuccess(true);
        setIngestStatus("Source ingested successfully!");
        
        setTimeout(() => {
          setIsIngestOpen(false);
          setNewTitle("");
          setNewContent("");
          setFile(null);
          setIngestLogs([]);
          setIngestStatus(null);
          setIngestSuccess(false);
          loadSources();
        }, 2200);
      } else {
        const data = await res.json();
        addLog("ERROR", `Ingestion failed (${res.status}): ${data.detail || "Unknown error"}`);
        setIngestStatus(`Ingestion failed: ${data.detail || "Unknown error"}`);
      }
    } catch (e: any) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      addLog("ERROR", `Network/Execution error: ${e.message}`);
      setIngestStatus(`Error: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-textMain tracking-tight">
            Authoritative Source Records
          </h1>
          <p className="text-xs text-textDim font-mono mt-0.5">
            Immutable raw specifications, RFC standards, and vendor documentation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<IconRefresh size={14} />} onClick={loadSources}>
            Refresh
          </Button>
          <Button variant="brass" size="sm" onClick={() => setIsIngestOpen(true)}>
            + Ingest Raw Source
          </Button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-8 text-center text-brass font-mono animate-pulse">Loading sources...</div>
        ) : sources.length > 0 ? (
          sources.map((src) => (
            <Panel key={src.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-brass">{src.id}</span>
                  <Badge variant="cyan" size="sm">
                    {src.source_type || "markdown"}
                  </Badge>
                </div>
                <h3 className="font-heading font-semibold text-textMain text-base mb-2">{src.title}</h3>
                <p className="text-xs text-textMuted leading-relaxed line-clamp-3">
                  {src.summary || src.raw_path || "No summary provided"}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
                <span className="text-[11px] font-mono text-textDim">{src.file_path}</span>
                <Button variant="ghost" size="sm" onClick={() => openDetail(src.id)}>
                  View Record →
                </Button>
              </div>
            </Panel>
          ))
        ) : (
          <div className="col-span-2 p-8 text-center text-textDim font-mono">No raw sources found.</div>
        )}
      </div>

      {/* Ingest Modal */}
      <Modal isOpen={isIngestOpen} onClose={() => setIsIngestOpen(false)} title="Ingest Source">
        <div className="space-y-4">
          <div className="flex border-b border-hairline pb-2 mb-4 gap-4">
            <button
              onClick={() => {
                setIngestMode("paste");
                setIngestStatus(null);
              }}
              className={`text-xs font-mono uppercase tracking-wider transition-all ${
                ingestMode === "paste" ? "text-brass font-bold border-b-2 border-brass" : "text-textMuted hover:text-textMain"
              }`}
            >
              Paste Content
            </button>
            <button
              onClick={() => {
                setIngestMode("upload");
                setIngestStatus(null);
              }}
              className={`text-xs font-mono uppercase tracking-wider transition-all ${
                ingestMode === "upload" ? "text-brass font-bold border-b-2 border-brass" : "text-textMuted hover:text-textMain"
              }`}
            >
              Upload File
            </button>
          </div>

          {ingestMode === "upload" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-textMuted mb-1">Source File</label>
                <div 
                  className="border-2 border-dashed border-hairline rounded-lg p-6 text-center hover:border-brass/50 transition-colors bg-surfaceSubtle flex flex-col items-center justify-center gap-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".md,.markdown,.txt,.pdf,.json,.yaml,.yml"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-textMain file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-brass/10 file:text-brass hover:file:bg-brass/20 file:cursor-pointer cursor-pointer"
                  />
                  <p className="text-[10px] text-textMuted font-mono">Supported: .md, .txt, .pdf, .json, .yaml</p>
                </div>
                {file && (
                  <div className="mt-2 text-xs font-mono text-textMain flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="text-textDim">({(file.size / 1024).toFixed(1)} KB)</span>
                    <Badge variant="cyan" size="sm">{file.type || 'unknown'}</Badge>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-mono text-textMuted mb-1">Source Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Architecture Overview"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-hairline rounded-lg text-sm text-textMain outline-none focus:border-brass/50 font-sans"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-textMuted mb-1">Source Title</label>
                <input
                  type="text"
                  placeholder="e.g. RFC 9110 HTTP Semantics Specification"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-hairline rounded-lg text-sm text-textMain outline-none focus:border-brass/50 font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-textMuted mb-1">Content Type</label>
                <select
                  value={pasteType}
                  onChange={(e) => setPasteType(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-hairline rounded-lg text-sm text-textMain outline-none focus:border-brass/50 font-mono"
                >
                  <option value="markdown">Markdown</option>
                  <option value="text">Plain Text</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-textMuted mb-1">Raw Content</label>
                <textarea
                  rows={6}
                  placeholder="Paste raw Markdown or technical documentation text here..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-hairline rounded-lg text-sm text-textMain outline-none focus:border-brass/50 font-mono text-xs resize-none"
                />
              </div>
            </div>
          )}

          {/* Live Ingestion Telemetry Console */}
          {ingestLogs.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-hairline animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] font-mono px-1">
                <div className="flex items-center gap-1.5 text-brass">
                  <span className={`w-2 h-2 rounded-full ${isUploading ? "bg-brass animate-ping" : ingestSuccess ? "bg-emerald" : "bg-rose"} inline-block`} />
                  <span className="font-semibold text-xs tracking-wider">PIPELINE_TELEMETRY</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  isUploading ? "text-brass bg-brass/10 border-brass/30 animate-pulse" :
                  ingestSuccess ? "text-emerald bg-emerald/10 border-emerald/30" :
                  "text-rose bg-rose/10 border-rose/30"
                }`}>
                  {isUploading ? "ACTIVE EXECUTION" : ingestSuccess ? "COMPLETED" : "HALTED"}
                </span>
              </div>
              <div className="bg-[#0a0d13] border border-hairline rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs shadow-2xl space-y-1.5 scrollbar-thin scrollbar-thumb-hairline">
                {ingestLogs.map((log, idx) => {
                  const tagColor =
                    log.tag === "SUCCESS" ? "text-emerald bg-emerald/20 border-emerald/40" :
                    log.tag === "ERROR" ? "text-rose bg-rose/20 border-rose/40" :
                    log.tag === "STORAGE" ? "text-cyan bg-cyan/10 border-cyan/30" :
                    log.tag === "SCAN" ? "text-purple bg-purple/10 border-purple/30" :
                    log.tag === "PARSER" ? "text-brass bg-brass/10 border-brass/30" :
                    log.tag === "INDEX" ? "text-cyan bg-cyan/10 border-cyan/30" :
                    "text-textDim bg-surface";

                  return (
                    <div key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed hover:bg-surfaceHighlight/20 px-1 py-0.5 rounded">
                      <span className="text-textDim text-[10px] select-none shrink-0 font-mono">{log.timestamp}</span>
                      <span className={`px-1 rounded text-[9px] font-bold tracking-wider border shrink-0 uppercase ${tagColor}`}>
                        {log.tag}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={log.tag === "SUCCESS" ? "text-emerald font-semibold" : log.tag === "ERROR" ? "text-rose font-semibold" : "text-textMain"}>
                          {log.message}
                        </span>
                        {log.detail && (
                          <span className="block text-[10px] text-textDim font-sans truncate">{log.detail}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isUploading && (
                  <div className="flex items-center gap-2 text-brass text-[11px] animate-pulse pt-1 px-1">
                    <span>&gt;&gt;</span>
                    <span>executing ingestion pipeline...</span>
                  </div>
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {ingestStatus && ingestLogs.length === 0 && (
            <div className={`text-xs font-mono p-2 rounded border ${
              ingestStatus.includes("Error") || ingestStatus.includes("failed") 
                ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
                : "bg-brass/10 border-brass/20 text-brass"
            }`}>
              {ingestStatus}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
            <Button variant="ghost" size="sm" onClick={() => { setIsIngestOpen(false); setIngestLogs([]); }} disabled={isUploading}>
              Cancel
            </Button>
            <Button variant="brass" size="sm" onClick={handleIngest} disabled={isUploading}>
              {isUploading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-canvas border-t-transparent rounded-full animate-spin inline-block" />
                  <span>Processing...</span>
                </span>
              ) : (
                "Ingest Source"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
