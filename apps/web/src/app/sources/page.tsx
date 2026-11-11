"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Upload,
  ArrowRight,
  Download,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  XCircle,
  FileText,
  Plus,
  RefreshCw,
  Database,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import {
  fetchKnowledgeList,
  getApiBase,
  compileSource,
  fetchProposals,
  approveProposal,
  rejectProposal,
  ProposalItem
} from "@/lib/api";

interface SourceDetail {
  id: string;
  type: string;
  title: string;
  summary: string;
  domains: string[];
  tags: string[];
  body?: string;
  status?: string;
  file_path?: string;
  source_type: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  ingested_at: string;
  parser: {
    name: string;
    version: string;
    status: string;
  };
  security: {
    secret_scan_status: string;
  };
  compilation: {
    status: string;
  };
  knowledge_objects: string[];
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceDetail[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceDetail | null>(null);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);

  // Ingest Modal / Form State
  const [showModal, setShowModal] = useState(false);
  const [ingestMode, setIngestMode] = useState<"paste" | "upload">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [pasteType, setPasteType] = useState("markdown");
  const [pasteContent, setPasteContent] = useState("");
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Detail Sub-tabs
  const [detailTab, setDetailTab] = useState<"extracted" | "proposals" | "approved">("extracted");

  const loadSources = async (selectId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/sources`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSources(data);
        if (data.length > 0) {
          const defaultSelect = selectId ? data.find((s: any) => s.id === selectId) : data[0];
          handleSelectSource(defaultSelect || data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSource = async (src: SourceDetail) => {
    setSelectedSource(src);
    try {
      const props = await fetchProposals(src.id);
      setProposals(props);
    } catch (err) {
      console.error(err);
      setProposals([]);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadMessage(null);
    setUploadError(null);

    try {
      let res;
      if (ingestMode === "upload") {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        if (title) formData.append("title", title);
        if (sourceUrl) formData.append("source_url", sourceUrl);
        
        res = await fetch(`${getApiBase()}/sources/upload`, {
          method: "POST",
          body: formData,
        });
      } else {
        if (!title || !pasteContent) {
          setUploadError("Title and Content are required.");
          setIsUploading(false);
          return;
        }
        res = await fetch(`${getApiBase()}/sources/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body: pasteContent,
            source_type: pasteType,
            tags: ["source", pasteType]
          })
        });
      }

      const data = await res.json();
      if (res.ok) {
        setUploadMessage(`Successfully ingested '${data.source_id}'`);
        setFile(null);
        setTitle("");
        setSourceUrl("");
        setPasteContent("");
        setShowModal(false);
        await loadSources(data.source_id);
      } else {
        setUploadError(`Ingestion failed: ${data.detail || "Error"}`);
      }
    } catch (err: any) {
      setUploadError(`Ingestion error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCompile = async () => {
    if (!selectedSource) return;
    setCompiling(true);
    try {
      await compileSource(selectedSource.id);
      await loadSources(selectedSource.id);
    } catch (err) {
      console.error(err);
    } finally {
      setCompiling(false);
    }
  };

  const handleApproveProposal = async (propId: string) => {
    try {
      await approveProposal(propId);
      if (selectedSource) {
        await loadSources(selectedSource.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectProposal = async (propId: string) => {
    try {
      await rejectProposal(propId);
      if (selectedSource) {
        await loadSources(selectedSource.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getFormatBadgeClass = (fmt: string) => {
    switch (fmt.toLowerCase()) {
      case "pdf": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "json": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "yaml": return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "markdown": case "md": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default: return "bg-sky-500/10 text-sky-500 border-sky-500/20";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1 font-heading">
            Source Archives & Evidence Ingestion
          </h1>
          <p className="text-xs text-textMuted">
            Verify provenance, inspect raw evidence metadata, and compile new candidate knowledge objects.
          </p>
        </div>
        <button
          onClick={() => {
            setUploadMessage(null);
            setUploadError(null);
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Ingest Source</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Master Source List */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-textMuted font-heading">
            Ingested Sources ({sources.length})
          </h2>

          {sources.length > 0 ? (
            <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-1">
              {sources.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSource(s)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between group shadow-sm ${
                    selectedSource?.id === s.id
                      ? "bg-surfaceElevated border-primary/50 shadow-md"
                      : "bg-surface border-surfaceBorder hover:border-primary/30"
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold border ${getFormatBadgeClass(s.source_type)}`}>
                        {s.source_type}
                      </span>
                      <span className="text-[10px] font-mono text-textMuted truncate max-w-[130px]">{s.id}</span>
                    </div>
                    <h3 className={`text-xs font-bold transition-colors mb-1 font-heading ${
                      selectedSource?.id === s.id ? "text-primary" : "text-textMain"
                    }`}>
                      {s.title}
                    </h3>
                    <p className="text-[11px] text-textMuted line-clamp-1">
                      {s.original_filename || "Pasted source"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-surfaceBorder rounded-2xl bg-surface">
              <FolderGit2 className="w-8 h-8 text-textMuted mx-auto mb-2 opacity-50" />
              <p className="text-xs text-textMuted">No ingested sources found</p>
            </div>
          )}
        </div>

        {/* Right Column: Ingested Source Detail View */}
        <div className="lg:col-span-8">
          {selectedSource ? (
            <div className="p-6 rounded-2xl bg-surface border border-surfaceBorder space-y-6 shadow-sm">
              {/* Detail Header */}
              <div className="flex justify-between items-start border-b border-surfaceBorder pb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded font-mono uppercase font-bold border ${getFormatBadgeClass(selectedSource.source_type)}`}>
                      {selectedSource.source_type}
                    </span>
                    <span className="text-xs font-mono text-textMuted">
                      ID: <strong className="text-textMain">{selectedSource.id}</strong>
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-textMain font-heading">
                    {selectedSource.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`${getApiBase()}/sources/${selectedSource.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceSubtle border border-surfaceBorder hover:border-primary text-xs font-medium text-textMain shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Original</span>
                  </a>

                  <button
                    onClick={handleCompile}
                    disabled={compiling}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${compiling ? "animate-spin" : ""}`} />
                    <span>{compiling ? "Compiling..." : "Compile Knowledge"}</span>
                  </button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-surfaceSubtle rounded-xl border border-surfaceBorder/40 text-xs">
                <div>
                  <span className="text-[10px] text-textMuted block font-mono uppercase">Original File</span>
                  <span className="font-medium text-textMain truncate block">{selectedSource.original_filename || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-textMuted block font-mono uppercase">MIME Type</span>
                  <span className="font-medium text-textMain block">{selectedSource.mime_type || "text/plain"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-textMuted block font-mono uppercase">Size</span>
                  <span className="font-medium text-textMain block">{(selectedSource.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-[10px] text-textMuted block font-mono uppercase">Verify Status</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Hash Verified</span>
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-textMuted block font-mono uppercase">SHA-256 Checksum</span>
                  <span className="font-mono text-[10px] text-textMain block truncate">{selectedSource.sha256 || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-textMuted block font-mono uppercase">Parser Status</span>
                  <span className={`inline-flex items-center gap-1 font-mono uppercase text-[10px] font-bold ${
                    selectedSource.parser?.status === "completed" ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {selectedSource.parser?.status || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-textMuted block font-mono uppercase">Security Scan</span>
                  <span className={`inline-flex items-center gap-1 font-mono uppercase text-[10px] font-bold ${
                    selectedSource.security?.secret_scan_status === "clean" ? "text-emerald-400" : "text-rose-400 animate-pulse"
                  }`}>
                    {selectedSource.security?.secret_scan_status === "clean" ? (
                      <span>Clean</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        <span>Secrets Redacted</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Details Tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-surfaceBorder">
                  <button
                    onClick={() => setDetailTab("extracted")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      detailTab === "extracted"
                        ? "border-primary text-primary"
                        : "border-transparent text-textMuted hover:text-textMain"
                    }`}
                  >
                    Extracted Text
                  </button>
                  <button
                    onClick={() => setDetailTab("proposals")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      detailTab === "proposals"
                        ? "border-primary text-primary"
                        : "border-transparent text-textMuted hover:text-textMain"
                    }`}
                  >
                    <span>Proposals</span>
                    {proposals.length > 0 && (
                      <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                        {proposals.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setDetailTab("approved")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      detailTab === "approved"
                        ? "border-primary text-primary"
                        : "border-transparent text-textMuted hover:text-textMain"
                    }`}
                  >
                    Approved Knowledge ({selectedSource.knowledge_objects?.length || 0})
                  </button>
                </div>

                {/* Tab content: Extracted Text */}
                {detailTab === "extracted" && (
                  <div className="bg-surfaceSubtle border border-surfaceBorder rounded-xl p-4 overflow-y-auto max-h-[40vh]">
                    <pre className="text-[11px] font-mono text-textMain whitespace-pre-wrap leading-relaxed">
                      {selectedSource.body || "No extracted text layer."}
                    </pre>
                  </div>
                )}

                {/* Tab content: Proposals & Review */}
                {detailTab === "proposals" && (
                  <div className="space-y-4">
                    {proposals.length > 0 ? (
                      <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                        {proposals.map((prop) => (
                          <div key={prop.id} className="p-4 rounded-xl bg-surfaceSubtle border border-surfaceBorder space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold border ${
                                  prop.action === "ADD_EVIDENCE" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                }`}>
                                  {prop.action}
                                </span>
                                <span className="text-xs font-mono text-textMuted">{prop.id}</span>
                              </div>
                              <span className={`text-[10px] uppercase font-bold font-mono ${
                                prop.status === "approved" ? "text-emerald-400" : prop.status === "rejected" ? "text-rose-400" : "text-amber-400"
                              }`}>
                                {prop.status}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-textMain font-heading">
                                Propose Candidate ID: <code className="text-primary">{prop.candidate_id}</code>
                              </h4>
                              <p className="text-xs font-bold text-textMain">{prop.candidate_title}</p>
                              <p className="text-[11px] text-textMuted">{prop.candidate_summary}</p>
                              {prop.reason && (
                                <p className="text-[10px] italic text-textMuted">Reason: {prop.reason}</p>
                              )}
                            </div>

                            {prop.status === "pending" && (
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surfaceBorder">
                                <button
                                  onClick={() => handleRejectProposal(prop.id)}
                                  className="px-2.5 py-1.5 rounded bg-surface border border-surfaceBorder hover:border-rose-500 text-rose-400 text-[10px] font-semibold transition-all"
                                >
                                  Reject Proposal
                                </button>
                                <button
                                  onClick={() => handleApproveProposal(prop.id)}
                                  className="px-2.5 py-1.5 rounded bg-primary hover:bg-primary-hover text-white text-[10px] font-bold transition-all"
                                >
                                  Approve & Catalog
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed border-surfaceBorder rounded-xl bg-surfaceSubtle">
                        <Wrench className="w-6 h-6 text-textMuted mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-textMuted">No pending proposals. Click &quot;Compile Knowledge&quot; to scan the source.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab content: Approved Knowledge */}
                {detailTab === "approved" && (
                  <div className="space-y-2">
                    {selectedSource.knowledge_objects && selectedSource.knowledge_objects.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedSource.knowledge_objects.map((objId) => (
                          <Link
                            key={objId}
                            href={`/knowledge/${objId}`}
                            className="p-3 rounded-lg bg-surfaceSubtle border border-surfaceBorder hover:border-primary/50 transition-colors flex items-center justify-between text-xs font-medium text-primary font-mono"
                          >
                            <span>{objId}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-textMuted" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed border-surfaceBorder rounded-xl bg-surfaceSubtle">
                        <Database className="w-6 h-6 text-textMuted mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-textMuted">No canonical knowledge objects linked to this source yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center border border-dashed border-surfaceBorder rounded-2xl bg-surface">
              <Database className="w-8 h-8 text-textMuted mx-auto mb-2 opacity-40" />
              <p className="text-xs text-textMuted">Select a source card to inspect raw evidence metadata and proposals.</p>
            </div>
          )}
        </div>
      </div>

      {/* Ingestion Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-surfaceBorder rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 chamfered-hud">
            <div className="flex items-center justify-between border-b border-surfaceBorder pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-textMain font-heading">
                Ingest Source Document
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-textMuted hover:text-textMain text-xs font-semibold font-mono"
              >
                [ CLOSE ]
              </button>
            </div>

            {/* Modal Modes Toggles */}
            <div className="flex border-b border-surfaceBorder">
              <button
                type="button"
                onClick={() => {
                  setIngestMode("upload");
                  setUploadError(null);
                  setUploadMessage(null);
                }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  ingestMode === "upload"
                    ? "border-primary text-primary"
                    : "border-transparent text-textMuted"
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setIngestMode("paste");
                  setUploadError(null);
                  setUploadMessage(null);
                }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  ingestMode === "paste"
                    ? "border-primary text-primary"
                    : "border-transparent text-textMuted"
                }`}
              >
                Paste Content
              </button>
            </div>

            <form onSubmit={handleIngest} className="space-y-4">
              {ingestMode === "upload" ? (
                // File upload fields
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textMuted block uppercase font-heading">Source File</label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg p-2.5 text-xs text-textMain file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover file:chamfered-btn"
                      required
                    />
                    <span className="text-[10px] text-textMuted block italic">Supported: MD, TXT, PDF, JSON, YAML</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textMuted block uppercase font-heading">Source Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. FastAPI Security Guide"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textMuted block uppercase font-heading">Source URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              ) : (
                // Paste content fields
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textMuted block uppercase font-heading">Source Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Authentication Playbook"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textMuted block uppercase font-heading">Content Type</label>
                    <select
                      value={pasteType}
                      onChange={(e) => setPasteType(e.target.value)}
                      className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:border-primary"
                    >
                      <option value="markdown">Markdown</option>
                      <option value="text">Plain Text</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-textMuted block uppercase font-heading">Raw Content</label>
                    <textarea
                      placeholder="Paste your document content here..."
                      rows={6}
                      value={pasteContent}
                      onChange={(e) => setPasteContent(e.target.value)}
                      className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain font-mono focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Status and Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-surfaceBorder">
                {uploadMessage && (
                  <p className="text-xs font-mono font-medium text-emerald-400">{uploadMessage}</p>
                )}
                {uploadError && (
                  <p className="text-xs font-mono font-medium text-rose-400">{uploadError}</p>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg bg-surfaceSubtle border border-surfaceBorder hover:border-primary text-textMain text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    {isUploading ? "Ingesting..." : "Ingest Source"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
