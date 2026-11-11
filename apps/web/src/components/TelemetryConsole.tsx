"use client";

import React, { useRef, useEffect } from "react";
import { Badge } from "./ui";

export interface TelemetryLog {
  timestamp: string;
  tag: "SYS" | "FTS5" | "RANK" | "LLM" | "STREAM" | "DONE" | "ERR";
  message: string;
  detail?: string;
}

interface TelemetryConsoleProps {
  logs: TelemetryLog[];
  isStreaming: boolean;
  contextTokens?: number;
  maxTokens?: number;
  latencyMs?: number;
  tokensPerSec?: number;
  modelName?: string;
  activeContext?: string;
}

export const TelemetryConsole: React.FC<TelemetryConsoleProps> = ({
  logs,
  isStreaming,
  contextTokens = 0,
  maxTokens = 6000,
  latencyMs = 0,
  tokensPerSec = 0,
  modelName = "gemini-1.5-flash",
  activeContext = "Java 21 / Spring 6",
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const ctxPct = Math.min(Math.round((contextTokens / maxTokens) * 100), 100);
  const barBlocks = Math.round((ctxPct / 100) * 18);
  const asciiBar = "█".repeat(barBlocks) + "░".repeat(Math.max(18 - barBlocks, 0));

  const tagColors: Record<string, string> = {
    SYS: "text-textDim bg-surface",
    FTS5: "text-cyan bg-cyan/10 border-cyan/30",
    RANK: "text-purple bg-purple/10 border-purple/30",
    LLM: "text-brass bg-brass/10 border-brass/30",
    STREAM: "text-emerald bg-emerald/10 border-emerald/30",
    DONE: "text-emerald bg-emerald/20 border-emerald/40",
    ERR: "text-rose bg-rose/15 border-rose/40",
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d13] rounded-xl border border-hairline overflow-hidden font-mono shadow-2xl text-xs">
      {/* Terminal Title Bar / btop inspired header */}
      <div className="bg-[#121722] px-3.5 py-2 border-b border-hairline flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-brass/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald/80 inline-block" />
          <span className="text-textDim text-[11px] font-semibold tracking-wider ml-1">
            zdwiki://telemetry-monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="inline-flex items-center gap-1.5 text-emerald text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald animate-ping" />
              <span>LIVE STREAM</span>
            </span>
          ) : (
            <span className="text-textDim text-[11px]">IDLE</span>
          )}
        </div>
      </div>

      {/* Top Gauges / btop Hardware & LLM Box */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-[#0d121a] border-b border-hairline text-[11px]">
        {/* Box 1: Context Budget Gauge */}
        <div className="p-2 rounded bg-surface/50 border border-hairline/60 space-y-1">
          <div className="flex justify-between text-textDim">
            <span>CONTEXT_BUDGET</span>
            <span className="text-brass">{ctxPct}%</span>
          </div>
          <div className="text-brass font-bold tracking-widest text-xs">
            [{asciiBar}]
          </div>
          <div className="flex justify-between text-[10px] text-textDim">
            <span>{contextTokens.toLocaleString()} tokens</span>
            <span>max {maxTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* Box 2: Latency & Speed Gauge */}
        <div className="p-2 rounded bg-surface/50 border border-hairline/60 space-y-1">
          <div className="flex justify-between text-textDim">
            <span>METRICS / LATENCY</span>
            <span className="text-cyan">{latencyMs > 0 ? `${latencyMs}ms` : "--"}</span>
          </div>
          <div className="flex justify-between text-[10px] text-textMuted pt-1">
            <span>SPEED:</span>
            <span className="text-emerald font-semibold">
              {tokensPerSec > 0 ? `${tokensPerSec} t/s` : isStreaming ? "streaming..." : "0 t/s"}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-textDim">
            <span>MODEL:</span>
            <span className="text-textMain truncate max-w-[90px]">{modelName}</span>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Stream Log */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-hairline">
        <div className="text-textDim text-[10px] border-b border-hairline/40 pb-1 mb-2">
          --- zdWiki Telemetry Pipeline Initialized [{activeContext}] ---
        </div>

        {logs.map((log, index) => {
          const badgeStyle = tagColors[log.tag] || "text-textDim bg-surface";
          return (
            <div key={index} className="flex items-start gap-2 group hover:bg-surfaceHighlight/30 px-1 py-0.5 rounded transition-colors">
              <span className="text-textDim text-[10px] select-none shrink-0">{log.timestamp}</span>
              <span className={`px-1 rounded text-[10px] font-semibold uppercase border shrink-0 ${badgeStyle}`}>
                {log.tag}
              </span>
              <div className="flex-1 text-textMain min-w-0">
                <span>{log.message}</span>
                {log.detail && (
                  <span className="block text-[10px] text-textDim font-sans truncate">{log.detail}</span>
                )}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center gap-2 text-emerald animate-pulse text-[11px]">
            <span>&gt;&gt;</span>
            <span>streaming response chunks from Gemini API...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Footer */}
      <div className="bg-[#121722] px-3 py-1.5 border-t border-hairline flex items-center justify-between text-[10px] text-textDim">
        <span>Target: {activeContext}</span>
        <span>Local-First Evidence Engine</span>
      </div>
    </div>
  );
};
