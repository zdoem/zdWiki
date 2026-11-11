"use client";

import React, { useState, useEffect } from "react";
import { useConsole } from "@/store/consoleStore";
import { fetchMaintenanceReport, MaintenanceReport } from "@/lib/api";
import { Panel, Card, Button, Badge } from "@/components/ui";
import { IconRefresh, IconCheck, IconShield } from "@/components/icons";

export const MaintenanceView: React.FC = () => {
  const { openDetail } = useConsole();
  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSev, setFilterSev] = useState<string>("ALL");

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMaintenanceReport();
      setReport(data);
    } catch (e) {
      console.error("Maintenance analysis failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const items = report?.items || [];
  const filtered = items.filter((it) => {
    if (filterSev === "ALL") return true;
    return it.severity.toLowerCase() === filterSev.toLowerCase();
  });

  const criticalCount = report?.by_severity?.critical || 0;
  const warningCount = report?.by_severity?.warning || 0;
  const infoCount = report?.by_severity?.info || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-textMain tracking-tight">
            Knowledge Maintenance Diagnostics
          </h1>
          <p className="text-xs text-textDim font-mono mt-0.5">
            Non-destructive health scans: orphans, broken relations, stale volatile pages, deprecations, and oversized objects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="brass" size="sm" icon={<IconRefresh size={14} />} onClick={runAnalysis} disabled={isLoading}>
            {isLoading ? "Scanning..." : "Run Health Scan"}
          </Button>
        </div>
      </div>

      {/* Severity Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="border-rose/30 bg-rose/5 cursor-pointer"
          onClick={() => setFilterSev(filterSev === "critical" ? "ALL" : "critical")}
        >
          <div className="flex justify-between items-center text-xs font-mono text-rose">
            <span>CRITICAL ERRORS</span>
            <span>{criticalCount}</span>
          </div>
          <div className="font-heading text-2xl font-bold text-rose mt-2">{criticalCount}</div>
          <div className="text-[11px] text-textDim mt-1">Schema errors & broken relations</div>
        </Card>

        <Card
          className="border-brass/30 bg-brass/5 cursor-pointer"
          onClick={() => setFilterSev(filterSev === "warning" ? "ALL" : "warning")}
        >
          <div className="flex justify-between items-center text-xs font-mono text-brass">
            <span>WARNINGS</span>
            <span>{warningCount}</span>
          </div>
          <div className="font-heading text-2xl font-bold text-brass mt-2">{warningCount}</div>
          <div className="text-[11px] text-textDim mt-1">Orphans, stale pages & unlinked deprecations</div>
        </Card>

        <Card
          className="border-cyan/30 bg-cyan/5 cursor-pointer"
          onClick={() => setFilterSev(filterSev === "info" ? "ALL" : "info")}
        >
          <div className="flex justify-between items-center text-xs font-mono text-cyan">
            <span>INFO / PROVENANCE</span>
            <span>{infoCount}</span>
          </div>
          <div className="font-heading text-2xl font-bold text-cyan mt-2">{infoCount}</div>
          <div className="text-[11px] text-textDim mt-1">Unlinked source provenance opportunities</div>
        </Card>
      </div>

      {/* Diagnostics Table */}
      <Panel
        title={`Diagnostic Issues (${filtered.length})`}
        actions={
          <div className="flex gap-1 text-xs font-mono">
            {["ALL", "CRITICAL", "WARNING", "INFO"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterSev(s)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterSev === s
                    ? "bg-brass text-canvas font-semibold"
                    : "text-textDim hover:text-textMain bg-surface border border-hairline"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-mono text-textDim border-b border-hairline bg-surface/30">
              <tr>
                <th className="px-4 py-2.5">Severity</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Object ID</th>
                <th className="px-4 py-2.5">Diagnostic Message</th>
                <th className="px-4 py-2.5">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.length > 0 ? (
                filtered.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => item.id !== "unknown" && openDetail(item.id)}
                    className="hover:bg-surfaceHighlight/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <Badge
                        variant={
                          item.severity === "critical"
                            ? "rose"
                            : item.severity === "warning"
                            ? "brass"
                            : "cyan"
                        }
                      >
                        {item.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap font-mono text-xs text-textMuted">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-brass font-medium whitespace-nowrap">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-textMain">{item.message}</td>
                    <td className="px-4 py-3 align-top text-xs text-textDim">{item.recommendation}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-emerald font-mono text-sm">
                    <IconCheck size={20} className="inline mr-2" />
                    All diagnostic checks passed! No issues detected in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};
