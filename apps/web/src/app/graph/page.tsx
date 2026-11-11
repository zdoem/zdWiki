"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Network, RefreshCw } from "lucide-react";
import { fetchGraph, GraphData } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";

const TYPE_COLORS: Record<string, string> = {
  concept: "#0284C7",
  technology: "#06B6D4",
  pattern: "#9333EA",
  architecture: "#4F46E5",
  test: "#10B981",
  bug: "#E11D48",
  debug_playbook: "#D97706",
  decision: "#0D9488",
  analysis: "#7C3AED",
  engineering_loop: "#EA580C",
  source: "#64748B",
};

function GraphContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const centerParam = searchParams.get("center") || "";

  const [centerId, setCenterId] = useState(centerParam);
  const [hops, setHops] = useState(1);
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const isDark = theme === "dark";

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data: GraphData = await fetchGraph(centerId || undefined, hops);
      
      const count = data.nodes.length;
      const radius = 220 * hops;
      
      const newNodes: Node[] = data.nodes.map((n, i) => {
        let x = 400;
        let y = 300;

        if (n.id === centerId) {
          x = 400;
          y = 300;
        } else {
          const angle = (i / Math.max(1, count - 1)) * 2 * Math.PI;
          x = 400 + radius * Math.cos(angle);
          y = 300 + radius * Math.sin(angle);
        }

        const isCenter = n.id === centerId;
        const color = TYPE_COLORS[n.type] || "#00509D";

        return {
          id: n.id,
          position: { x, y },
          data: {
            label: (
              <div className="text-left font-sans">
                <div className="text-[9px] uppercase font-mono tracking-wider font-semibold opacity-75">{n.type}</div>
                <div className="font-bold text-xs truncate max-w-[130px]">{n.label}</div>
              </div>
            ),
          },
          style: {
            background: isDark ? "#161B22" : "#FFFFFF",
            color: isDark ? "#F0F6FC" : "#1E293B",
            border: `2px solid ${isCenter ? color : color + "80"}`,
            borderRadius: "12px",
            padding: "8px 12px",
            boxShadow: isCenter ? `0 0 16px ${color}60` : `0 2px 8px rgba(0,0,0,0.06)`,
            cursor: "pointer",
            width: 160,
          },
        };
      });

      const newEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        style: { stroke: isDark ? "#484F58" : "#94A3B8", strokeWidth: 1.5 },
        labelStyle: { fill: isDark ? "#8B949E" : "#64748B", fontSize: 10, fontFamily: "monospace" },
        markerEnd: { type: MarkerType.ArrowClosed, color: isDark ? "#8B949E" : "#94A3B8" },
      }));

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [centerId, hops, isDark, setNodes, setEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const onNodeClick = (_: any, node: Node) => {
    router.push(`/knowledge/${node.id}`);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-110px)] flex flex-col">
      {/* Controls Bar */}
      <div className="flex items-center justify-between bg-surface p-3.5 rounded-xl border border-surfaceBorder shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-bold text-textMain font-heading">Context Graph</h1>
          </div>

          {centerId && (
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono font-medium">
              Focus: {centerId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-textMuted font-mono">
            <span>Radius:</span>
            {[1, 2].map((h) => (
              <button
                key={h}
                onClick={() => setHops(h)}
                className={`px-2.5 py-0.5 rounded border transition-all ${
                  hops === h
                    ? "bg-primary text-white border-primary font-bold shadow-xs"
                    : "bg-surfaceSubtle text-textMuted border-surfaceBorder hover:text-textMain"
                }`}
              >
                {h}-Hop
              </button>
            ))}
          </div>

          {centerId && (
            <button
              onClick={() => setCenterId("")}
              className="text-xs px-2.5 py-1 rounded bg-surfaceSubtle border border-surfaceBorder text-textMuted hover:text-textMain"
            >
              Reset Global
            </button>
          )}

          <button
            onClick={loadGraph}
            className="p-1.5 rounded-lg bg-surfaceSubtle border border-surfaceBorder text-textMuted hover:text-textMain"
            title="Reload Graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* React Flow Graph Canvas */}
      <div className="flex-1 rounded-2xl border border-surfaceBorder bg-surfaceSubtle overflow-hidden relative shadow-sm">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color={isDark ? "#30363D" : "#CBD5E1"} gap={16} size={1} />
          <Controls className="bg-surface! border-surfaceBorder! text-textMain!" />
          <MiniMap
            nodeColor={(node) => {
              const objType = node.id.split("-")[0];
              return TYPE_COLORS[objType] || "#00509D";
            }}
            maskColor={isDark ? "rgba(13, 17, 23, 0.7)" : "rgba(248, 250, 252, 0.7)"}
            className="bg-surface! border-surfaceBorder!"
          />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 p-3.5 rounded-xl bg-surface/95 backdrop-blur border border-surfaceBorder text-[11px] space-y-1.5 pointer-events-none shadow-lg">
          <div className="font-bold text-textMain text-[10px] uppercase tracking-wider mb-1 font-heading">
            Legend (Click node to open)
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(TYPE_COLORS).slice(0, 8).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: color }}></span>
                <span className="text-textMuted capitalize font-medium">{type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="text-xs text-textMuted py-12 text-center">Loading context graph...</div>}>
      <GraphContent />
    </Suspense>
  );
}
