"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { GraphData } from "@/lib/api";
import { getTypeIcon } from "./icons";

/* ──────────────────────────────────────────────
   TYPE → COLOR MAP  (consistent across themes)
   ────────────────────────────────────────────── */
const TYPE_COLORS: Record<string, { bg: string; border: string; glow: string; text: string; ring: string; dot: string }> = {
  concept:          { bg: "#0d2847", border: "#3b82f6", glow: "0 0 18px rgba(59,130,246,0.35)",   text: "#93c5fd", ring: "rgba(59,130,246,0.3)",  dot: "#3b82f6" },
  technology:       { bg: "#0f2e1e", border: "#22c55e", glow: "0 0 18px rgba(34,197,94,0.35)",    text: "#86efac", ring: "rgba(34,197,94,0.3)",   dot: "#22c55e" },
  pattern:          { bg: "#2d1b4e", border: "#a855f7", glow: "0 0 18px rgba(168,85,247,0.35)",   text: "#d8b4fe", ring: "rgba(168,85,247,0.3)",  dot: "#a855f7" },
  architecture:     { bg: "#362008", border: "#f59e0b", glow: "0 0 18px rgba(245,158,11,0.35)",   text: "#fcd34d", ring: "rgba(245,158,11,0.3)",  dot: "#f59e0b" },
  decision:         { bg: "#3b1323", border: "#f43f5e", glow: "0 0 18px rgba(244,63,94,0.35)",    text: "#fda4af", ring: "rgba(244,63,94,0.3)",   dot: "#f43f5e" },
  source:           { bg: "#0c2a2a", border: "#14b8a6", glow: "0 0 18px rgba(20,184,166,0.35)",   text: "#99f6e4", ring: "rgba(20,184,166,0.3)",  dot: "#14b8a6" },
  debug_playbook:   { bg: "#2b1215", border: "#ef4444", glow: "0 0 18px rgba(239,68,68,0.35)",    text: "#fca5a5", ring: "rgba(239,68,68,0.3)",   dot: "#ef4444" },
  test:             { bg: "#1a2332", border: "#06b6d4", glow: "0 0 18px rgba(6,182,212,0.35)",    text: "#67e8f9", ring: "rgba(6,182,212,0.3)",   dot: "#06b6d4" },
  engineering_loop: { bg: "#1f2a0f", border: "#84cc16", glow: "0 0 18px rgba(132,204,22,0.35)",   text: "#bef264", ring: "rgba(132,204,22,0.3)",  dot: "#84cc16" },
  lesson:           { bg: "#1f2a0f", border: "#84cc16", glow: "0 0 18px rgba(132,204,22,0.35)",   text: "#bef264", ring: "rgba(132,204,22,0.3)",  dot: "#84cc16" },
};

const DEFAULT_COLOR = { bg: "#151b26", border: "#64748b", glow: "0 0 12px rgba(100,116,139,0.25)", text: "#cbd5e1", ring: "rgba(100,116,139,0.2)", dot: "#64748b" };

function getTypeColor(type: string) {
  const key = type.toLowerCase().replace(/[\s-]/g, "_");
  return TYPE_COLORS[key] || DEFAULT_COLOR;
}

/* ──────────────────────────────────────────────
   CUSTOM NODE COMPONENT — Glassmorphic Card
   ────────────────────────────────────────────── */
