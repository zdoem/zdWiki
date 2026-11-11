"use client";

import React, { useState, useEffect } from "react";
import { useConsole } from "@/store/consoleStore";
import { fetchKnowledgeObject, KnowledgeDetail } from "@/lib/api";
import { Panel, Card, Button, Badge, LifecycleBadge, TypeBadge, Kbd } from "@/components/ui";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { IconCopy, IconCheck, IconGraph, IconSource, IconShield } from "@/components/icons";

export const DetailView: React.FC = () => {
  const { selectedId, goBack, openDetail, setView } = useConsole();
  const [detail, setDetail] = useState<KnowledgeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setIsLoading(true);
    fetchKnowledgeObject(selectedId)
      .then((d) => setDetail(d))
      .catch((e) => console.error("Could not load knowledge object detail:", e))
      .finally(() => setIsLoading(false));
  }, [selectedId]);

  if (!selectedId) {
    return (
      <div className="p-8 text-center text-textDim font-mono">
        No knowledge object selected.{" "}
        <Button variant="ghost" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-textDim font-mono space-y-2">
        <div className="text-brass animate-pulse">Loading canonical record `{selectedId}`...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 text-center text-rose font-mono">
        Knowledge object `{selectedId}` not found.{" "}
        <Button variant="outline" onClick={goBack}>
          Back to List
        </Button>
      </div>
    );
  }

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(detail.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const relations = detail.relations || {};
  const backlinks = detail.backlinks || [];
  const sources = detail.sources || [];
  const evidence = detail.evidence || [];

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={goBack}>
          ← Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={copied ? <IconCheck size={14} className="text-emerald" /> : <IconCopy size={14} />}
            onClick={handleCopyMarkdown}
          >
            {copied ? "Copied Markdown" : "Copy Markdown"}
          </Button>
          <Button
            variant="brass"
            size="sm"
            icon={<IconGraph size={14} />}
            onClick={() => setView("graph", detail.id)}
          >
            View in Graph
          </Button>
        </div>
      </div>

      {/* Main Object Header Card */}
      <div className="p-6 rounded-xl bg-surfaceElevated border border-hairline relative">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <TypeBadge type={detail.type} />
          <LifecycleBadge status={detail.lifecycle_status || detail.status} />
          {detail.verification_status && (
            <Badge variant="mono" size="sm">
              {detail.verification_status}
            </Badge>
          )}
          {detail.knowledge_scope && (
            <Badge variant="cyan" size="sm">
              {detail.knowledge_scope}
            </Badge>
          )}
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-textMain tracking-tight">
          {detail.title}
        </h1>

        <div className="text-xs font-mono text-brass mt-1">ID: {detail.id}</div>

        {detail.summary && (
          <p className="text-sm text-textMuted mt-3 leading-relaxed border-t border-hairline/60 pt-3">
            {detail.summary}
          </p>
        )}

        {/* Metadata Badges & Version Tags */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-mono text-textDim border-t border-hairline/60 pt-3">
          {detail.version && (
            <div>
              <span className="text-textMuted font-semibold">Version: </span>
              <span>
                {detail.version.introduced_in ? `intro:${detail.version.introduced_in} ` : ""}
                {detail.version.deprecated_in ? `dep:${detail.version.deprecated_in} ` : ""}
                {detail.version.removed_in ? `rem:${detail.version.removed_in}` : ""}
              </span>
            </div>
          )}
          {detail.file_path && (
            <div>
              <span className="text-textMuted font-semibold">File: </span>
              <span className="text-textDim">{detail.file_path}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content & Relations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Markdown Body (3 Columns) */}
        <div className="lg:col-span-3 space-y-6">
          <Panel title="Canonical Markdown Body">
            <MarkdownRenderer content={detail.body} onNavigateObject={openDetail} />
          </Panel>
        </div>

        {/* Sidebar: Relations, Backlinks, Evidence (1 Column) */}
        <div className="lg:col-span-1 space-y-5">
          {/* Outbound Relations */}
          <Panel title="Relations">
            {Object.keys(relations).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(relations).map(([relType, targets]) => (
                  <div key={relType} className="space-y-1">
                    <div className="text-[11px] font-mono text-textDim uppercase tracking-wider">
                      {relType.replace("_", " ")}:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(targets) ? targets : [targets]).map((tgt) => (
                        <button
                          key={tgt}
                          onClick={() => openDetail(tgt)}
                          className="px-2 py-1 bg-surface rounded text-xs font-mono text-brass hover:bg-brass/20 border border-hairline transition-colors truncate max-w-full text-left"
                        >
                          {tgt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-textDim font-mono">No outbound relations.</div>
            )}
          </Panel>

          {/* Inbound Backlinks */}
          <Panel title="Inbound Backlinks">
            {backlinks.length > 0 ? (
              <div className="space-y-1.5">
                {backlinks.map((b, idx) => (
                  <button
                    key={`${b.source_id}-${idx}`}
                    onClick={() => openDetail(b.source_id)}
                    className="w-full flex items-center justify-between p-2 rounded bg-surface hover:bg-surfaceHighlight border border-hairline text-left transition-colors"
                  >
                    <span className="text-xs font-mono text-cyan truncate">{b.source_id}</span>
                    <span className="text-[10px] font-mono text-textDim">{b.relation_type}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-textDim font-mono">No inbound backlinks.</div>
            )}
          </Panel>

          {/* Evidence & Sources */}
          {(sources.length > 0 || evidence.length > 0) && (
            <Panel title="Provenance & Evidence">
              <div className="space-y-2">
                {sources.map((s) => (
                  <button
                    key={s}
                    onClick={() => openDetail(s)}
                    className="w-full flex items-center gap-2 p-2 rounded bg-surface hover:bg-surfaceHighlight border border-hairline text-left transition-colors"
                  >
                    <IconSource size={14} className="text-brass shrink-0" />
                    <span className="text-xs font-mono text-textMuted truncate">{s}</span>
                  </button>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};
