"use client";

import React, { useState, useEffect, useRef } from "react";
import { useConsole } from "@/store/consoleStore";
import { getTypeIcon, IconSearch, IconGraph, IconAsk, IconShield, IconConsole, IconRefresh } from "./icons";
import { Kbd, TypeBadge } from "./ui";

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, closeCommandPalette, knowledgeList, openDetail, setView, refreshData } = useConsole();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Quick Action Items
  const quickActions = [
    { id: "action-ask", title: "Ask zdWiki (AI Assistant)", icon: <IconAsk size={16} className="text-cyan" />, action: () => setView("ask") },
    { id: "action-usage", title: "LLM Usage, Tokens & Costs", icon: <IconConsole size={16} className="text-emerald" />, action: () => setView("usage") },
    { id: "action-graph", title: "Context Graph Explorer", icon: <IconGraph size={16} className="text-brass" />, action: () => setView("graph") },
    { id: "action-loops", title: "Engineering Loops", icon: <IconShield size={16} className="text-purple" />, action: () => setView("loops") },
    { id: "action-maintain", title: "Knowledge Maintenance", icon: <IconRefresh size={16} className="text-rose" />, action: () => setView("maintenance") },
  ];

  // Filtered Knowledge Matches
  const filteredKnowledge = query.trim()
    ? knowledgeList.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : [];

  const totalItems = query.trim() ? filteredKnowledge.length : quickActions.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(totalItems, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(totalItems, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim() && filteredKnowledge[selectedIndex]) {
        openDetail(filteredKnowledge[selectedIndex].id);
        closeCommandPalette();
      } else if (!query.trim() && quickActions[selectedIndex]) {
        quickActions[selectedIndex].action();
        closeCommandPalette();
      }
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-canvas/80 backdrop-blur-md" onClick={closeCommandPalette} />
      <div className="relative w-full max-w-2xl bg-surfaceElevated border border-hairline shadow-2xl rounded-xl overflow-hidden z-10 animate-in zoom-in-95 duration-100">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-hairline bg-surface/50">
          <IconSearch size={18} className="text-brass" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search knowledge..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none text-textMain placeholder-textDim text-sm outline-none font-sans"
          />
          <div className="flex items-center gap-1.5">
            <Kbd>ESC</Kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-hairline/40">
          {query.trim() ? (
            filteredKnowledge.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-mono text-textDim uppercase tracking-wider">
                  Knowledge Matches ({filteredKnowledge.length})
                </div>
                {filteredKnowledge.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      openDetail(item.id);
                      closeCommandPalette();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedIndex === idx
                        ? "bg-brass/15 text-textMain border border-brass/30"
                        : "hover:bg-surfaceHighlight text-textMuted border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="text-brass shrink-0">{getTypeIcon(item.type, { size: 16 })}</span>
                      <span className="min-w-0">
                        <span className="block font-medium text-sm text-textMain truncate">{item.title}</span>
                        <span className="block text-xs text-textDim font-mono truncate">{item.id}</span>
                      </span>
                    </span>
                    <TypeBadge type={item.type} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-textDim">No matching knowledge objects found.</div>
            )
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-mono text-textDim uppercase tracking-wider">
                Quick Navigation & Actions
              </div>
              {quickActions.map((action, idx) => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.action();
                    closeCommandPalette();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedIndex === idx
                      ? "bg-surfaceHighlight text-textMain border border-hairline"
                      : "text-textMuted hover:bg-surfaceHighlight border border-transparent"
                  }`}
                >
                  <span className="shrink-0">{action.icon}</span>
                  <span className="text-sm font-medium text-textMain flex-1">{action.title}</span>
                  <Kbd>↵</Kbd>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface/30 border-t border-hairline text-[11px] font-mono text-textDim">
          <div className="flex items-center gap-2">
            <span>Navigate</span>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </div>
          <div className="flex items-center gap-2">
            <span>Select</span>
            <Kbd>↵</Kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
