"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Globe, Tag } from "lucide-react";
import { searchKnowledge, SearchResult } from "@/lib/api";

const KNOWLEDGE_TYPES = [
  "concept",
  "technology",
  "pattern",
  "architecture",
  "test",
  "bug",
  "debug_playbook",
  "decision",
  "analysis",
  "source",
];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQ);
  const [selectedType, setSelectedType] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const executeSearch = useCallback(async (q: string, type: string) => {
    setLoading(true);
    try {
      const res = await searchKnowledge(q, type || undefined);
      setResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    executeSearch(query, selectedType);
  }, [query, selectedType, executeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, selectedType);
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search concepts, bugs, test playbooks (e.g. 'jwt expiry', 'fastapi', 'refresh token')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-surface border border-surfaceBorder rounded-xl pl-11 pr-24 py-3 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Search
          </button>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs text-textMuted font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Type:
          </span>
          <button
            type="button"
            onClick={() => setSelectedType("")}
            className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-all ${
              selectedType === ""
                ? "bg-primary text-white border-primary font-bold shadow-xs"
                : "bg-surface text-textMuted border-surfaceBorder hover:text-textMain hover:bg-surfaceSubtle"
            }`}
          >
            All
          </button>
          {KNOWLEDGE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(selectedType === t ? "" : t)}
              className={`text-xs px-2.5 py-1 rounded-md border font-mono capitalize transition-all ${
                selectedType === t
                  ? "bg-primary text-white border-primary font-bold shadow-xs"
                  : "bg-surface text-textMuted border-surfaceBorder hover:text-textMain hover:bg-surfaceSubtle"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </form>

      {/* Search Results List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-textMuted">
          <span>Found {results.length} results</span>
          {loading && <span className="text-primary font-medium">Searching...</span>}
        </div>

        {results.length > 0 ? (
          results.map((item) => (
            <Link
              key={item.id}
              href={`/knowledge/${item.id}`}
              className="block p-4 rounded-xl bg-surface border border-surfaceBorder hover:border-primary/50 transition-all group shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold border badge-${item.type}`}>
                    {item.type}
                  </span>
                  <h3 className="text-base font-bold text-textMain group-hover:text-primary transition-colors font-heading">
                    {item.title}
                  </h3>
                  <span className="text-xs font-mono text-textMuted">
                    ({item.id})
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0 font-medium">
                  BM25: {item.score}
                </span>
              </div>

              <p className="text-xs text-textMuted line-clamp-2 leading-relaxed mb-3">
                {item.summary || "No summary provided."}
              </p>

              <div className="flex items-center gap-4 text-xs text-textMuted flex-wrap">
                {item.domains.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 opacity-60" />
                    <span>{item.domains.join(", ")}</span>
                  </div>
                )}
                {item.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 opacity-60" />
                    <span>{item.tags.join(", ")}</span>
                  </div>
                )}
              </div>
            </Link>
          ))
        ) : (
          !loading && (
            <div className="p-12 text-center border border-dashed border-surfaceBorder rounded-2xl bg-surface">
              <Search className="w-8 h-8 text-textMuted mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-textMuted">No matching knowledge objects found</p>
              <p className="text-xs text-textMuted mt-1">Try searching for &quot;fastapi&quot;, &quot;jwt&quot;, or &quot;refresh token&quot;.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1 font-heading">
          Universal Knowledge Search
        </h1>
        <p className="text-xs text-textMuted">
          Instant SQLite FTS5 search with BM25 ranking across titles, aliases, summaries, tags, domains, and markdown bodies.
        </p>
      </div>

      <Suspense fallback={<div className="text-xs text-textMuted py-12 text-center">Loading search interface...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
