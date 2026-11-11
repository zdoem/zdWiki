"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Tag, Globe, ArrowRight } from "lucide-react";
import { fetchKnowledgeList, KnowledgeItem } from "@/lib/api";

function KnowledgeCatalogContent() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type") || "";
  const domainFilter = searchParams.get("domain") || "";

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchKnowledgeList({ type: typeFilter, domain: domainFilter })
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [typeFilter, domainFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain capitalize font-heading">
            {typeFilter ? `${typeFilter.replace("_", " ")} Catalog` : "Knowledge Catalog"}
          </h1>
          <p className="text-xs text-textMuted mt-1">
            {domainFilter ? `Filtered by domain: ${domainFilter}` : "Canonical knowledge objects indexed from Markdown frontmatter."}
          </p>
        </div>
      </div>

      {/* Grid of Knowledge Objects */}
      {loading ? (
        <div className="text-xs text-textMuted py-12 text-center">Loading knowledge catalog...</div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/knowledge/${item.id}`}
              className="p-4 rounded-xl bg-surface border border-surfaceBorder hover:border-primary/50 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold border badge-${item.type}`}>
                    {item.type}
                  </span>
                  <span className="text-[11px] font-mono text-textMuted truncate">
                    {item.id}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-textMain group-hover:text-primary transition-colors mb-2 font-heading">
                  {item.title}
                </h3>

                <p className="text-xs text-textMuted line-clamp-3 leading-relaxed mb-4">
                  {item.summary || "No summary provided."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surfaceBorder text-xs text-textMuted">
                <div className="flex items-center gap-1 truncate mr-2">
                  {item.domains.length > 0 && <span>{item.domains.join(", ")}</span>}
                </div>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-primary shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-surfaceBorder rounded-2xl bg-surface">
          <BookOpen className="w-8 h-8 text-textMuted mx-auto mb-3" />
          <p className="text-sm font-medium text-textMuted">No objects found</p>
          <p className="text-xs text-textMuted mt-1">No knowledge objects match the current filter.</p>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeCatalogPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Suspense fallback={<div className="text-xs text-textMuted py-12 text-center">Loading catalog...</div>}>
        <KnowledgeCatalogContent />
      </Suspense>
    </div>
  );
}
