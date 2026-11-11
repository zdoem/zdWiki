"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ConsoleProvider, useConsole, ConsoleView } from "@/store/consoleStore";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DOMAIN_CATEGORIES } from "@/lib/domains";
import { DashboardView } from "@/views/DashboardView";
import { DomainsView } from "@/views/DomainsView";
import { KnowledgeView } from "@/views/KnowledgeView";
import { DetailView } from "@/views/DetailView";
import { GraphViewTab } from "@/views/GraphViewTab";
import { AskView } from "@/views/AskView";
import { UsageView } from "@/views/UsageView";
import { LoopsView } from "@/views/LoopsView";
import { MaintenanceView } from "@/views/MaintenanceView";
import { DiagnosticsView } from "@/views/DiagnosticsView";
import { SourcesView } from "@/views/SourcesView";
import { SettingsView } from "@/views/SettingsView";
import { ManualView } from "@/views/ManualView";
import {
  IconDashboard,
  IconSearch,
  IconAsk,
  IconGraph,
  IconGlobe,
  IconDomain,
  IconAllObjects,
  IconConcept,
  IconTechnology,
  IconPattern,
  IconArchitecture,
  IconTest,
  IconBug,
  IconDebugPlaybook,
  IconDecision,
  IconAnalysis,
  IconEngineeringLoop,
  IconDiagnostics,
  IconSource,
  IconHealth,
  IconConsole,
  IconSettings,
  IconManual,
  IconChevronDown,
  IconChevronRight,
  IconRefresh,
} from "@/components/icons";
import { Kbd, Button } from "@/components/ui";
import { rebuildIndex } from "@/lib/api";

