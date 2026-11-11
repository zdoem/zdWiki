"use client";

import React, { useState, useRef } from "react";
import { useConsole } from "@/store/consoleStore";
import { askZdWikiStream, ProjectContext } from "@/lib/api";
import { Panel, Button, Badge, Card, Kbd } from "@/components/ui";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TelemetryConsole, TelemetryLog } from "@/components/TelemetryConsole";
import { IconAsk, IconCheck, IconShield, IconSource, IconRefresh } from "@/components/icons";

export const AskView: React.FC = () => {
  const { openDetail } = useConsole();
  const [question, setQuestion] = useState("");
  const [targetContext, setTargetContext] = useState<"java21_spring6" | "java8_spring5" | "universal">("java21_spring6");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamAnswer, setStreamAnswer] = useState<string>("");
  const [citedObjects, setCitedObjects] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Telemetry logs & gauges
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([
    {
      timestamp: new Date().toLocaleTimeString(),
      tag: "SYS",
      message: "zdWiki real-time context streaming engine ready.",
      detail: "Indexed in SQLite FTS5 + SSE Token Streaming",
    },
  ]);

  const [contextTokens, setContextTokens] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [tokensPerSec, setTokensPerSec] = useState<number>(0);
  const [inTokens, setInTokens] = useState<number>(0);
  const [outTokens, setOutTokens] = useState<number>(0);

  const tokenCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const contextMap: Record<string, ProjectContext> = {
    java21_spring6: {
      language: { java: "21" },
      framework: { spring_boot: "3.x", spring_security: "6.x" },
    },
    java8_spring5: {
      language: { java: "8" },
      framework: { spring_boot: "2.x", spring_security: "5.x" },
    },
    universal: {},
  };

  const sampleQuestions = [
    "How should I configure Spring Security in our modern Spring Boot 3 project?",
    "Explain Java virtual threads and how they differ from platform threads.",
    "What are the four pillars of ACID transactions in relational databases?",
    "How does JWT token refresh race condition occur and how to fix it?",
  ];

  const pushLog = (tag: TelemetryLog["tag"], message: string, detail?: string) => {
    setTelemetryLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        tag,
        message,
        detail,
      },
    ]);
  };

  const handleClear = () => {
    setQuestion("");
    setStreamAnswer("");
    setCitedObjects([]);
    setError(null);
    setLatencyMs(0);
    setInTokens(0);
    setOutTokens(0);
    setTokensPerSec(0);
    pushLog("SYS", "Chat input and response cleared.");
  };

  const handleAsk = async (qText?: string) => {
    const q = qText || question;
    if (!q.trim() || isStreaming) return;

    setIsStreaming(true);
    setError(null);
    setStreamAnswer("");
    setCitedObjects([]);
    tokenCountRef.current = 0;
    startTimeRef.current = Date.now();

    pushLog("SYS", `User query submitted: "${q.slice(0, 45)}..."`);

    await askZdWikiStream(
      q,
      6000,
      contextMap[targetContext],
      {
        onChunk: (chunkText) => {
          setStreamAnswer((prev) => prev + chunkText);
          const chunkWordCount = chunkText.split(/\s+/).filter(Boolean).length;
          tokenCountRef.current += chunkWordCount;
          setOutTokens(tokenCountRef.current);
          
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed > 0.2) {
            setTokensPerSec(Math.round(tokenCountRef.current / elapsed));
          }
        },
        onTelemetry: (data) => {
          if (data.tag === "BUDGET") {
            setContextTokens(data.tokens || 0);
            setInTokens(data.tokens || 0);
          } else {
            pushLog(data.tag as any, data.message, data.detail);
          }
        },
        onDone: (data) => {
          setIsStreaming(false);
          setCitedObjects(data.used_objects || []);
          setLatencyMs(Math.round(data.latency_ms));
          setInTokens(data.in_tokens || contextTokens);
          setOutTokens(data.out_tokens || tokenCountRef.current);

          pushLog("LLM", `Stream completed (${(data.latency_ms / 1000).toFixed(2)}s, ${data.out_tokens} tokens)`);
          if (data.used_objects && data.used_objects.length > 0) {
            pushLog("DONE", `Evidence grounds: ${data.used_objects.join(", ")}`);
          }
        },
        onError: (err) => {
          setIsStreaming(false);
          setError(err.message || "Streaming failed");
          pushLog("ERR", `Stream error: ${err.message}`);
        },
      }
    );
  };

  const calculatedCost = ((inTokens * 0.075) / 1_000_000) + ((outTokens * 0.30) / 1_000_000);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brass/10 border border-brass/20 text-brass text-xs font-mono mb-1.5">
            <IconAsk size={12} />
            <span>Real-time SSE Token Streaming & Telemetry Terminal</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-textMain tracking-tight">
            Ask zdWiki Engineering Memory
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="cyan" size="sm">
            Model: Gemini 1.5 Flash (SSE Stream)
          </Badge>
        </div>
      </div>

      {/* Side-by-Side Split: Main Console (Left) + Live Telemetry Terminal (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Interaction Area */}
        <div className="lg:col-span-7 space-y-5">
          {/* Input Box Panel */}
          <Panel className="!p-4 space-y-3">
            {/* Context Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-hairline/60">
              <span className="text-xs font-mono text-textDim">Project Context:</span>
              <div className="flex gap-1.5">
                {[
                  { id: "java21_spring6", label: "Java 21 / Spring 6" },
                  { id: "java8_spring5", label: "Java 8 / Spring 5" },
                  { id: "universal", label: "Universal" },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setTargetContext(c.id as any);
                      pushLog("SYS", `Switched active project context to: ${c.label}`);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      targetContext === c.id
                        ? "bg-brass text-canvas font-semibold"
                        : "bg-surface text-textDim hover:text-textMain border border-hairline"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area with Clear button */}
            <div className="space-y-2 relative">
              <textarea
                rows={3}
                placeholder="Ask a technical or architectural question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleAsk();
                  }
                }}
                className="w-full p-3 bg-surface border border-hairline rounded-lg text-sm text-textMain placeholder-textDim focus:border-brass/50 outline-none resize-none font-sans"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-textDim flex items-center gap-1">
                  <span>Press</span> <Kbd>⌘↵</Kbd> <span>to stream query</span>
                </span>

                <div className="flex items-center gap-2">
                  {/* Clear Button */}
                  {(question || streamAnswer) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      disabled={isStreaming}
                      className="text-xs text-textDim hover:text-rose hover:bg-rose/10 font-mono"
                      title="Clear chat and response"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Clear
                    </Button>
                  )}

                  <Button
                    variant="brass"
                    size="md"
                    icon={<IconAsk size={15} />}
                    onClick={() => handleAsk()}
                    disabled={isStreaming || !question.trim()}
                  >
                    {isStreaming ? "Streaming Tokens..." : "Ask Assistant"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Sample Questions */}
            <div className="pt-2 border-t border-hairline/40">
              <div className="text-[10px] font-mono text-textDim mb-1.5 uppercase tracking-wider">
                Verification Presets:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sampleQuestions.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuestion(sq);
                      handleAsk(sq);
                    }}
                    className="text-xs text-textMuted bg-surface hover:bg-surfaceHighlight px-2.5 py-1 rounded border border-hairline text-left transition-colors truncate max-w-full"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose/10 border border-rose/30 rounded-lg text-rose text-sm font-mono">
              Error: {error}
            </div>
          )}

          {/* Real-time Streaming Answer Output */}
          {(streamAnswer || isStreaming) && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Panel
                title="Verified Engineering Answer"
                actions={
                  <div className="flex items-center gap-2">
                    {isStreaming && (
                      <span className="flex items-center gap-1.5 text-xs font-mono text-emerald animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald" />
                        <span>Streaming...</span>
                      </span>
                    )}
                    {latencyMs > 0 && !isStreaming && (
                      <span className="text-xs font-mono text-brass font-bold">
                        {(latencyMs / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>
                }
              >
                {/* Sleek Metadata Telemetry Bar: Time, Tokens, Cost, Speed */}
                <div className="flex flex-wrap items-center gap-3 py-2 px-3 mb-4 rounded-lg bg-surfaceElevated border border-hairline text-xs font-mono">
                  {/* Latency */}
                  <div className="flex items-center gap-1 text-textDim">
                    <span>⏱️</span>
                    <span className="text-textMuted">Time:</span>
                    <span className="text-brass font-bold">
                      {latencyMs > 0 ? `${(latencyMs / 1000).toFixed(2)}s` : `${((Date.now() - (startTimeRef.current || Date.now())) / 1000).toFixed(1)}s`}
                    </span>
                  </div>

                  <span className="text-hairline hidden sm:inline">•</span>

                  {/* Tokens In / Out */}
                  <div className="flex items-center gap-1 text-textDim">
                    <span>🔠</span>
                    <span className="text-textMuted">Tokens:</span>
                    <span className="text-cyan font-semibold">{inTokens.toLocaleString()} in</span>
                    <span>•</span>
                    <span className="text-emerald font-semibold">{outTokens.toLocaleString()} out</span>
                  </div>

                  <span className="text-hairline hidden sm:inline">•</span>

                  {/* Estimated Cost */}
                  <div className="flex items-center gap-1 text-textDim">
                    <span>💰</span>
                    <span className="text-textMuted">Cost:</span>
                    <span className="text-emerald font-bold">
                      ${calculatedCost > 0 ? calculatedCost.toFixed(6) : "0.000000"}
                    </span>
                  </div>

                  {tokensPerSec > 0 && (
                    <>
                      <span className="text-hairline hidden sm:inline">•</span>
                      {/* Speed */}
                      <div className="flex items-center gap-1 text-textDim">
                        <span>⚡</span>
                        <span className="text-textMuted">Speed:</span>
                        <span className="text-purple font-semibold">{tokensPerSec} t/s</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <MarkdownRenderer content={streamAnswer} onNavigateObject={openDetail} />
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-brass animate-pulse ml-1 align-middle" />
                  )}
                </div>
              </Panel>

              {/* Cited Knowledge Objects */}
              {citedObjects.length > 0 && (
                <Panel title="Cited Canonical Knowledge Objects">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {citedObjects.map((id: string) => (
                      <button
                        key={id}
                        onClick={() => openDetail(id)}
                        className="flex items-center gap-2 p-2 bg-surface hover:bg-surfaceHighlight rounded-lg border border-hairline text-left transition-colors group"
                      >
                        <IconShield size={14} className="text-brass shrink-0" />
                        <span className="text-xs font-mono text-brass group-hover:underline truncate">{id}</span>
                      </button>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Live Telemetry Terminal Console */}
        <div className="lg:col-span-5 h-[560px] lg:sticky lg:top-20">
          <TelemetryConsole
            logs={telemetryLogs}
            isStreaming={isStreaming}
            contextTokens={contextTokens}
            maxTokens={6000}
            latencyMs={latencyMs}
            tokensPerSec={tokensPerSec}
            modelName="gemini-1.5-flash"
            activeContext={
              targetContext === "java21_spring6"
                ? "Java 21 / Spring 6"
                : targetContext === "java8_spring5"
                ? "Java 8 / Spring 5"
                : "Universal"
            }
          />
        </div>
      </div>
    </div>
  );
};
