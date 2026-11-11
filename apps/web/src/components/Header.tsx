"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, CheckCircle2, Moon, Sun } from "lucide-react";
import { rebuildIndex } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";

export default function Header() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleRebuild = async () => {
    try {
      setIsRebuilding(true);
      setRebuildStatus(null);
      const res = await rebuildIndex();
      setRebuildStatus(`Indexed ${res.indexed_count} objects`);
      setTimeout(() => setRebuildStatus(null), 4000);
    } catch (err) {
      setRebuildStatus("Rebuild error");
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <header className="h-14 border-b border-surfaceBorder bg-surface/80 backdrop-blur sticky top-0 z-30 px-6 flex items-center justify-between transition-colors duration-200">
      {/* Quick Search Input */}
      <form onSubmit={handleSearch} className="relative w-96">
        <Search className="w-4 h-4 text-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Quick search knowledge base... (Press Enter)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg pl-9 pr-4 py-1.5 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </form>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {rebuildStatus && (
          <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {rebuildStatus}
          </span>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} theme`}
          className="p-2 rounded-lg bg-surfaceSubtle border border-surfaceBorder text-textMuted hover:text-textMain hover:border-textMuted transition-all flex items-center justify-center"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Rebuild Index Button */}
        <button
          onClick={handleRebuild}
          disabled={isRebuilding}
          title="Rebuild SQLite derived index from Markdown"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-surfaceSubtle border border-surfaceBorder text-textMain hover:border-primary transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin text-primary" : "text-textMuted"}`} />
          <span>{isRebuilding ? "Rebuilding..." : "Rebuild Index"}</span>
        </button>
      </div>
    </header>
  );
}