const ConsoleMain: React.FC = () => {
  const {
    view,
    setView,
    typeFilter,
    setTypeFilter,
    domainFilter,
    setDomainFilter,
    openCommandPalette,
    refreshData,
    knowledgeList,
    stats,
    theme,
    knowledgeCollapsed,
    toggleKnowledgeCollapsed,
    domainsCollapsed,
    toggleDomainsCollapsed,
    expandedDomainCategories,
    toggleDomainCategory,
  } = useConsole();

  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSpace = theme === "space-hud";

  // Calculate live domain counts
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DOMAIN_CATEGORIES.forEach((cat) => {
      const catAreaIds = new Set(cat.areas.map((a) => a.id.toLowerCase()));
      const catAreaTags = new Set(cat.areas.flatMap((a) => a.tags.map((t) => t.toLowerCase())));

      const matching = knowledgeList.filter((k) => {
        const itemDomains = k.domains.map((d) => d.toLowerCase());
        const itemTags = k.tags.map((t) => t.toLowerCase());
        return (
          itemDomains.includes(cat.id.toLowerCase()) ||
          itemDomains.includes(cat.name.toLowerCase()) ||
          itemDomains.some((d) => catAreaIds.has(d)) ||
          itemTags.some((t) => catAreaTags.has(t))
        );
      });
      counts[cat.id] = matching.length;

      cat.areas.forEach((area) => {
        const areaTags = new Set(area.tags.map((t) => t.toLowerCase()));
        const areaMatching = knowledgeList.filter((k) => {
          const itemDomains = k.domains.map((d) => d.toLowerCase());
          const itemTags = k.tags.map((t) => t.toLowerCase());
          return (
            itemDomains.includes(area.id.toLowerCase()) ||
            itemDomains.includes(area.name.toLowerCase()) ||
            itemTags.some((t) => areaTags.has(t))
          );
        });
        counts[area.id] = areaMatching.length;
      });
    });
    return counts;
  }, [knowledgeList]);

  // Calculate real counts from stats or knowledgeList
  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    if (stats?.by_type) {
      Object.entries(stats.by_type).forEach(([k, v]) => {
        byType[k.toLowerCase()] = v;
      });
    } else {
      knowledgeList.forEach((item) => {
        const t = (item.type || "").toLowerCase();
        byType[t] = (byType[t] || 0) + 1;
      });
    }

    const concept = byType["concept"] ?? knowledgeList.filter((k) => k.type === "concept").length;
    const technology = byType["technology"] ?? knowledgeList.filter((k) => k.type === "technology").length;
    const pattern = byType["pattern"] ?? knowledgeList.filter((k) => k.type === "pattern").length;
    const architecture = byType["architecture"] ?? knowledgeList.filter((k) => k.type === "architecture").length;
    const test = byType["test"] ?? knowledgeList.filter((k) => k.type === "test").length;
    const bug = byType["bug"] ?? knowledgeList.filter((k) => k.type === "bug").length;
    const debug_playbook = byType["debug_playbook"] ?? knowledgeList.filter((k) => k.type === "debug_playbook").length;
    const decision = byType["decision"] ?? knowledgeList.filter((k) => k.type === "decision").length;
    const analysis = byType["analysis"] ?? knowledgeList.filter((k) => k.type === "analysis").length;
    const sources = stats?.total_sources || knowledgeList.filter((k) => k.type === "source").length;
    const loops = stats?.total_loops || knowledgeList.filter((k) => k.type === "engineering_loop").length;

    const totalWikiObjects = concept + technology + pattern + architecture + test + bug + debug_playbook + decision + analysis;

    return {
      totalObjects: stats?.total_objects || knowledgeList.length,
      totalWikiObjects,
      concept,
      technology,
      pattern,
      architecture,
      test,
      bug,
      debug_playbook,
      decision,
      analysis,
      sources,
      loops,
    };
  }, [stats, knowledgeList]);

  const handleRebuild = async () => {
    setIsRebuilding(true);
    try {
      const res = await rebuildIndex();
      setRebuildMsg(`Rebuilt: ${res.objects_indexed} objs`);
      await refreshData();
      setTimeout(() => setRebuildMsg(null), 3000);
    } catch {
      setRebuildMsg("Rebuild failed");
      setTimeout(() => setRebuildMsg(null), 3000);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleNavClick = (newView: ConsoleView, newTypeFilter?: string | null) => {
    setView(newView, null, newTypeFilter, null);
    setIsMobileMenuOpen(false);
  };

  const handleDomainClick = (targetDomain: string | null) => {
    setView("domains", null, null, targetDomain);
    setIsMobileMenuOpen(false);
  };

  const isNavActive = (viewName: ConsoleView, typeVal?: string | null) => {
    if (view !== viewName) return false;
    if (typeVal !== undefined) return typeFilter === typeVal;
    return true;
  };

  const isDomainActive = (domId: string | null) => {
    if (view !== "domains") return false;
    if (!domId && (!domainFilter || domainFilter === "ALL")) return true;
    return domainFilter?.toLowerCase() === domId?.toLowerCase();
  };

  return (
    <div
      data-theme={theme}
      className={`min-h-screen flex bg-canvas text-textMain antialiased selection:bg-brass/20 selection:text-brass-light ${
        isSpace ? "theme-space-hud" : "theme-console"
      }`}
    >
      <CommandPalette />

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* ─── SIDEBAR NAVIGATION ─── */}
      <aside
        className={`
          w-64 shrink-0 flex flex-col justify-between border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]
          fixed inset-y-0 left-0 z-50 md:static transition-transform duration-200 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Sidebar Header: Branding & Search */}
        <div className="p-4 pb-2 border-b border-[var(--sidebar-border)] shrink-0 space-y-3.5">
          {/* Logo & Branding */}
          <div
            onClick={() => handleNavClick("dashboard")}
            className="flex items-center justify-between px-1.5 py-1 cursor-pointer group rounded-lg hover:bg-[var(--sidebar-hover-bg)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform ${
                  isSpace
                    ? "bg-[#ffb24d]/15 border border-[#ffb24d]/40 text-[#ffb24d] font-hud"
                    : "bg-brass/15 border border-brass/30 text-brass font-mono"
                }`}
              >
                zd
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold text-base text-textMain tracking-tight ${isSpace ? "font-heading uppercase" : "font-heading"}`}>
                    zdWiki
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                      isSpace
                        ? "bg-[#7fd8e8]/15 text-[#7fd8e8] border-[#7fd8e8]/30"
                        : "bg-brass/10 text-brass border-brass/25"
                    }`}
                  >
                    {isSpace ? "HUD" : "v1.0"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[var(--sidebar-muted)] flex items-center gap-1">
                  {isSpace && <span className="w-1.5 h-1.5 rounded-full bg-[#ffb24d]" />}
                  <span>{isSpace ? "DARK SPACE HUD" : "KNOWLEDGE OS"}</span>
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(false);
              }}
              className="md:hidden text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] p-1"
              aria-label="Close mobile menu"
            >
              ✕
            </button>
          </div>

          {/* Quick Search Button */}
          <button
            onClick={() => {
              openCommandPalette();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surfaceElevated hover:bg-[var(--sidebar-hover-bg)] border border-[var(--sidebar-border)] text-[var(--sidebar-muted)] hover:text-textMain text-xs transition-colors"
          >
            <span className="flex items-center gap-2">
              <IconSearch size={14} className={isSpace ? "text-[#ffb24d]" : "text-brass"} />
              <span>Search...</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>⌘K</Kbd>
              <Kbd>/</Kbd>
            </span>
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs font-mono">
          {/* GROUP 1: OVERVIEW */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-section-label)] flex items-center justify-between">
              <span>OVERVIEW</span>
              {isSpace && <span className="text-[9px] text-[#7fd8e8] tracking-widest">[SYS]</span>}
            </div>
            <button
              onClick={() => handleNavClick("dashboard")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("dashboard")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconDashboard size={15} className={isNavActive("dashboard") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>Dashboard</span>
              </span>
            </button>
          </div>

          {/* GROUP 2: DISCOVER */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-section-label)]">
              <span>DISCOVER</span>
            </div>
            <button
              onClick={() => {
                openCommandPalette();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <IconSearch size={15} className="text-[var(--sidebar-dim)]" />
                <span>Search</span>
              </span>
              <Kbd>⌘K</Kbd>
            </button>
            <button
              onClick={() => handleNavClick("ask")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("ask")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconAsk size={15} className={isNavActive("ask") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>Ask zdWiki</span>
              </span>
            </button>
            <button
              onClick={() => handleNavClick("graph")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("graph")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconGraph size={15} className={isNavActive("graph") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>Context Graph</span>
              </span>
            </button>
          </div>

          {/* GROUP 3: DOMAINS (Collapsible & Expandable Sub-areas) */}
          <div className="space-y-1">
            <div
              onClick={toggleDomainsCollapsed}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-section-label)] flex items-center justify-between cursor-pointer hover:text-textMain transition-colors"
              title="Click to collapse/expand Domains"
            >
              <span className="flex items-center gap-1.5">
                <span>DOMAINS</span>
                {domainsCollapsed ? <IconChevronRight size={11} /> : <IconChevronDown size={11} />}
              </span>
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-[var(--sidebar-count-bg)] text-[var(--sidebar-count-text)]">
                {DOMAIN_CATEGORIES.length}
              </span>
            </div>

            {!domainsCollapsed && (
              <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
                {/* All Domains */}
                <button
                  onClick={() => handleDomainClick(null)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isDomainActive(null)
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconGlobe size={14} className={isDomainActive(null) ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>All Domains</span>
                  </span>
                </button>

                {/* 5 Top Categories with expandable sub-areas */}
                {DOMAIN_CATEGORIES.map((cat) => {
                  const isExpanded = !!expandedDomainCategories[cat.id];
                  const catCount = domainCounts[cat.id] || 0;
                  return (
                    <div key={cat.id} className="space-y-0.5">
                      <div
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors group cursor-pointer ${
                          isDomainActive(cat.id)
                            ? isSpace
                              ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                              : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                            : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                        }`}
                        onClick={() => handleDomainClick(cat.id)}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDomainCategory(cat.id);
                            }}
                            className="p-0.5 text-[var(--sidebar-dim)] hover:text-textMain rounded transition-colors"
                            title="Toggle sub-areas"
                          >
                            {isExpanded ? <IconChevronDown size={11} /> : <IconChevronRight size={11} />}
                          </button>
                          <span className="truncate">{cat.name}</span>
                        </span>
                        {catCount > 0 && <span className="text-[10px] text-[var(--sidebar-dim)] shrink-0">{catCount}</span>}
                      </div>

                      {/* Sub-areas */}
                      {isExpanded && (
                        <div className="pl-5 space-y-0.5 border-l border-[var(--sidebar-border)] ml-3.5 my-0.5">
                          {cat.areas.map((area) => {
                            const areaCount = domainCounts[area.id] || 0;
                            return (
                              <button
                                key={area.id}
                                onClick={() => handleDomainClick(area.id)}
                                className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition-colors truncate ${
                                  isDomainActive(area.id)
                                    ? isSpace
                                      ? "text-[#ffb24d] font-bold bg-[var(--sidebar-active-bg)]"
                                      : "text-brass font-bold bg-[var(--sidebar-active-bg)]"
                                    : "text-[var(--sidebar-dim)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                                }`}
                              >
                                <span className="truncate">{area.name}</span>
                                {areaCount > 0 && <span className="text-[9px] opacity-70 ml-1 shrink-0">{areaCount}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GROUP 4: KNOWLEDGE (Collapsible) */}
          <div className="space-y-1">
            <div
              onClick={toggleKnowledgeCollapsed}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-section-label)] flex items-center justify-between cursor-pointer hover:text-textMain transition-colors"
              title="Click to collapse/expand Knowledge taxonomy"
            >
              <span className="flex items-center gap-1.5">
                <span>KNOWLEDGE</span>
                {knowledgeCollapsed ? <IconChevronRight size={11} /> : <IconChevronDown size={11} />}
              </span>
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-[var(--sidebar-count-bg)] text-[var(--sidebar-count-text)]">
                {counts.totalWikiObjects}
              </span>
            </div>

            {!knowledgeCollapsed && (
              <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
                {/* All Objects */}
                <button
                  onClick={() => handleNavClick("knowledge", null)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", null)
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconAllObjects size={14} className={isNavActive("knowledge", null) ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>All Objects</span>
                  </span>
                  <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.totalWikiObjects}</span>
                </button>

                {/* Concepts */}
                <button
                  onClick={() => handleNavClick("knowledge", "concept")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "concept")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconConcept size={14} className={isNavActive("knowledge", "concept") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Concepts</span>
                  </span>
                  {counts.concept > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.concept}</span>}
                </button>

                {/* Technologies */}
                <button
                  onClick={() => handleNavClick("knowledge", "technology")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "technology")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconTechnology size={14} className={isNavActive("knowledge", "technology") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Technologies</span>
                  </span>
                  {counts.technology > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.technology}</span>}
                </button>

                {/* Patterns */}
                <button
                  onClick={() => handleNavClick("knowledge", "pattern")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "pattern")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconPattern size={14} className={isNavActive("knowledge", "pattern") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Patterns</span>
                  </span>
                  {counts.pattern > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.pattern}</span>}
                </button>

                {/* Architectures */}
                <button
                  onClick={() => handleNavClick("knowledge", "architecture")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "architecture")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconArchitecture size={14} className={isNavActive("knowledge", "architecture") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Architectures</span>
                  </span>
                  {counts.architecture > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.architecture}</span>}
                </button>

                {/* Tests */}
                <button
                  onClick={() => handleNavClick("knowledge", "test")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "test")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconTest size={14} className={isNavActive("knowledge", "test") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Tests</span>
                  </span>
                  {counts.test > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.test}</span>}
                </button>

                {/* Bugs */}
                <button
                  onClick={() => handleNavClick("knowledge", "bug")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "bug")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconBug size={14} className={isNavActive("knowledge", "bug") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Bugs</span>
                  </span>
                  {counts.bug > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.bug}</span>}
                </button>

                {/* Debug Playbooks */}
                <button
                  onClick={() => handleNavClick("knowledge", "debug_playbook")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "debug_playbook")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconDebugPlaybook size={14} className={isNavActive("knowledge", "debug_playbook") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Debug Playbooks</span>
                  </span>
                  {counts.debug_playbook > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.debug_playbook}</span>}
                </button>

                {/* Decisions */}
                <button
                  onClick={() => handleNavClick("knowledge", "decision")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "decision")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconDecision size={14} className={isNavActive("knowledge", "decision") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Decisions</span>
                  </span>
                  {counts.decision > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.decision}</span>}
                </button>

                {/* Analyses */}
                <button
                  onClick={() => handleNavClick("knowledge", "analysis")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isNavActive("knowledge", "analysis")
                      ? isSpace
                        ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)]"
                        : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                      : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconAnalysis size={14} className={isNavActive("knowledge", "analysis") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                    <span>Analyses</span>
                  </span>
                  {counts.analysis > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.analysis}</span>}
                </button>
              </div>
            )}
          </div>

          {/* GROUP 5: ENGINEERING */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-section-label)]">
              <span>ENGINEERING</span>
            </div>
            <button
              onClick={() => handleNavClick("loops")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("loops")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconEngineeringLoop size={15} className={isNavActive("loops") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>Loops</span>
              </span>
              {counts.loops > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.loops}</span>}
            </button>
            <button
              onClick={() => handleNavClick("diagnostics")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("diagnostics")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconDiagnostics size={15} className={isNavActive("diagnostics") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>Diagnostics</span>
              </span>
            </button>
          </div>

          {/* GROUP 6: EVIDENCE */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-section-label)]">
              <span>EVIDENCE</span>
            </div>
            <button
              onClick={() => handleNavClick("sources")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("sources")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconSource size={15} className={isNavActive("sources") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>Sources</span>
              </span>
              {counts.sources > 0 && <span className="text-[10px] text-[var(--sidebar-dim)]">{counts.sources}</span>}
            </button>
          </div>

          {/* GROUP 7: SYSTEM */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-section-label)]">
              <span>SYSTEM</span>
            </div>
            <button
              onClick={() => handleNavClick("health")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("health") || isNavActive("maintenance")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconHealth size={15} className={isNavActive("health") || isNavActive("maintenance") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>Knowledge Health</span>
              </span>
            </button>
            <button
              onClick={() => handleNavClick("usage")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("usage")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconConsole size={15} className={isNavActive("usage") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>LLM Telemetry & Cost</span>
              </span>
            </button>
            <button
              onClick={() => handleNavClick("settings")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("settings")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconSettings size={15} className={isNavActive("settings") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>Settings</span>
              </span>
            </button>

            {/* README-Manual Menu Item */}
            <button
              onClick={() => handleNavClick("manual")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-150 ${
                isNavActive("manual")
                  ? isSpace
                    ? "bg-[var(--sidebar-active-bg)] text-[#ffb24d] font-bold border border-[var(--sidebar-active-border)] shadow-sm"
                    : "bg-[var(--sidebar-active-bg)] text-brass font-bold border border-[var(--sidebar-active-border)]"
                  : "text-[var(--sidebar-muted)] hover:text-textMain hover:bg-[var(--sidebar-hover-bg)]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <IconManual size={15} className={isNavActive("manual") ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-[var(--sidebar-dim)]"} />
                <span>README-Manual</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-hairline text-textDim font-mono font-semibold">
                DOCS
              </span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer: System Status & Theme Toggle */}
        <div className="p-3 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shrink-0 space-y-2.5">
          {/* Theme Switcher */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono text-[var(--sidebar-dim)] uppercase tracking-wider">UI Theme</span>
            <ThemeToggle />
          </div>

          {/* SQLite Status Card with Storage Size */}
          <div className="p-2.5 rounded-lg bg-surfaceElevated border border-[var(--sidebar-border)] text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-[var(--sidebar-muted)] text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
                <span>SQLite FTS5</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className={isSpace ? "text-[#ffb24d] font-bold" : "text-brass font-bold"}>
                  {knowledgeList.length} Objs
                </span>
                {stats?.db_size_formatted && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface border border-hairline text-textMuted font-semibold">
                    {stats.db_size_formatted}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--sidebar-dim)]">
              <span>Derived Index</span>
              <span>Rebuildable</span>
            </div>
            {rebuildMsg ? (
              <div className="text-[11px] text-emerald font-semibold text-center py-0.5">{rebuildMsg}</div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full !py-1 text-[11px]"
                icon={<IconRefresh size={12} className={isRebuilding ? "animate-spin" : ""} />}
                onClick={handleRebuild}
                disabled={isRebuilding}
              >
                Rebuild Index
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 border-b border-hairline bg-surface/40 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-surface hover:bg-surfaceHighlight border border-hairline text-textMain"
              aria-label="Toggle Mobile Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-textDim">
              <span className="hidden sm:inline">Console</span>
              <span className="hidden sm:inline">/</span>
              <span className={`text-textMain capitalize font-semibold ${isSpace ? "font-heading tracking-wide" : ""}`}>
                {view === "domains" && domainFilter
                  ? `Domain: ${domainFilter.replace(/_/g, " ")}`
                  : view === "knowledge" && typeFilter
                  ? `Type: ${typeFilter.replace(/_/g, " ")}`
                  : view === "manual"
                  ? "README & Engineering Manual"
                  : view.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Top Theme Toggle Switch */}
            <ThemeToggle className="hidden sm:inline-flex" />

            <Button
              variant="brass"
              size="sm"
              icon={<IconAsk size={14} />}
              onClick={() => setView("ask")}
            >
              Ask Assistant
            </Button>
          </div>
        </header>

        {/* Viewport Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto overflow-y-auto">
          {view === "dashboard" && <DashboardView />}
          {view === "domains" && <DomainsView />}
          {view === "knowledge" && <KnowledgeView />}
          {view === "detail" && <DetailView />}
          {view === "graph" && <GraphViewTab />}
          {view === "ask" && <AskView />}
          {view === "usage" && <UsageView />}
          {view === "loops" && <LoopsView />}
          {view === "diagnostics" && <DiagnosticsView />}
          {(view === "health" || view === "maintenance") && <MaintenanceView />}
          {view === "sources" && <SourcesView />}
          {view === "settings" && <SettingsView />}
          {view === "manual" && <ManualView />}
        </main>
      </div>
    </div>
  );
};

function AppContent() {
  return (
    <ConsoleProvider>
      <ConsoleMain />
    </ConsoleProvider>
  );
}

const App = dynamic(() => Promise.resolve(AppContent), {
  ssr: false,
});

export default App;
