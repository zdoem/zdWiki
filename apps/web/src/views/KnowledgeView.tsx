"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useConsole } from "@/store/consoleStore";
import { Panel, Button, LifecycleBadge, TypeBadge, Badge } from "@/components/ui";
import { IconSearch, IconRefresh } from "@/components/icons";

const WIKI_TYPES = new Set([
  "concept",
  "technology",
  "pattern",
  "architecture",
  "test",
  "bug",
  "debug_playbook",
  "decision",
  "analysis",
]);

export const KnowledgeView: React.FC = () => {
  const { knowledgeList, openDetail, refreshData, isLoading, typeFilter, setTypeFilter } = useConsole();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>(typeFilter || "ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Keep selectedType synced with store typeFilter
  useEffect(() => {
    if (typeFilter) {
      setSelectedType(typeFilter);
    } else {
      setSelectedType("ALL");
    }
  }, [typeFilter]);

  const handleSelectType = (t: string) => {
    setSelectedType(t);
    setTypeFilter(t === "ALL" ? null : t);
  };

  // Extract unique types belonging to Wiki knowledge
  const types = useMemo(() => {
    const set = new Set(
      knowledgeList
        .filter((k) => WIKI_TYPES.has((k.type || "").toLowerCase()))
        .map((k) => k.type)
    );
    return ["ALL", ...Array.from(set)];
  }, [knowledgeList]);

  const statuses = useMemo(() => {
    const set = new Set(
      knowledgeList
        .filter((k) => WIKI_TYPES.has((k.type || "").toLowerCase()))
        .map((k) => k.lifecycle_status || k.status || "current")
    );
    return ["ALL", ...Array.from(set)];
  }, [knowledgeList]);

  // Filtered items (scoped to Wiki knowledge objects)
  const filtered = useMemo(() => {
    return knowledgeList.filter((item) => {
      const isWikiType = WIKI_TYPES.has((item.type || "").toLowerCase());
      if (!isWikiType && selectedType === "ALL") return false;

      const matchSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.summary.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchType = selectedType === "ALL" ? isWikiType : item.type.toLowerCase() === selectedType.toLowerCase();
      const currentStatus = item.lifecycle_status || item.status || "current";
      const matchStatus = selectedStatus === "ALL" || currentStatus.toLowerCase() === selectedStatus.toLowerCase();

      return matchSearch && matchType && matchStatus;
    });
  }, [knowledgeList, search, selectedType, selectedStatus]);

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-textMain tracking-tight">Knowledge Objects</h1>
          <p className="text-xs text-textDim font-mono mt-0.5">
            Showing {filtered.length} of {knowledgeList.filter((k) => WIKI_TYPES.has((k.type || "").toLowerCase())).length} verified knowledge objects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<IconRefresh size={13} className={isLoading ? "animate-spin" : ""} />}
            onClick={() => refreshData()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search input */}
        <div className="relative sm:col-span-1">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textDim" />
          <input
            type="text"
            placeholder="Filter by title, ID, tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-hairline rounded-lg pl-8 pr-3 py-1.5 text-xs text-textMain placeholder-textDim focus:outline-none focus:border-brass/50 font-mono transition-colors"
          />
        </div>

        {/* Type selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none sm:col-span-2">
          <span className="text-[10px] font-mono text-textDim uppercase tracking-wider shrink-0 mr-1">Type:</span>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => handleSelectType(t)}
              className={`px-2 py-1 rounded text-[11px] font-mono shrink-0 transition-colors ${
                selectedType.toLowerCase() === t.toLowerCase()
                  ? "bg-brass/20 text-brass border border-brass/40 font-semibold"
                  : "bg-surface text-textDim hover:text-textMain hover:bg-surfaceHighlight border border-hairline"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-mono text-textDim uppercase tracking-wider shrink-0 mr-1">Status:</span>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStatus(s)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 transition-colors ${
              selectedStatus.toLowerCase() === s.toLowerCase()
                ? "bg-textMain/10 text-textMain border border-hairline font-semibold"
                : "text-textDim hover:text-textMain"
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List of Objects */}
      {filtered.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-xs font-mono text-textDim">No knowledge objects match your filter criteria.</p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => openDetail(item.id)}
              className="p-3.5 rounded-lg bg-surface border border-hairline hover:border-brass/40 hover:bg-surfaceHighlight cursor-pointer transition-all duration-150 group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={item.type} />
                  <span className="font-mono text-xs font-semibold text-textMain group-hover:text-brass transition-colors truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] font-mono text-textDim">({item.id})</span>
                </div>
                <p className="text-xs text-textDim line-clamp-2 leading-relaxed">
                  {item.summary || "No summary provided."}
                </p>
                {/* Domain & Tags */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {item.domains.map((d) => (
                    <span key={d} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surfaceElevated text-textMuted border border-hairline">
                      {d}
                    </span>
                  ))}
                  {item.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] font-mono text-textDim">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-hairline">
                <LifecycleBadge status={item.lifecycle_status || item.status} />
                {item.verification_status && (
                  <span className="text-[10px] font-mono text-textDim capitalize">
                    {item.verification_status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
