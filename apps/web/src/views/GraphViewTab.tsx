"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useConsole } from "@/store/consoleStore";
import { fetchGraph, GraphData } from "@/lib/api";
import { GraphView } from "@/components/GraphView";
import { Badge, Button } from "@/components/ui";
import { IconGraph, IconAllObjects } from "@/components/icons";

export const GraphViewTab: React.FC = () => {
  const { selectedId, openDetail, knowledgeList } = useConsole();
  const [centerId, setCenterId] = useState<string>(selectedId || "");
  const [hops, setHops] = useState<number>(2);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const isAllMode = !centerId || centerId === "ALL";

  useEffect(() => {
    if (selectedId) {
      setCenterId(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    setIsLoading(true);
    const targetId = isAllMode ? undefined : centerId;
    fetchGraph(targetId, hops)
      .then((data) => setGraphData(data))
      .catch((e) => console.error("Could not fetch graph:", e))
      .finally(() => setIsLoading(false));
  }, [centerId, hops, isAllMode]);

  const filteredKnowledge = useMemo(() => {
    if (!searchTerm.trim()) return knowledgeList.slice(0, 30);
    return knowledgeList.filter(
      (k) =>
        k.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [knowledgeList, searchTerm]);

  const stats = useMemo(() => {
    if (!graphData) return { nodes: 0, edges: 0, types: 0 };
    const uniqueTypes = new Set(graphData.nodes.map((n) => n.type));
    return { nodes: graphData.nodes.length, edges: graphData.edges.length, types: uniqueTypes.size };
  }, [graphData]);

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      {/* ─── Toolbar ─── */}
      <div
        className="shrink-0 p-4 rounded-xl border border-hairline"
        style={{
          background: "linear-gradient(135deg, rgba(13,21,32,0.8), rgba(10,15,26,0.9))",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Title & Stats */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0">
              <IconGraph size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-textMain tracking-tight">
                Context Graph Explorer
              </h2>
              <div className="flex items-center gap-3 text-[11px] font-mono text-textDim mt-0.5">
                {graphData ? (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {stats.nodes} nodes
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
                      {stats.edges} edges
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple" />
                      {stats.types} types
                    </span>
                  </>
                ) : (
                  <span className="animate-pulse">Calculating layout…</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View All Toggle Button */}
            <button
              onClick={() => {
                setCenterId(isAllMode ? (selectedId || "concept-acid-transactions") : "");
                setSearchTerm("");
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                isAllMode
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-semibold shadow-sm"
                  : "bg-surface/80 text-textMuted border-hairline hover:text-textMain hover:bg-surfaceHighlight"
              }`}
            >
              <IconAllObjects size={13} />
              <span>{isAllMode ? "🌐 Viewing All Nodes" : "View All Nodes"}</span>
            </button>

            {/* Center Node Search / Selector */}
            <div className="relative">
              <input
                type="text"
                placeholder={isAllMode ? "Focus a specific node…" : "Search center node…"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-52 px-3 py-1.5 bg-surface/80 border border-hairline rounded-lg text-xs font-mono text-textMain placeholder-textDim focus:border-blue-400/50 outline-none"
              />
              {searchTerm && filteredKnowledge.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-72 max-h-52 overflow-y-auto bg-surfaceElevated border border-hairline rounded-lg shadow-2xl z-30">
                  <button
                    onClick={() => {
                      setCenterId("");
                      setSearchTerm("");
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-surfaceHighlight transition-colors border-b border-hairline/40 text-blue-300 font-semibold"
                  >
                    🌐 ALL Nodes (Global Graph Overview)
                  </button>
                  {filteredKnowledge.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => {
                        setCenterId(k.id);
                        setSearchTerm("");
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-surfaceHighlight transition-colors border-b border-hairline/40 last:border-0 ${
                        centerId === k.id ? "bg-blue-500/10 text-blue-300" : "text-textMuted"
                      }`}
                    >
                      <div className="font-semibold text-textMain truncate">{k.title}</div>
                      <div className="text-[10px] text-textDim truncate">{k.id}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown fallback */}
            <select
              value={isAllMode ? "" : centerId}
              onChange={(e) => setCenterId(e.target.value)}
              className="px-3 py-1.5 bg-surface/80 border border-hairline rounded-lg text-xs font-mono text-textMain focus:border-blue-400/50 outline-none max-w-[180px] hidden xl:block"
            >
              <option value="">🌐 ALL (Global Graph)</option>
              {knowledgeList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.title || k.id}
                </option>
              ))}
            </select>

            {/* Hop Depth Selector (Only for focused node) */}
            {!isAllMode && (
              <div className="flex items-center gap-0.5 bg-surface/60 p-1 rounded-lg border border-hairline text-xs font-mono">
                <span className="px-2 text-textDim text-[11px]">Depth:</span>
                {[1, 2, 3].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHops(h)}
                    className={`px-2.5 py-1 rounded-md transition-all duration-150 ${
                      hops === h
                        ? "bg-blue-500 text-white font-bold shadow-sm shadow-blue-500/30"
                        : "text-textMuted hover:text-textMain hover:bg-surface"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active status indicator */}
        <div className="mt-3 pt-3 border-t border-hairline/40 flex items-center gap-2 text-xs font-mono text-textDim">
          <span>Mode:</span>
          {isAllMode ? (
            <Badge variant="cyan" size="sm">
              🌐 ALL Nodes (Global Graph Overview)
            </Badge>
          ) : (
            <>
              <Badge variant="brass" size="sm">
                Focus: {centerId}
              </Badge>
              <span className="text-[10px]">•</span>
              <span>{hops} hop{hops > 1 ? "s" : ""} radius</span>
            </>
          )}
        </div>
      </div>

      {/* ─── Graph Canvas ─── */}
      <div className="flex-1 w-full relative min-h-[500px]">
        {isLoading ? (
          <div
            className="w-full h-full flex flex-col items-center justify-center rounded-xl border border-hairline gap-4"
            style={{
              background: "radial-gradient(ellipse at 50% 40%, #0d1520 0%, #060a10 70%)",
            }}
          >
            <div className="relative w-16 h-16">
              <div
                className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"
                style={{ animationDuration: "1.5s" }}
              />
              <div className="absolute inset-2 rounded-full border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <IconGraph size={20} className="text-blue-400" />
              </div>
            </div>
            <div className="text-sm font-mono text-blue-300 animate-pulse">
              Computing graph topology…
            </div>
          </div>
        ) : graphData ? (
          <GraphView graphData={graphData} onNodeClick={(nodeId) => openDetail(nodeId)} />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-textDim font-mono rounded-xl border border-hairline"
            style={{
              background: "radial-gradient(ellipse at 50% 40%, #0d1520 0%, #060a10 70%)",
            }}
          >
            No graph data available.
          </div>
        )}
      </div>
    </div>
  );
};
