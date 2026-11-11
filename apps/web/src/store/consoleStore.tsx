"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  KnowledgeItem,
  StatsData,
  MaintenanceReport,
  ProjectContext,
  fetchKnowledgeList,
  fetchStats,
  fetchMaintenanceReport,
} from "@/lib/api";

export type ConsoleView =
  | "dashboard"
  | "domains"
  | "knowledge"
  | "detail"
  | "graph"
  | "ask"
  | "loops"
  | "diagnostics"
  | "health"
  | "sources"
  | "usage"
  | "settings"
  | "maintenance"
  | "manual";

export type ConsoleTheme = "console" | "space-hud";

interface ConsoleState {
  view: ConsoleView;
  selectedId: string | null;
  searchQuery: string;
  typeFilter: string | null;
  domainFilter: string | null;
  tagFilter: string | null;
  statusFilter: string | null;
  projectContext: ProjectContext;
  isCommandPaletteOpen: boolean;
  theme: ConsoleTheme;
  knowledgeCollapsed: boolean;
  domainsCollapsed: boolean;
  expandedDomainCategories: Record<string, boolean>;
  
  // Data
  knowledgeList: KnowledgeItem[];
  stats: StatsData | null;
  maintenanceReport: MaintenanceReport | null;
  isLoading: boolean;
  
  // Actions
  setView: (view: ConsoleView, selectedId?: string | null, typeFilter?: string | null, domainFilter?: string | null) => void;
  openDetail: (id: string) => void;
  goBack: () => void;
  setSearchQuery: (q: string) => void;
  setTypeFilter: (type: string | null) => void;
  setDomainFilter: (dom: string | null) => void;
  setTagFilter: (tag: string | null) => void;
  setStatusFilter: (status: string | null) => void;
  setProjectContext: (ctx: ProjectContext) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setTheme: (t: ConsoleTheme) => void;
  toggleTheme: () => void;
  setKnowledgeCollapsed: (collapsed: boolean) => void;
  toggleKnowledgeCollapsed: () => void;
  setDomainsCollapsed: (collapsed: boolean) => void;
  toggleDomainsCollapsed: () => void;
  toggleDomainCategory: (categoryId: string) => void;
  refreshData: () => Promise<void>;
}

const ConsoleContext = createContext<ConsoleState | null>(null);

export const ConsoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setViewState] = useState<ConsoleView>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ view: ConsoleView; selectedId: string | null }[]>([]);
  
  const [theme, setThemeState] = useState<ConsoleTheme>("space-hud");
  const [knowledgeCollapsed, setKnowledgeCollapsedState] = useState<boolean>(false);
  const [domainsCollapsed, setDomainsCollapsedState] = useState<boolean>(false);
  const [expandedDomainCategories, setExpandedDomainCategories] = useState<Record<string, boolean>>({
    software_engineering: true, // Default first domain expanded
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const [projectContext, setProjectContext] = useState<ProjectContext>({
    language: { java: "21", python: "3.11" },
    framework: { spring_boot: "3.x", fastapi: "0.110" }
  });
  
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [maintenanceReport, setMaintenanceReport] = useState<MaintenanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme & collapse state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("zdwiki_theme") as ConsoleTheme;
      if (savedTheme === "console" || savedTheme === "space-hud") {
        setThemeState(savedTheme);
      }
      const savedCollapse = localStorage.getItem("zdwiki_knowledge_collapsed");
      if (savedCollapse !== null) {
        setKnowledgeCollapsedState(savedCollapse === "true");
      }
      const savedDomainsCollapse = localStorage.getItem("zdwiki_domains_collapsed");
      if (savedDomainsCollapse !== null) {
        setDomainsCollapsedState(savedDomainsCollapse === "true");
      }
    }
  }, []);

  const setTheme = (newTheme: ConsoleTheme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("zdwiki_theme", newTheme);
    }
  };

  const toggleTheme = () => {
    const next = theme === "console" ? "space-hud" : "console";
    setTheme(next);
  };

  const setKnowledgeCollapsed = (collapsed: boolean) => {
    setKnowledgeCollapsedState(collapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem("zdwiki_knowledge_collapsed", String(collapsed));
    }
  };

  const toggleKnowledgeCollapsed = () => {
    setKnowledgeCollapsed(!knowledgeCollapsed);
  };

  const setDomainsCollapsed = (collapsed: boolean) => {
    setDomainsCollapsedState(collapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem("zdwiki_domains_collapsed", String(collapsed));
    }
  };

  const toggleDomainsCollapsed = () => {
    setDomainsCollapsed(!domainsCollapsed);
  };

  const toggleDomainCategory = (categoryId: string) => {
    setExpandedDomainCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Load initial data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [items, st, mr] = await Promise.all([
        fetchKnowledgeList(),
        fetchStats().catch(() => null),
        fetchMaintenanceReport().catch(() => null),
      ]);
      setKnowledgeList(items);
      setStats(st);
      setMaintenanceReport(mr);
      if (typeof window !== "undefined") {
        localStorage.setItem("zdwiki_knowledge_cache", JSON.stringify(items));
      }
    } catch (e) {
      console.warn("Using offline fallback cache:", e);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("zdwiki_knowledge_cache");
        if (cached) setKnowledgeList(JSON.parse(cached));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      } else if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const setView = (
    newView: ConsoleView,
    newSelectedId: string | null = null,
    newTypeFilter?: string | null,
    newDomainFilter?: string | null
  ) => {
    setHistory((prev) => [...prev, { view, selectedId }]);
    setViewState(newView);
    if (newSelectedId !== undefined) setSelectedId(newSelectedId);
    if (newTypeFilter !== undefined) setTypeFilter(newTypeFilter);
    if (newDomainFilter !== undefined) setDomainFilter(newDomainFilter);
  };

  const openDetail = (id: string) => {
    setHistory((prev) => [...prev, { view, selectedId }]);
    setSelectedId(id);
    setViewState("detail");
  };

  const goBack = () => {
    if (history.length === 0) {
      setViewState("dashboard");
      setSelectedId(null);
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setViewState(prev.view);
    setSelectedId(prev.selectedId);
  };

  return (
    <ConsoleContext.Provider
      value={{
        view,
        selectedId,
        searchQuery,
        typeFilter,
        domainFilter,
        tagFilter,
        statusFilter,
        projectContext,
        isCommandPaletteOpen,
        theme,
        knowledgeCollapsed,
        domainsCollapsed,
        expandedDomainCategories,
        knowledgeList,
        stats,
        maintenanceReport,
        isLoading,
        setView,
        openDetail,
        goBack,
        setSearchQuery,
        setTypeFilter,
        setDomainFilter,
        setTagFilter,
        setStatusFilter,
        setProjectContext,
        openCommandPalette: () => setIsCommandPaletteOpen(true),
        closeCommandPalette: () => setIsCommandPaletteOpen(false),
        setTheme,
        toggleTheme,
        setKnowledgeCollapsed,
        toggleKnowledgeCollapsed,
        setDomainsCollapsed,
        toggleDomainsCollapsed,
        toggleDomainCategory,
        refreshData,
      }}
    >
      {children}
    </ConsoleContext.Provider>
  );
};

export const useConsole = (): ConsoleState => {
  const context = useContext(ConsoleContext);
  if (!context) {
    throw new Error("useConsole must be used within a ConsoleProvider");
  }
  return context;
};