const CustomKnowledgeNode = ({ data }: { data: any }) => {
  const isCenter = data.isCenter;
  const colors = getTypeColor(data.type);

  return (
    <div
      style={{
        background: isCenter
          ? `linear-gradient(135deg, ${colors.bg}, ${colors.border}22)`
          : `linear-gradient(145deg, ${colors.bg}ee, #0a0f1acc)`,
        borderColor: isCenter ? colors.border : `${colors.border}55`,
        boxShadow: isCenter
          ? `${colors.glow}, inset 0 1px 0 ${colors.border}33`
          : `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 ${colors.border}15`,
      }}
      className={`
        px-3.5 py-2.5 rounded-xl border-2 text-left min-w-[170px] max-w-[220px]
        backdrop-blur-sm transition-all duration-200 cursor-pointer
        ${isCenter ? "scale-110 ring-2 ring-blue-400/40" : "hover:scale-105"}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: colors.dot,
          width: 8,
          height: 8,
          border: `2px solid ${colors.bg}`,
          boxShadow: `0 0 6px ${colors.dot}88`,
        }}
      />

      {/* Type Row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color: colors.border }} className="shrink-0">
            {getTypeIcon(data.type, { size: 13 })}
          </span>
          <span
            style={{ color: colors.text }}
            className="text-[9px] font-mono uppercase tracking-[0.1em] font-bold"
          >
            {data.type.replace(/_/g, " ")}
          </span>
        </div>
        {isCenter && (
          <span
            style={{
              background: colors.border,
              color: colors.bg,
            }}
            className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider"
          >
            center
          </span>
        )}
      </div>

      {/* Title */}
      <div
        className="text-[12px] font-semibold leading-snug line-clamp-2"
        style={{ color: "#f1f5f9" }}
      >
        {data.label}
      </div>

      {/* Summary */}
      {data.summary && (
        <div
          className="text-[10px] mt-1 leading-tight line-clamp-2 opacity-70"
          style={{ color: colors.text }}
        >
          {data.summary}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: colors.dot,
          width: 8,
          height: 8,
          border: `2px solid ${colors.bg}`,
          boxShadow: `0 0 6px ${colors.dot}88`,
        }}
      />
    </div>
  );
};

const nodeTypes = {
  knowledgeNode: CustomKnowledgeNode,
};

/* ──────────────────────────────────────────────
   GRAPH LAYOUT ENGINE (Radial + Cluster Aware)
   ────────────────────────────────────────────── */
function layoutGraph(graphData: GraphData) {
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const centerId = graphData.center_id;
  const nList = graphData.nodes;
  const count = nList.length;

  const nodePositions: Record<string, { x: number; y: number }> = {};
  const cx = 500, cy = 400;

  // Build adjacency
  const adjacency: Record<string, string[]> = {};
  for (const n of nList) adjacency[n.id] = [];
  for (const e of graphData.edges || []) {
    if (adjacency[e.source]) adjacency[e.source].push(e.target);
    if (adjacency[e.target]) adjacency[e.target].push(e.source);
  }

  if (centerId && nList.some((n) => n.id === centerId)) {
    // ─── FOCUSED SUBGRAPH LAYOUT ───
    const ringMap: Record<string, number> = { [centerId]: 0 };
    const queue = [centerId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currRing = ringMap[curr];
      for (const nb of (adjacency[curr] || [])) {
        if (ringMap[nb] === undefined) {
          ringMap[nb] = currRing + 1;
          queue.push(nb);
        }
      }
    }

    const rings: Record<number, string[]> = {};
    for (const n of nList) {
      const r = ringMap[n.id] ?? 2;
      if (!rings[r]) rings[r] = [];
      rings[r].push(n.id);
    }

    const ringKeys = Object.keys(rings).map(Number).sort((a, b) => a - b);
    for (const ringIdx of ringKeys) {
      const ids = rings[ringIdx];
      if (ringIdx === 0) {
        for (const id of ids) nodePositions[id] = { x: cx, y: cy };
      } else {
        const radius = 190 + (ringIdx - 1) * 160 + Math.min(ids.length * 12, 100);
        const startAngle = -Math.PI / 2 + (ringIdx % 2 === 0 ? 0.25 : 0);
        ids.forEach((id, i) => {
          const angle = startAngle + (i / ids.length) * 2 * Math.PI;
          nodePositions[id] = {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
          };
        });
      }
    }
  } else {
    // ─── GLOBAL ALL-NODES CLUSTER LAYOUT ───
    const typeOrder = [
      "concept",
      "technology",
      "architecture",
      "pattern",
      "decision",
      "engineering_loop",
      "test",
      "bug",
      "debug_playbook",
      "source",
    ];

    const typeGroups: Record<string, string[]> = {};
    for (const n of nList) {
      const t = (n.type || "other").toLowerCase();
      if (!typeGroups[t]) typeGroups[t] = [];
      typeGroups[t].push(n.id);
    }

    const presentTypes = Object.keys(typeGroups).sort((a, b) => {
      const idxA = typeOrder.indexOf(a);
      const idxB = typeOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return typeGroups[b].length - typeGroups[a].length;
    });

    const numClusters = presentTypes.length;
    const clusterOrbitRadius = Math.max(300, Math.min(500, numClusters * 52));

    presentTypes.forEach((type, clusterIdx) => {
      const clusterAngle = -Math.PI / 2 + (clusterIdx / numClusters) * 2 * Math.PI;
      const clusterCenterX = cx + clusterOrbitRadius * Math.cos(clusterAngle);
      const clusterCenterY = cy + clusterOrbitRadius * Math.sin(clusterAngle);

      const nodeIds = typeGroups[type];
      const clusterNodeCount = nodeIds.length;

      if (clusterNodeCount === 1) {
        nodePositions[nodeIds[0]] = { x: clusterCenterX, y: clusterCenterY };
      } else if (clusterNodeCount <= 4) {
        const subRadius = 90;
        nodeIds.forEach((id, idx) => {
          const subAngle = (idx / clusterNodeCount) * 2 * Math.PI;
          nodePositions[id] = {
            x: clusterCenterX + subRadius * Math.cos(subAngle),
            y: clusterCenterY + subRadius * Math.sin(subAngle),
          };
        });
      } else {
        const subRadius = Math.max(95, Math.min(165, clusterNodeCount * 24));
        nodeIds.forEach((id, idx) => {
          const subAngle = (idx / clusterNodeCount) * 2 * Math.PI;
          nodePositions[id] = {
            x: clusterCenterX + subRadius * Math.cos(subAngle),
            y: clusterCenterY + subRadius * Math.sin(subAngle),
          };
        });
      }
    });
  }

  const nodes: Node[] = nList.map((n) => {
    const pos = nodePositions[n.id] || { x: cx, y: cy };
    return {
      id: n.id,
      type: "knowledgeNode",
      position: pos,
      data: {
        label: n.label || n.id,
        type: n.type,
        summary: n.summary,
        isCenter: n.id === centerId,
      },
    };
  });

  // Edge styling
  const edges: Edge[] = (graphData.edges || []).map((e, idx) => {
    const sourceNode = nList.find((n) => n.id === e.source);
    const colors = getTypeColor(sourceNode?.type || "");

    return {
      id: `edge-${e.source}-${e.target}-${idx}`,
      source: e.source,
      target: e.target,
      label: e.label?.replace(/_/g, " "),
      labelStyle: {
        fill: "#94a3b8",
        fontSize: 9,
        fontFamily: "'Space Grotesk', 'IBM Plex Mono', monospace",
        fontWeight: 500,
        letterSpacing: "0.03em",
      },
      labelBgStyle: { fill: "#0a0f1a", fillOpacity: 0.92, rx: 6, ry: 6 },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 6,
      style: {
        stroke: `${colors.dot}88`,
        strokeWidth: 1.6,
      },
      animated: e.source === centerId || e.target === centerId,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: colors.dot,
        width: 14,
        height: 14,
      },
    };
  });

  return { nodes, edges };
}

/* ──────────────────────────────────────────────
   NODE INSPECTOR SIDEBAR
   ────────────────────────────────────────────── */
interface NodeInspectorProps {
  node: GraphData["nodes"][0] | null;
  onNavigate: (id: string) => void;
  onClose: () => void;
  edges: GraphData["edges"];
  allNodes: GraphData["nodes"];
}

const NodeInspector: React.FC<NodeInspectorProps> = ({ node, onNavigate, onClose, edges, allNodes }) => {
  if (!node) return null;

  const colors = getTypeColor(node.type);

  // Find connected nodes
  const connectedEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
  const connections = connectedEdges.map((e) => {
    const isOutgoing = e.source === node.id;
    const otherId = isOutgoing ? e.target : e.source;
    const otherNode = allNodes.find((n) => n.id === otherId);
    return { id: otherId, label: otherNode?.label || otherId, type: otherNode?.type || "", relation: e.label, isOutgoing };
  });

  return (
    <div
      className="absolute top-3 right-3 w-[280px] z-20 rounded-xl border-2 backdrop-blur-lg p-4 space-y-3 shadow-2xl animate-in slide-in-from-right-4 duration-200"
      style={{
        background: `linear-gradient(160deg, ${colors.bg}f0, #0a0f1af0)`,
        borderColor: `${colors.border}55`,
        boxShadow: `${colors.glow}, 0 8px 40px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: colors.border }}>{getTypeIcon(node.type, { size: 16 })}</span>
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-widest"
            style={{ color: colors.text }}
          >
            {node.type.replace(/_/g, " ")}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <div className="text-sm font-bold text-white leading-snug">{node.label}</div>

      {/* Summary */}
      {node.summary && (
        <p className="text-[11px] leading-relaxed text-slate-400">{node.summary}</p>
      )}

      {/* Domains */}
      {node.domains && node.domains.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.domains.map((d) => (
            <span
              key={d}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-md border"
              style={{ borderColor: `${colors.border}44`, color: colors.text, background: `${colors.border}11` }}
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {/* Connections List */}
      {connections.length > 0 && (
        <div className="pt-2 border-t border-white/10 space-y-1.5">
          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            Connections ({connections.length})
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {connections.map((c, i) => {
              const cColors = getTypeColor(c.type);
              return (
                <button
                  key={i}
                  onClick={() => onNavigate(c.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: cColors.dot }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-slate-300 truncate group-hover:text-white transition-colors">
                      {c.label}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500">
                      {c.isOutgoing ? "→" : "←"} {c.relation?.replace(/_/g, " ")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigate Button */}
      <button
        onClick={() => onNavigate(node.id)}
        className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
        style={{
          background: `linear-gradient(135deg, ${colors.border}33, ${colors.border}11)`,
          border: `1px solid ${colors.border}44`,
          color: colors.text,
        }}
      >
        Open in Knowledge Base →
      </button>
    </div>
  );
};

/* ──────────────────────────────────────────────
   MAIN GRAPH VIEW COMPONENT
   ────────────────────────────────────────────── */
interface GraphViewProps {
  graphData: GraphData;
  onNodeClick?: (nodeId: string) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ graphData, onNodeClick }) => {
  const [inspectedNode, setInspectedNode] = useState<GraphData["nodes"][0] | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => layoutGraph(graphData),
    [graphData]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state whenever layout or graphData changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const gNode = graphData.nodes.find((n) => n.id === node.id);
      setInspectedNode(gNode || null);
    },
    [graphData]
  );

  const handleInspectorNavigate = useCallback(
    (id: string) => {
      if (onNodeClick) onNodeClick(id);
    },
    [onNodeClick]
  );

  return (
    <div
      className="w-full h-full min-h-[450px] rounded-xl overflow-hidden border border-hairline relative"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #0d1520 0%, #060a10 70%, #030508 100%)",
      }}
    >
      {/* Ambient glow at center */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 50%)",
        }}
      />

      <ReactFlow
        key={graphData.center_id || "all-nodes"}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        className="dark-graph"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#1e293b"
          gap={28}
          size={1.2}
        />
        <Controls
          className="!bg-[#0d1520]/90 !border-[#1e293b] !rounded-xl !shadow-2xl"
          style={{ bottom: 16, left: 16 }}
        />
        <MiniMap
          nodeColor={(node) => {
            const t = node.data?.type || "";
            return getTypeColor(t).dot;
          }}
          maskColor="rgba(6, 10, 16, 0.8)"
          className="!bg-[#0d1520]/90 !border-[#1e293b] !rounded-xl"
          style={{ bottom: 16, right: 16 }}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Node Inspector Panel */}
      <NodeInspector
        node={inspectedNode}
        onNavigate={handleInspectorNavigate}
        onClose={() => setInspectedNode(null)}
        edges={graphData.edges || []}
        allNodes={graphData.nodes || []}
      />

      {/* Legend Overlay */}
      <div className="absolute bottom-3 left-16 z-10 flex flex-wrap gap-2 px-3 py-2 rounded-lg bg-[#060a10]/80 backdrop-blur border border-[#1e293b]/60">
        {Object.entries(TYPE_COLORS).slice(0, 6).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: c.dot, boxShadow: `0 0 4px ${c.dot}66` }} />
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
              {type.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
