"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Network, 
  ArrowLeft, 
  Tag, 
  Globe, 
  FolderGit2, 
  FileCode,
  Share2
} from "lucide-react";
import { fetchKnowledgeObject, KnowledgeDetail } from "@/lib/api";

export default function KnowledgeDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<KnowledgeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchKnowledgeObject(id)
      .then((data) => {
        setItem(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="text-xs text-textMuted py-12 text-center">Loading knowledge object...</div>;
  }

  if (error || !item) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center border border-surfaceBorder rounded-2xl bg-surface">
        <h2 className="text-lg font-bold text-rose-500 mb-2 font-heading">Knowledge Object Not Found</h2>
        <p className="text-xs text-textMuted mb-4">{error || `Could not find object '${id}'`}</p>
        <Link href="/knowledge" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1.5 text-xs text-textMuted hover:text-textMain transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </Link>

        <Link
          href={`/graph?center=${item.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-surfaceBorder hover:border-primary text-textMain text-xs font-semibold shadow-sm transition-all"
        >
          <Network className="w-3.5 h-3.5 text-primary" />
          <span>View Context Graph</span>
        </Link>
      </div>

      {/* Main Knowledge Header Card */}
      <div className="p-6 rounded-2xl bg-surface border border-surfaceBorder space-y-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-2.5 py-0.5 rounded-md font-mono uppercase font-bold border badge-${item.type}`}>
            {item.type}
          </span>
          <span className="text-xs font-mono text-textMuted">
            ID: <strong className="text-textMain">{item.id}</strong>
          </span>
          {item.status && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-medium">
              {item.status}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-textMain font-heading">
          {item.title}
        </h1>

        {item.summary && (
          <p className="text-sm text-textMain leading-relaxed bg-surfaceSubtle p-4 rounded-xl border border-surfaceBorder/60">
            {item.summary}
          </p>
        )}

        {/* Metadata Chips */}
        <div className="flex items-center gap-4 text-xs text-textMuted flex-wrap pt-2 border-t border-surfaceBorder">
          {item.domains.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 opacity-60" />
              <span>Domains: <strong className="text-textMain">{item.domains.join(", ")}</strong></span>
            </div>
          )}
          {item.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 opacity-60" />
              <span>Tags: <strong className="text-textMain">{item.tags.join(", ")}</strong></span>
            </div>
          )}
          {item.file_path && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-textMuted">
              <FileCode className="w-3.5 h-3.5 opacity-60" />
              <span>{item.file_path}</span>
            </div>
          )}
        </div>
      </div>

      {/* Relations & Backlinks Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outbound Relations */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-textMain font-heading">
            <Share2 className="w-3.5 h-3.5 text-primary" />
            <span>Outbound Relations</span>
          </div>

          {item.relations && Object.keys(item.relations).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(item.relations).map(([relType, targets]) => (
                <div key={relType} className="space-y-1">
                  <span className="text-[11px] font-mono text-textMuted uppercase">{relType}:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(targets) ? targets : [targets]).map((targetId) => (
                      <Link
                        key={targetId}
                        href={`/knowledge/${targetId}`}
                        className="text-xs px-2.5 py-1 rounded bg-surfaceSubtle hover:bg-background border border-surfaceBorder text-primary font-medium hover:border-primary transition-colors font-mono"
                      >
                        {targetId}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-textMuted">No outbound relations recorded.</p>
          )}
        </div>

        {/* Inbound Backlinks */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-textMain font-heading">
            <Network className="w-3.5 h-3.5 text-emerald-500" />
            <span>Referenced By (Backlinks)</span>
          </div>

          {item.backlinks && item.backlinks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.backlinks.map((bl) => (
                <Link
                  key={`${bl.source_id}-${bl.relation_type}`}
                  href={`/knowledge/${bl.source_id}`}
                  className="text-xs px-2.5 py-1 rounded bg-surfaceSubtle hover:bg-background border border-surfaceBorder text-textMain hover:border-primary transition-colors flex items-center gap-1 font-mono"
                >
                  <span className="text-textMuted text-[10px]">{bl.relation_type} &larr;</span>
                  <span className="font-semibold">{bl.source_id}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-textMuted">No incoming backlinks found.</p>
          )}
        </div>
      </div>

      {/* Markdown Content Section */}
      <div className="p-6 rounded-2xl bg-surface border border-surfaceBorder space-y-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-textMuted border-b border-surfaceBorder pb-3 font-heading">
          Canonical Markdown Body
        </h2>
        <div className="prose prose-slate dark:prose-invert prose-sm max-w-none text-textMain leading-relaxed font-sans whitespace-pre-wrap">
          {item.body || "No markdown body content."}
        </div>
      </div>
    </div>
  );
}
