"use client";

import React, { useState } from "react";
import { useConsole } from "@/store/consoleStore";
import { Panel, Button } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconCheck } from "@/components/icons";
import { getApiBase } from "@/lib/api";

export const SettingsView: React.FC = () => {
  const { projectContext, setProjectContext, theme } = useConsole();
  const [langJava, setLangJava] = useState(projectContext.language?.java || "21");
  const [langPython, setLangPython] = useState(projectContext.language?.python || "3.11");
  const [fwSpring, setFwSpring] = useState(projectContext.framework?.spring_boot || "3.x");
  const [fwFastApi, setFwFastApi] = useState(projectContext.framework?.fastapi || "0.110");
  const [saved, setSaved] = useState(false);

  const handleSaveContext = (e: React.FormEvent) => {
    e.preventDefault();
    setProjectContext({
      language: { java: langJava, python: langPython },
      framework: { spring_boot: fwSpring, fastapi: fwFastApi },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-textMain tracking-tight">
            System &amp; Workspace Settings
          </h1>
          <p className="text-xs text-textDim font-mono mt-0.5">
            Configure project stack context for version-aware retrieval, UI theme preferences, and endpoint configs.
          </p>
        </div>
      </div>

      <Panel title="UI Appearance &amp; Dual Theme Support">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
          <div>
            <div className="text-sm font-semibold text-textMain">Active Interface Theme</div>
            <div className="text-xs text-textDim font-mono mt-0.5">
              Current: <span className="text-brass uppercase font-bold">{theme}</span> (Switchable anytime without reload)
            </div>
          </div>
          <ThemeToggle />
        </div>
      </Panel>

      <Panel
        title="Project Stack Context (Version-Aware Retrieval)"
        subtitle="zdWiki uses version awareness in BM25 &amp; Ask Assistant to prioritize knowledge objects matching your tech stack versions."
      >
        <form onSubmit={handleSaveContext} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-textDim mb-1.5 uppercase">Java Version</label>
              <input
                type="text"
                value={langJava}
                onChange={(e) => setLangJava(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-lg text-sm text-textMain font-mono focus:border-brass/50 outline-none"
                placeholder="e.g. 21"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-textDim mb-1.5 uppercase">Python Version</label>
              <input
                type="text"
                value={langPython}
                onChange={(e) => setLangPython(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-lg text-sm text-textMain font-mono focus:border-brass/50 outline-none"
                placeholder="e.g. 3.11"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-textDim mb-1.5 uppercase">Spring Boot Version</label>
              <input
                type="text"
                value={fwSpring}
                onChange={(e) => setFwSpring(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-lg text-sm text-textMain font-mono focus:border-brass/50 outline-none"
                placeholder="e.g. 3.x"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-textDim mb-1.5 uppercase">FastAPI Version</label>
              <input
                type="text"
                value={fwFastApi}
                onChange={(e) => setFwFastApi(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-hairline rounded-lg text-sm text-textMain font-mono focus:border-brass/50 outline-none"
                placeholder="e.g. 0.110"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-hairline">
            <div className="text-xs font-mono text-textDim">
              Context will be attached to BM25 search and streaming Ask queries.
            </div>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-xs font-mono text-emerald flex items-center gap-1">
                  <IconCheck size={14} /> Saved!
                </span>
              )}
              <Button type="submit" variant="brass" size="sm">
                Save Project Context
              </Button>
            </div>
          </div>
        </form>
      </Panel>

      <Panel title="Backend Gateway Configuration">
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-hairline/50">
            <span className="text-textDim">API Base URL</span>
            <span className="text-brass">{getApiBase()}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-hairline/50">
            <span className="text-textDim">Canonical Store</span>
            <span className="text-textMain">knowledge/wiki/ (Markdown + YAML Frontmatter)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-textDim">Derived Database</span>
            <span className="text-textMain">var/zdwiki.db (SQLite FTS5 Disposable Index)</span>
          </div>
        </div>
      </Panel>
    </div>
  );
};
