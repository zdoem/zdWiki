"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchUsageMetrics, UsageMetrics, UsageHistoryItem } from "@/lib/api";
import { Panel, Card, Button, Badge } from "@/components/ui";
import { IconRefresh, IconCheck, IconConsole, IconAsk, IconChevronRight } from "@/components/icons";

export const UsageView: React.FC = () => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const loadUsage = async (selectedPeriod: string = period) => {
    setIsLoading(true);
    try {
      const data = await fetchUsageMetrics(selectedPeriod);
      setMetrics(data);
      setCurrentPage(1); // Reset to page 1 on period change or refresh
    } catch (e) {
      console.error("Failed to load usage metrics:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsage(period);
  }, [period]);

  const totalReqs = metrics?.total_requests || 0;
  const totalIn = metrics?.total_input_tokens || 0;
  const totalOut = metrics?.total_output_tokens || 0;
  const totalTokens = metrics?.total_tokens || 0;
  const estCost = metrics?.estimated_cost_usd || 0.0;
  const avgLat = metrics?.avg_latency_ms || 0.0;

  // In vs Out ratio
  const inPct = totalTokens > 0 ? Math.round((totalIn / totalTokens) * 100) : 50;
  const outPct = 100 - inPct;

  const periods = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "This Month (30 Days)" },
  ];

  const allHistory = metrics?.history || [];
  const totalHistoryCount = allHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalHistoryCount / pageSize));

  // Compute current page items
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allHistory.slice(start, start + pageSize);
  }, [allHistory, currentPage, pageSize]);

  const startRecord = totalHistoryCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(currentPage * pageSize, totalHistoryCount);

  return (
    <div className="space-y-6">
      {/* Header with Date/Period Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-mono mb-1.5">
            <IconCheck size={12} />
            <span>Telemetry & Financial Ledger</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-textMain tracking-tight">
            LLM Usage, Tokens & Cost Tracking
          </h1>
          <p className="text-xs text-textDim font-mono mt-0.5">
            Real-time token consumption, latency audit, and Gemini API financial calculations.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-hairline text-xs font-mono">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 rounded transition-colors ${
                  period === p.id
                    ? "bg-brass text-canvas font-bold shadow-sm"
                    : "text-textMuted hover:text-textMain hover:bg-surfaceHighlight"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<IconRefresh size={14} className={isLoading ? "animate-spin" : ""} />}
            onClick={() => loadUsage(period)}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Top 4 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-textDim">
            <span className="text-xs font-mono uppercase tracking-wider">Total LLM Calls</span>
            <span className="text-brass"><IconAsk size={16} /></span>
          </div>
          <div className="mt-3">
            <div className="font-heading text-3xl font-bold text-textMain">{totalReqs.toLocaleString()}</div>
            <div className="text-xs text-textDim font-mono mt-0.5">Filter: {periods.find(p => p.id === period)?.label}</div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-textDim">
            <span className="text-xs font-mono uppercase tracking-wider">Total Tokens</span>
            <span className="text-cyan"><IconConsole size={16} /></span>
          </div>
          <div className="mt-3">
            <div className="font-heading text-3xl font-bold text-cyan">{totalTokens.toLocaleString()}</div>
            <div className="text-xs text-textDim font-mono mt-0.5">
              In: {totalIn.toLocaleString()} | Out: {totalOut.toLocaleString()}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-textDim">
            <span className="text-xs font-mono uppercase tracking-wider">Estimated Cost</span>
            <span className="text-emerald font-mono text-sm font-bold">$ USD</span>
          </div>
          <div className="mt-3">
            <div className="font-heading text-3xl font-bold text-emerald">${estCost.toFixed(5)}</div>
            <div className="text-xs text-textDim font-mono mt-0.5">
              Rates: $0.075 / 1M in • $0.30 / 1M out
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-textDim">
            <span className="text-xs font-mono uppercase tracking-wider">Average Latency</span>
            <span className="text-purple font-mono text-sm font-bold">MS</span>
          </div>
          <div className="mt-3">
            <div className="font-heading text-3xl font-bold text-purple">{avgLat} ms</div>
            <div className="text-xs text-textDim font-mono mt-0.5">
              {avgLat > 0 ? `${(avgLat / 1000).toFixed(2)}s per inference` : "Instant local cache"}
            </div>
          </div>
        </Card>
      </div>

      {/* Visual Graphs & Token Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token In vs Out Breakdown */}
        <Panel title="Token In / Out Ratio & Budget Allocation">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan font-semibold">Prompt Input ({inPct}%)</span>
                <span className="text-emerald font-semibold">Completion Output ({outPct}%)</span>
              </div>

              {/* Segmented Bar */}
              <div className="w-full h-4 bg-surface rounded-full overflow-hidden border border-hairline flex">
                <div
                  className="h-full bg-gradient-to-r from-cyan/80 to-cyan transition-all duration-500"
                  style={{ width: `${inPct}%` }}
                  title={`Input Tokens: ${totalIn}`}
                />
                <div
                  className="h-full bg-gradient-to-r from-emerald/80 to-emerald transition-all duration-500"
                  style={{ width: `${outPct}%` }}
                  title={`Output Tokens: ${totalOut}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 bg-surface/50 rounded-lg border border-hairline">
                <div className="text-textDim">INPUT (PROMPTS + CONTEXT)</div>
                <div className="text-lg font-bold text-cyan mt-1">{totalIn.toLocaleString()} tokens</div>
                <div className="text-[11px] text-textDim mt-0.5">
                  Cost: ${((totalIn * 0.075) / 1_000_000).toFixed(6)}
                </div>
              </div>

              <div className="p-3 bg-surface/50 rounded-lg border border-hairline">
                <div className="text-textDim">OUTPUT (GENERATED ANSWERS)</div>
                <div className="text-lg font-bold text-emerald mt-1">{totalOut.toLocaleString()} tokens</div>
                <div className="text-[11px] text-textDim mt-0.5">
                  Cost: ${((totalOut * 0.30) / 1_000_000).toFixed(6)}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Operation & Model Breakdown */}
        <Panel title="Operation & Provider Distribution">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-mono text-textDim mb-2">By Operation Type:</div>
              {metrics?.by_operation && Object.keys(metrics.by_operation).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(metrics.by_operation).map(([op, val]) => (
                    <div key={op} className="flex items-center justify-between text-xs font-mono p-2 bg-surface/40 rounded border border-hairline">
                      <span className="text-brass font-medium uppercase">{op}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-textDim">{val.count} calls</span>
                        <span className="text-textMain font-semibold">{val.tokens.toLocaleString()} tokens</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-mono text-textDim">No operations recorded for this period.</div>
              )}
            </div>

            <div className="pt-2 border-t border-hairline">
              <div className="text-xs font-mono text-textDim mb-2">Active Models:</div>
              {metrics?.by_model && Object.keys(metrics.by_model).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(metrics.by_model).map(([model, val]) => (
                    <div key={model} className="flex items-center justify-between text-xs font-mono p-2 bg-surface/40 rounded border border-hairline">
                      <span className="text-cyan font-medium">{model}</span>
                      <span className="text-textMain font-semibold">{val.tokens.toLocaleString()} tokens</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-mono text-textDim">Gemini 1.5 Flash (Default)</div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* History Ledger Table with Pagination & Expandable Prompt Previews */}
      <Panel
        title={`Recent LLM Request Audit Ledger (${totalHistoryCount} Entries)`}
        actions={
          <div className="flex items-center gap-3">
            {/* Per Page Selector */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-textDim">
              <span className="hidden sm:inline">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-surface border border-hairline rounded text-xs font-mono text-textMain focus:border-brass/50 outline-none"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-mono text-textDim border-b border-hairline bg-surface/30">
                <tr>
                  <th className="px-4 py-2.5">ID / Timestamp</th>
                  <th className="px-4 py-2.5">Model</th>
                  <th className="px-4 py-2.5">Operation</th>
                  <th className="px-4 py-2.5">In Tokens</th>
                  <th className="px-4 py-2.5">Out Tokens</th>
                  <th className="px-4 py-2.5">Latency</th>
                  <th className="px-4 py-2.5">Cost (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {paginatedHistory.length > 0 ? (
                  paginatedHistory.map((item) => {
                    const isExpanded = expandedId === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className={`hover:bg-surfaceHighlight cursor-pointer transition-colors font-mono text-xs ${
                            isExpanded ? "bg-surfaceHighlight/80" : ""
                          }`}
                        >
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <span className="text-brass font-bold">#{item.id}</span>
                            <div className="text-[10px] text-textDim mt-0.5">{item.timestamp}</div>
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <span className="text-textMain font-medium">{item.model}</span>
                            <div className="text-[10px] text-textDim">{item.provider}</div>
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <Badge variant="cyan" size="sm">
                              {item.operation_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-top text-cyan whitespace-nowrap">
                            {item.input_tokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 align-top text-emerald whitespace-nowrap">
                            {item.output_tokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 align-top text-textDim whitespace-nowrap">
                            {item.latency_ms} ms
                          </td>
                          <td className="px-4 py-3 align-top text-emerald font-semibold whitespace-nowrap">
                            ${item.cost_usd.toFixed(6)}
                          </td>
                        </tr>

                        {/* Expandable Preview Details Row */}
                        {isExpanded && (
                          <tr className="bg-[#0c1018] border-b border-hairline">
                            <td colSpan={7} className="p-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                                {/* Prompt Preview */}
                                <div className="p-3 bg-surface/60 rounded-lg border border-hairline space-y-1">
                                  <div className="text-brass font-semibold text-[11px] uppercase flex items-center gap-1.5">
                                    <span>Prompt Question / Context:</span>
                                  </div>
                                  <div className="text-textMain font-sans text-xs whitespace-pre-wrap leading-relaxed line-clamp-4">
                                    {item.prompt_preview || "No prompt preview available"}
                                  </div>
                                </div>

                                {/* Response Sample */}
                                <div className="p-3 bg-surface/60 rounded-lg border border-hairline space-y-1">
                                  <div className="text-emerald font-semibold text-[11px] uppercase flex items-center gap-1.5">
                                    <span>Generated Response Excerpt:</span>
                                  </div>
                                  <div className="text-textMuted font-sans text-xs whitespace-pre-wrap leading-relaxed line-clamp-4">
                                    {item.response_preview || "No response sample available"}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-textDim font-mono text-xs">
                      No LLM requests recorded for this period. Try asking questions in Ask Assistant!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          {totalHistoryCount > 0 && (
            <div className="pt-3 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-textDim">
              <div>
                Showing <span className="text-textMain font-semibold">{startRecord}</span>–<span className="text-textMain font-semibold">{endRecord}</span> of <span className="text-textMain font-semibold">{totalHistoryCount}</span> entries
              </div>

              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border border-hairline hover:bg-surfaceHighlight disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="First Page"
                >
                  «
                </button>

                {/* Prev Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border border-hairline hover:bg-surfaceHighlight disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  ‹ Prev
                </button>

                {/* Page Indicator */}
                <span className="px-3 py-1 rounded bg-surface border border-hairline text-textMain font-semibold">
                  {currentPage} / {totalPages}
                </span>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded border border-hairline hover:bg-surfaceHighlight disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next ›
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded border border-hairline hover:bg-surfaceHighlight disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="Last Page"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
