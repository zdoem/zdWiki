"use client";

import React from "react";
import { useConsole } from "@/store/consoleStore";
import { Panel, Card, Button, Badge, LifecycleBadge, TypeBadge, Kbd } from "@/components/ui";
import { getTypeIcon, IconAsk, IconGraph, IconShield, IconSearch, IconRefresh } from "@/components/icons";
import { DistributionChart, VerificationBreakdown } from "@/components/Charts";

export const DashboardView: React.FC = () => {
  const { stats, maintenanceReport, knowledgeList, openDetail, setView, openCommandPalette } = useConsole();

  const totalObjects = stats?.total_objects || knowledgeList.length;
  const totalSources = stats?.total_sources || knowledgeList.filter((k) => k.type === "source").length;
  const totalLoops = stats?.total_loops || knowledgeList.filter((k) => k.type === "engineering_loop").length;
  const issuesCount = maintenanceReport?.total_issues || 0;

  // Verification counts
  const verificationCounts = [
    { status: "verified", count: knowledgeList.filter((k) => (k.verification_status || "").toLowerCase() === "verified").length },
    { status: "tested", count: knowledgeList.filter((k) => (k.verification_status || "").toLowerCase() === "tested").length },
    { status: "source_backed", count: knowledgeList.filter((k) => (k.verification_status || "").toLowerCase() === "source_backed").length },
    { status: "disputed", count: knowledgeList.filter((k) => (k.verification_status || "").toLowerCase() === "disputed").length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative p-6 rounded-xl bg-gradient-to-r from-surfaceElevated via-surface to-surfaceCard border border-hairline overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brass/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              <span className="text-xs font-mono text-emerald tracking-wide uppercase font-semibold">
                zdWiki v1.0 • Core Active
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-textMain tracking-tight">
              Engineering Knowledge Console
            </h1>
            <p className="text-sm text-textMuted mt-1 max-w-xl">
              Local-first evidence memory system. Canonical Markdown SoT, Disposable SQLite index, and Verified Loops.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={<IconSearch size={14} />}
              onClick={openCommandPalette}
            >
              <span>Command Palette</span>
              <Kbd>⌘K</Kbd>
            </Button>
            <Button
              variant="brass"
              size="sm"
              icon={<IconAsk size={14} />}
              onClick={() => setView("ask")}
            >
              Ask zdWiki
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-textDim">
            <span className="text-xs font-mono uppercase tracking-wider">Total Objects</span>
            <span className="text-brass">{getTypeIcon("concept", { size: 16 })}</span>
          </div>
          <div className="mt-3">
            <div className="font-heading text-3xl font-bold text-textMain">{totalObjects}</div>
            <div className="text-xs text-textDim font-mono mt-0.5">100% Validated Markdown</div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-textDim">
            <span className="text-xs font-mono uppercase tracking-wider">Authoritative Sources</span>
            <span className="text-cyan">{getTypeIcon("source", { size: 16 })}</span>
          </div>
          <div className="mt-3">
            <div className="font-heading text-3xl font-bold text-cyan">{totalSources}</div>
            <div className="text-xs text-textDim font-mono mt-0.5">Immutable Ingested Data</div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-textDim">
            <span className="text-xs font-mono uppercase tracking-wider">Engineering Loops</span>
            <span className="text-emerald">{getTypeIcon("engineering_loop", { size: 16 })}</span>
          </div>
          <div className="mt-3">
            <div className="font-heading text-3xl font-bold text-emerald">{totalLoops}</div>
            <div className="text-xs text-textDim font-mono mt-0.5">Evidence Gates Verified</div>
          </div>
        </Card>

        <Card
          className="flex flex-col justify-between"
          hoverable
          onClick={() => setView("maintenance")}
        >
          <div className="flex items-center justify-between text-textDim">
            <span className="text-xs font-mono uppercase tracking-wider">Maintenance Health</span>
            <span className={issuesCount === 0 ? "text-emerald" : "text-brass"}>
              <IconRefresh size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className={`font-heading text-3xl font-bold ${issuesCount === 0 ? "text-emerald" : "text-brass"}`}>
                {issuesCount === 0 ? "100%" : `${issuesCount} Items`}
              </span>
            </div>
            <div className="text-xs text-textDim font-mono mt-0.5">
              {issuesCount === 0 ? "Pristine Knowledge Base" : "Diagnostics Pending"}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Charts & Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Type Distribution */}
        <Panel title="Knowledge Type Breakdown" className="lg:col-span-1">
          {stats?.by_type ? (
            <DistributionChart
              data={stats.by_type}
              onSelectType={(t) => {
                setView("knowledge");
              }}
            />
          ) : (
            <div className="text-xs text-textDim font-mono">Loading distribution metrics...</div>
          )}
        </Panel>

        {/* Verification Status Breakdown */}
        <Panel title="Verification & Evidence Status" className="lg:col-span-2">
          <div className="space-y-4">
            <p className="text-xs text-textMuted leading-relaxed">
              zdWiki verifies claims via authoritative tier sources, automated tests, and reproducible loop evidence.
            </p>
            <VerificationBreakdown items={verificationCounts} />

            {/* Quick Link Highlights */}
            <div className="mt-6 pt-4 border-t border-hairline grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setView("graph")}
                className="p-3 bg-surface/50 rounded-lg border border-hairline hover:border-brass/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-textMain">
                  <IconGraph size={16} className="text-brass" />
                  <span>Context Graph Explorer</span>
                </div>
                <div className="text-xs text-textDim mt-1">Explore relations, dependencies & backlinks</div>
              </div>

              <div
                onClick={() => setView("loops")}
                className="p-3 bg-surface/50 rounded-lg border border-hairline hover:border-emerald/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-textMain">
                  <IconShield size={16} className="text-emerald" />
                  <span>Verified Loops Ledger</span>
                </div>
                <div className="text-xs text-textDim mt-1">Inspect disciplined engineering loop logs</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Recent Knowledge Objects Table */}
      <Panel
        title="Recent Canonical Knowledge Records"
        actions={
          <Button variant="ghost" size="sm" onClick={() => setView("knowledge")}>
            View All ({knowledgeList.length}) →
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-mono text-textDim border-b border-hairline bg-surface/30">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Domains</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {knowledgeList.slice(0, 7).map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item.id)}
                  className="hover:bg-surfaceHighlight/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-brass">{item.id}</td>
                  <td className="px-4 py-3">
                    <TypeBadge type={item.type} />
                  </td>
                  <td className="px-4 py-3 font-medium text-textMain">{item.title}</td>
                  <td className="px-4 py-3">
                    <LifecycleBadge status={item.lifecycle_status || item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {item.domains.slice(0, 2).map((d) => (
                        <span key={d} className="text-[11px] font-mono text-textDim bg-surface px-1.5 py-0.5 rounded border border-hairline">
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};
